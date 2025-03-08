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
const { formatReport } = require('../../components/duration-measure-tool');

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
     * @param {import('../event-bus').EventBus} eventBus
     * @param {import('../google-sheets').GoogleSheetsService} googleSheetsService
     */
    constructor(storage, telegramNotifier, proxyManager, eventBus, googleSheetsService) {
        this.storage = storage;
        this.telegramNotifier = telegramNotifier;
        this.proxyManager = proxyManager;
        this.eventBus = eventBus;
        this.googleSheetsService = googleSheetsService;

        /**
         * @type {string|null}
         */
        this.oldState = null;

        /**
         * @type {string|null}
         */
        this.newState = null;

        this.inactivityErrorHandler = new InactivityErrorHandler(telegramNotifier);
        this.customBet365ErrorHandler = new CustomBet365ErrorHandler(telegramNotifier, proxyManager, eventBus);
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
            this.customBet365ErrorHandler.resolveIncident(BET_365_STATE.LOGGED_OUT);
            this.unknownErrorHandler.resolveIncident(BET_365_STATE.LOGGED_OUT);

            this.telegramNotifier.sendLoggedOutMessage();
        } else if (newState === BET_365_STATE.LOGGED_IN) {
            this.telegramNotifier.sendLoggedInMessage();
        }
    }

    /**
     * @param {BetData[]} openBets
     * @param {BetData[]} settledBets
     * @param {BetData[]} settledCashOutBets
     * @param {DurationMeasureToolReport} report
     * */
    handleBets({ openBets, settledBets, settledCashOutBets, report }) {
        // If the data arrives, all error handlers should be resolved
        this.inactivityErrorHandler.reenableInactivityTimeout();
        this.customBet365ErrorHandler.resolveIncident();
        this.unknownErrorHandler.resolveIncident();

        this.handleOpenBets(openBets);
        this.handleSettledBets(settledBets);
        this.handleSettledCashOutBets(settledCashOutBets);
        this.handleReport(report);
    }

    /**
     * @param {DurationMeasureToolReport} report
     * */
    handleReport(report) {
        const totalDuration = report.totalDuration;

        if (totalDuration > config.get('maxCycleDuration')) {
            logger.info(`Cycle duration exceeded the limit. Current duration: ${totalDuration}, limit: ${config.get('maxCycleDuration')}`);

            if (this.sendNextLongCycleNotificationAfter && !moment().isAfter(this.sendNextLongCycleNotificationAfter)) {
                logger.info('Long cycle notification already sent, skipping');

                return;
            }

            this.telegramNotifier.sendCycleDurationExceededMessage(formatReport(report));

            this.sendNextLongCycleNotificationAfter = moment().add(config.get('cycleDurationExceededNotificationIntervalSeconds'), 'seconds');
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
     * @param {BetData[]} openBets
     */
    handleSettledBets(settledBets) {
        /** @type {BetData[]} */
        const currentBets = _.cloneDeep(this.storage.get('settledBets') || []);

        currentBets.forEach((bet) => { bet.metadata = bet.metadata || {}; });

        const betsMap = currentBets.reduce((acc, bet) => acc.set(bet.key, bet), new Map());

        const betsToSave = [];

        // eslint-disable-next-line no-restricted-syntax
        for (const bet of _.cloneDeep(settledBets)) {
            const betExistsInStorage = betsMap.has(bet.key);

            if (!betExistsInStorage) {
                bet.metadata = {
                    firstSeenAt: moment.utc().toISOString(),
                    lastSeenAt: moment.utc().toISOString(),
                };

                betsMap.set(bet.key, bet);
                betsToSave.push(bet);
            } else {
                const existingBet = betsMap.get(bet.key);

                existingBet.metadata = existingBet.metadata || {};
                existingBet.metadata.lastSeenAt = moment.utc().toISOString();

                if (!existingBet.metadata.firstSeenAt) {
                    existingBet.metadata.firstSeenAt = moment.utc().toISOString();
                }
            }
        }

        // Saving bets in batches to prevent rate limiting and concurrent writes (in multiple invocations at the same time data can be lost)
        if (betsToSave.length > 0) {
            this.googleSheetsService.saveBets(betsToSave);
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

        this.storage.set('settledBets', updatedSortedBets);
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
