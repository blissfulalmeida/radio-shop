/// <reference path="../../types.js" />

const _ = require('lodash');
const moment = require('moment');
const { createLogger } = require('../../components/logger');
const { BET_365_STATE } = require('../../constants');

const logger = createLogger(module);

class DecisionEngine {
    /**
     * @param {import('../storage').SimpleFileBasedStorage} storage
     * @param {import('../telegram-notifier').TelegramNotifier} telegramNotifier
     */
    constructor(storage, telegramNotifier) {
        this.storage = storage;
        this.telegramNotifier = telegramNotifier;

        this.oldState = null;
        this.newState = null;
    }

    /**
     * @param {string} oldState
     * @param {string} newState
     */
    handleStateChange(oldState, newState) {
        logger.info(`State changed from ${oldState} to ${newState}`);

        if (newState === BET_365_STATE.LOGGED_OUT) {
            this.telegramNotifier.sendLoggedOutMessage();
        }
    }

    /**
     * @param {BetData[]} bets
     */
    handleFetchedOpenBets(bets) {
        logger.info(`Received ${bets.length} open bets: ${JSON.stringify(bets)}`);

        /** @type {BetData[]} */
        const currentBets = _.cloneDeep(this.storage.get('openBets') || []);
        const betsMap = currentBets.reduce((acc, bet) => acc.set(bet.key, bet), new Map());

        // eslint-disable-next-line no-restricted-syntax
        for (const bet of _.cloneDeep(bets)) {
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
}

module.exports = {
    DecisionEngine,
};
