/// <reference path="../../types.js" />

const _ = require('lodash');
const moment = require('moment');
const { createLogger } = require('../../components/logger');
const { BET_365_STATE } = require('../../constants');
const { CustomBet365HeplerError } = require('../bet365-page-wrapper/errors');
const { minutes } = require('../../components/util');

const logger = createLogger(module);

const SEND_INACTIVITY_NOTIFICATION_AFTER_MINUTES = 2;
const SEND_CUSTOM_ERROR_NOTIFICATION_AFTER_MINUTES = 2;

/**
 * TODO:
 * Seems like the open and settled bets are indeed very similar - it is worht considering refactoring them into a single model
 */

class DecisionEngine {
    /**
     * @param {import('../storage').SimpleFileBasedStorage} storage
     * @param {import('../telegram-notifier').TelegramNotifier} telegramNotifier
     * @param {import('../proxy-manager').ProxyManager} proxyManager
     */
    constructor(storage, telegramNotifier, proxyManager) {
        this.storage = storage;
        this.telegramNotifier = telegramNotifier;
        this.proxyManager = proxyManager;

        /**
         * @type {string|null}
         */
        this.oldState = null;

        /**
         * @type {string|null}
         */
        this.newState = null;

        /**
         * @type {NodeJS.Timeout|null}
         * This property is used to schedule custom error notifications
         * Whenever a custom error occurs, we schedule a notification to be sent in 2 minutes
         * If another error occurs before the 2 minutes have passed, we ignore that error and wait for the scheduled notification
         * If successful operation occurs, we cancel the scheduled notification
         */
        this.customErrorNotificationTimeout = null;

        /**
         * @type {CustomBet365HeplerError|null}
         */
        this.customError = null;

        /**
         * @type {NodeJS.Timeout|null}
         * This property is used to schedule inactivity notifications
         */
        this.inactivityTimeout = null;
    }

    init() {
        this.reenableInactivityTimeout();
    }

    reenableInactivityTimeout() {
        if (this.inactivityTimeout) {
            clearTimeout(this.inactivityTimeout);
            this.inactivityTimeout = null;
        }

        this.inactivityTimeout = setTimeout(() => {
            this.fireInactivityNotification();
            this.reenableInactivityTimeout();
        }, minutes(SEND_INACTIVITY_NOTIFICATION_AFTER_MINUTES));
    }

    /**
     * @param {string} oldState
     * @param {string} newState
     */
    handleStateChange(oldState, newState) {
        logger.info(`State changed from ${oldState} to ${newState}`);

        if (newState === BET_365_STATE.LOGGED_OUT) {
            this.telegramNotifier.sendLoggedOutMessage();
        } else if (newState === BET_365_STATE.LOGGED_IN) {
            this.telegramNotifier.sendLoggedInMessage();
        }
    }

    /**
     * @param {BetData[]} openBets
     */
    handleOpenBets(openBets) {
        this.cancelScheduledCustomErrorNotification();
        this.reenableInactivityTimeout();

        logger.info(`Received ${openBets.length} open bets: ${JSON.stringify(openBets)}`);

        /** @type {BetData[]} */
        const currentBets = _.cloneDeep(this.storage.get('openBets') || []);

        currentBets.forEach((bet) => { bet.metadata = bet.metadata || {}; });

        const betsMap = currentBets.reduce((acc, bet) => acc.set(bet.key, bet), new Map());

        // eslint-disable-next-line no-restricted-syntax
        for (const bet of _.cloneDeep(openBets)) {
            const betExistsInStorage = betsMap.has(bet.key);

            if (!betExistsInStorage) {
                bet.metadata = {
                    firstSeenAt: moment.utc().toISOString(),
                    lastSeenAt: moment.utc().toISOString(),
                };

                betsMap.set(bet.key, bet);

                this.telegramNotifier.sendNewBetMessage(bet);
            } else {
                const existingBet = betsMap.get(bet.key);

                existingBet.metadata = existingBet.metadata || {};
                existingBet.metadata.lastSeenAt = moment.utc().toISOString();

                if (!existingBet.metadata.firstSeenAt) {
                    existingBet.metadata.firstSeenAt = moment.utc().toISOString();
                }
            }
        }

        const updatedSortedBets = Array.from(betsMap.values()).sort((a, b) => {
            const aTime = moment(a.metadata.lastSeenAt);
            const bTime = moment(b.metadata.lastSeenAt);

            if (aTime.isBefore(bTime)) {
                return -1;
            }

            if (aTime.isAfter(bTime)) {
                return 1;
            }

            return 0;
        });

        this.storage.set('openBets', updatedSortedBets);
    }

