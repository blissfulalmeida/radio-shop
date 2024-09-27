const config = require('config');
const axios = require('axios').default;
const { createLogger } = require('../../components/logger');

const logger = createLogger(module);

class TelegramNotifier {
    constructor() {
        this.telegramBotId = config.get('telegram.botId');
        this.telegramChatId = config.get('telegram.chatId');
        this.bet365Account = config.get('bet365.account');
    }

    /**
     * @param {string} message
     */
    async _sendTelegramMessage(message) {
        try {
            await axios({
                method: 'get',
                url: `https://api.telegram.org/bot${this.telegramBotId}/sendMessage?chat_id=${this.telegramChatId}&text=${encodeURIComponent(message)}`,
            });
        } catch (error) {
            logger.error(`TELEGRAM_NOTIFIER_ERROR:: Failed to send message: ${error.message}`);
        }
    }

    async sendAppLaunchedMessage() {
        logger.info('TELEGRAM: Sending app launched message');

        await this._sendTelegramMessage(`#${this.bet365Account}\nApp launched`);
    }

    async sendLoggedOutMessage() {
        logger.info('TELEGRAM: Sending logged out message');

        await this._sendTelegramMessage(`#${this.bet365Account}\nLogged out`);
    }

    /**
     * @param {BetData} bet
     */
    async sendNewBetMessage(bet) {
        const formattedbetMessage = `Team 1: ${bet.team1Name || '-'}\nTeam 2: ${bet.team2Name || '-'}\nMarket: ${bet.market || '-'}\nSide: ${bet.side || '-'}\nStake: ${bet.stake || '-'}\nOdd: ${bet.odd || '-'}`;

        logger.info(`TELEGRAM: Sending new bet message: ${formattedbetMessage}`);

        await this._sendTelegramMessage(`#${this.bet365Account}\nNew bet:\n${formattedbetMessage}`);
    }
}

module.exports = {
    TelegramNotifier,
};
