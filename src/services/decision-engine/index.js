/// <reference path="../../types.js" />

const _ = require('lodash');
const moment = require('moment');
const config = require('config');
const { createLogger } = require('../../components/logger');
const { BET_365_STATE } = require('../../constants');
const { CustomBet365HelperError } = require('../bet365-page-wrapper/errors');
const { InactivityErrorHandler } = require('../error-handlers/inactivity-error-handler');
const { CustomBet365ErrorHandler } = require('../error-handlers/custom-error-handler');
const { UnknownErrorHandler } = require('../error-handlers/unknown-error-handler');

const logger = createLogger(module);

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
         * @type {CustomBet365HelperError|null}
         */
        this.customError = null;

        this.inactivityErrorHandler = new InactivityErrorHandler(telegramNotifier, proxyManager);
        this.customBet365ErrorHandler = new CustomBet365ErrorHandler(telegramNotifier, proxyManager);
        this.unknownErrorHandler = new UnknownErrorHandler(telegramNotifier);

        this.sendNextLongCycleNotificationAfter = null;
    }

    init() {
        this.inactivityErrorHandler.reenableInactivityTimeout();
    }

    /**
     * @param {string} oldState
     * @param {string} newState
     */
    handleStateChange(oldState, newState) {
        logger.info(`State changed from ${oldState} to ${newState}`);

        if (newState === BET_365_STATE.LOGGED_OUT) {
            this.inactivityErrorHandler.clearInactivityTimeout();
            this.customBet365ErrorHandler.resolveIncident();
            this.unknownErrorHandler.resolveIncident();

            this.telegramNotifier.sendLoggedOutMessage();
        } else if (newState === BET_365_STATE.LOGGED_IN) {
            this.telegramNotifier.sendLoggedInMessage();
        }
    }

    /**
     * @param {BetData[]} openBets
     * @param {BetData[]} settledCashedOutBets
     * @param {DurationMeasureToolReport} report
     * */
    handleBets(openBets, settledCashedOutBets, report) {
        this.inactivityErrorHandler.reenableInactivityTimeout();
        this.customBet365ErrorHandler.resolveIncident();
        this.unknownErrorHandler.resolveIncident();

        this.handleOpenBets(openBets);
        this.handleSettledCashOutBets(settledCashedOutBets);
        this.handleReport(report);
    }

    /**
     * @param {DurationMeasureToolReport} report
     * */
    handleReport(report) {
        const totalDuration = report.totalDuration;

        if (totalDuration > config.get('maxCycleDuration')) {
            logger.warn(`Cycle duration exceeded the limit. Current duration: ${totalDuration}, limit: ${config.get('maxCycleDuration')}`);

            if (this.sendNextLongCycleNotificationAfter && !moment().isAfter(this.sendNextLongCycleNotificationAfter)) {
                logger.info('Long cycle notification already sent, skipping');

                return;
            }

            this.telegramNotifier.sendCycleDurationExceededMessage(JSON.stringify(report, null, 2));

            this.sendNextLongCycleNotificationAfter = moment().add(10, 'minutes');
        }
    }

    /**
     * @param {BetData[]} openBets
     */
    handleOpenBets(openBets) {
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
        if (error instanceof CustomBet365HelperError) {
            this.customBet365ErrorHandler.handleError(error);
        } else {
            this.unknownErrorHandler.handleError(error);
        }
    }
}

module.exports = {
    DecisionEngine,
};
