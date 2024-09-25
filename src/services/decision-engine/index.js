const { createLogger } = require('../../components/logger');

const logger = createLogger(module);

class DecisionEngine {
    constructor() {
        this.oldState = null;
        this.newState = null;
    }

    /**
     * @param {string} oldState
     * @param {string} newState
     */
    handleStateChange(oldState, newState) {
        logger.info(`State changed from ${oldState} to ${newState}`);
    }

    /**
     * @param {BetData[]} bets
     */
    handleFetchedOpenBets(bets) {
        logger.info(`Fetched ${bets.length} open bets: ${JSON.stringify(bets)}`);
    }
}

module.exports = {
    DecisionEngine,
};
