const config = require('config');
const { Client } = require('pg');
const { createLogger } = require('../../components/logger');

const logger = createLogger(module);

class DBService {
    constructor() {
        this.account = config.get('bet365.account');

        this.db = new Client({
            connectionString: config.get('db.connectionString'),
        });
    }

    async init() {
        await this.db.connect();
    }

    async disconnect() {
        await this.db.end();
    }

    /**
     * @param {BetData} betData
     */
    async saveSettledBet(betData) {
        try {
            logger.info(`Saving bet ${betData.key} to DB`);

            await this.db.query('INSERT INTO bets (account, key, team_1, team_2, market, side, stake, odd, return) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)', [this.account, betData.key, betData.team1Name, betData.team2Name, betData.market, betData.side, betData.stake, betData.odd, betData.return]);

            logger.info(`Bet ${betData.key} saved to DB`);
        } catch (error) {
            logger.error(`SERVICE_ERROR: Error saving bet ${betData.key} to DB: ${error}`);
        }
    }
}

module.exports = {
    DBService,
};
