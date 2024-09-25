/// <reference path="../../types.js" />

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
        logger.info(`Fetched ${bets.length} open bets: ${JSON.stringify(bets)}`);

        /** @type {BetData[]} */
        const currentBets = this.storage.get('openBets') || [];

        // eslint-disable-next-line no-restricted-syntax
        for (const bet of bets) {
            const betWasSeen = currentBets.some((currentBet) => currentBet.key === bet.key);

            if (!betWasSeen) {
                this.telegramNotifier.sendNewBetMessage(bet);
            }
        }

        this.storage.set('openBets', bets);
    }
}

module.exports = {
    DecisionEngine,
};
