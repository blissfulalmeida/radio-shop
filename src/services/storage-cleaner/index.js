const config = require('config');
const moment = require('moment');
const { createLogger } = require('../../components/logger');

const logger = createLogger(module);

class StorageCleaner {
    /**
     * @param { import('../storage').SimpleFileBasedStorage } storage
     */
    constructor(storage, deleteAfterSeconds) {
        this.storage = storage;
        this.deleteAfterSeconds = deleteAfterSeconds;

        this.cleaningInterval = null;
    }

    init() {
        const cycleInterval = config.get('storage.openBets.cleaningInterval');

        this.cleaningInterval = setInterval(() => {
            this.clean();
        }, cycleInterval);

        logger.info('Starting storage cleaner. Cycle interval:', cycleInterval);

        this.clean();
    }

    clean() {
        /** @type {BetData[]} */
        const openBets = this.storage.get('openBets');

        const activeBets = [];

        openBets.forEach((bet) => {
            if (!bet.metadata || !bet.metadata.lastSeenAt) {
                return;
            }

            const isExpired = moment().diff(moment(bet.metadata.lastSeenAt), 'seconds') > this.deleteAfterSeconds;

            if (isExpired) {
                logger.info(`Bet expired, removing from storage: ${JSON.stringify(bet)}`);
            } else {
                activeBets.push(bet);
            }
        });

        this.storage.set('openBets', activeBets);

        /** @type {BetData[]} */
        const settledCashedOutBets = this.storage.get('settledCashedOutBets');

        const activeSettledCashedOutBets = [];

        settledCashedOutBets.forEach((bet) => {
            if (!bet.metadata || !bet.metadata.lastSeenAt) {
                return;
            }

            const isExpired = moment().diff(moment(bet.metadata.lastSeenAt), 'seconds') > this.deleteAfterSeconds;

            if (isExpired) {
                logger.info(`Bet expired, removing from storage: ${JSON.stringify(bet)}`);
            } else {
                activeSettledCashedOutBets.push(bet);
            }
        });

        this.storage.set('settledCashedOutBets', activeSettledCashedOutBets);
    }
}

module.exports = {
    StorageCleaner,
};
