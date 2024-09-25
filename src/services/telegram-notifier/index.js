const config = require('config');
const axios = require('axios').default;
const { createLogger } = require('../../components/logger');

const logger = createLogger(module);

class TelegramNotifier {
    constructor() {
        this.telegramBotId = config.get('telegram.botId');
        this.telegramChatId = config.get('telegram.chatId');
        this.telegramAccount = config.get('bet365.account');
    }

    /**
     * @param {string} message
     */
    async _sendTelegramMessage(message) {
        try {
            await axios({
                method: 'get',
                url: `https://api.telegram.org/bot${this.telegramBotId}/sendMessage?chat_id=${this.telegramChatId}&text=${message}`,
            });
        } catch (error) {
            logger.error(`TELEGRAM_NOTIFIER_ERROR:: Failed to send message: ${error.message}`);
        }
    }

    async sendAppLaunchedMessage() {
        await this._sendTelegramMessage(`Account ${this.telegramAccount}\nApp launched`);
    }

    async sendLoggedOutMessage() {
        await this._sendTelegramMessage(`Account ${this.telegramAccount}\nLogged out`);
    }

    /**
     * @param {BetData} bet
     */
    async sendNewBetMessage(bet) {
        await this._sendTelegramMessage(`Account ${this.telegramAccount}\nNew bet: ${JSON.stringify(bet)}`);
    }
}

module.exports = {
    TelegramNotifier,
};