    /**
     * @param {BetData[]} settledCachedOutBets
     */
    handleSettledCashOutBets(settledCachedOutBets) {
        this.cancelScheduledCustomErrorNotification();
        this.reenableInactivityTimeout();

        logger.info(`Received ${settledCachedOutBets.length} setteld cashed out bets: ${JSON.stringify(settledCachedOutBets)}`);

        /** @type {BetData[]} */
        const currentBets = _.cloneDeep(this.storage.get('settledCashedOutBets') || []);

        currentBets.forEach((bet) => { bet.metadata = bet.metadata || {}; });

        const betsMap = currentBets.reduce((acc, bet) => acc.set(bet.key, bet), new Map());

        // eslint-disable-next-line no-restricted-syntax
        for (const bet of _.cloneDeep(settledCachedOutBets)) {
            const betExistsInStorage = betsMap.has(bet.key);

            if (!betExistsInStorage) {
                bet.metadata = {
                    firstSeenAt: moment.utc().toISOString(),
                    lastSeenAt: moment.utc().toISOString(),
                };

                betsMap.set(bet.key, bet);

                this.telegramNotifier.sendsCashedOutBetMessage(bet);
            } else {
                const existingBet = betsMap.get(bet.key);

                existingBet.metadata.lastSeenAt = moment.utc().toISOString();

                if (!existingBet.metadata.firstSeenAt) {
                    existingBet.metadata.firstSeenAt = moment.utc().toISOString();
                }
            }
        }

        const updatedSortedBets = Array.from(betsMap.values()).sort((a, b) => {
            const aTime = moment(a.metadata.lastSeenAt);
            const bTime = moment(b.metadata.lastSeenAt);

            if (aTime.isBefore(bTime)) {
                return -1;
            }

            if (aTime.isAfter(bTime)) {
                return 1;
            }

            return 0;
        });

        this.storage.set('settledCashedOutBets', updatedSortedBets);
    }

    /**
     * @param {Error} error
     */
    handleError(error) {
        if (error instanceof CustomBet365HeplerError) {
            logger.error(`CustomBet365HeplerError: ${error.code}, ${error.message}`);

            this.scheduleCustomErrorNotification(error);
        } else {
            this.telegramNotifier.sendUnknownErrorMessage(error.message);
        }
    }

    scheduleCustomErrorNotification(error) {
        if (this.customErrorNotificationTimeout) {
            logger.info('Custom error notification already scheduled, skipping');

            return;
        }

        logger.info(`Scheduling custom error notification. Will be sent in ${SEND_CUSTOM_ERROR_NOTIFICATION_AFTER_MINUTES} minutes if not cancelled`);

        this.customError = error;
        this.customErrorNotificationTimeout = setTimeout(() => {
            this.fireCustomErrorNotification();
        }, minutes(SEND_CUSTOM_ERROR_NOTIFICATION_AFTER_MINUTES));
    }

    cancelScheduledCustomErrorNotification() {
        if (this.customErrorNotificationTimeout) {
            clearTimeout(this.customErrorNotificationTimeout);
            this.customErrorNotificationTimeout = null;
            this.customError = null;
        }
    }

    fireCustomErrorNotification() {
        if (!this.customError || !this.customErrorNotificationTimeout) {
            return;
        }

        this.telegramNotifier.sendCustomErrorMessage(`Occured ${SEND_CUSTOM_ERROR_NOTIFICATION_AFTER_MINUTES} minutes ago and has not been resolved yet\n${this.customError.code}: ${this.customError.message}`);
        this.reloadProxy();

        clearTimeout(this.customErrorNotificationTimeout);
        this.customErrorNotificationTimeout = null;
        this.customError = null;
    }

    fireInactivityNotification() {
        this.telegramNotifier.sendInactivityMessage(SEND_INACTIVITY_NOTIFICATION_AFTER_MINUTES);
        this.reloadProxy();
    }

    async reloadProxy() {
        const proxyReloadResponse = await this.proxyManager.reloadProxy();

        let messsage;

        if (proxyReloadResponse.status === 'success') {
            messsage = `Proxy reloaded successfully: ${JSON.stringify(proxyReloadResponse.res)}`;
        } else {
            messsage = `Failed to reload proxy: ${proxyReloadResponse.error.message}`;
        }

        this.telegramNotifier.sendMainChannelMessage(messsage);
    }
}

module.exports = {
    DecisionEngine,
};
