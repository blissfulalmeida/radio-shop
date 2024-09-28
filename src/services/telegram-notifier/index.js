const config = require('config');
const axios = require('axios').default;
const { createLogger } = require('../../components/logger');

const logger = createLogger(module);

class TelegramNotifier {
    constructor() {
        this.telegramBotId = config.get('telegram.botId');
        this.telegramChatId = config.get('telegram.chatId');
        this.telegramErrorChatId = config.get('telegram.errorChatId');
        this.bet365Account = config.get('bet365.account');
        this.callWebHookUrl = config.get('call.webHookUrl');
        this.callShouldBeInitiated = config.get('call.shouldBeInitiated');
    }

    /**
     * @param {string} message
     */
    async _sendMainChannelTelegramMessage(message, makeCall = false) {
        axios({
            method: 'get',
            url: `https://api.telegram.org/bot${this.telegramBotId}/sendMessage?chat_id=${this.telegramChatId}&text=${encodeURIComponent(message)}`,
        })
            .then(() => { logger.info('TELEGRAM_NOTIFIER: Message sent'); })
            .catch((error) => { logger.error(`NOTIFIER_ERROR:: Failed to send message: ${error.message}`); });

        if (this.callShouldBeInitiated && makeCall) {
            axios({
                method: 'post',
                url: this.callWebHookUrl,
            })
                .then(() => { logger.info('TELEGRAM_NOTIFIER: Call made'); })
                .catch((error) => { logger.error(`TELEGRAM_NOTIFIER:: Failed to make call: ${error.message}`); });
        }
    }

    /**
     * @param {string} message
     */
    async _sendErrorChannelTelegramMessage(message) {
        axios({
            method: 'get',
            url: `https://api.telegram.org/bot${this.telegramBotId}/sendMessage?chat_id=${this.telegramErrorChatId}&text=${encodeURIComponent(message)}`,
        })
            .then(() => { logger.info('TELEGRAM_NOTIFIER: Error message sent'); })
            .catch((error) => { logger.error(`TELEGRAM_NOTIFIER:: Failed to send error message: ${error.message}`); });
    }

    async sendAppLaunchedMessage() {
        logger.info('TELEGRAM_NOTIFIER: Sending app launched message');

        this._sendMainChannelTelegramMessage(`#${this.bet365Account}\nApp launched`);
    }

    async sendLoggedOutMessage() {
        logger.info('TELEGRAM_NOTIFIER: Sending logged out message');

        this._sendMainChannelTelegramMessage(`#${this.bet365Account}\nLogged out`, true);
    }

    /**
     * @param {BetData} bet
     */
    async sendNewBetMessage(bet) {
        const formattedbetMessage = `Team 1: ${bet.team1Name || '-'}\nTeam 2: ${bet.team2Name || '-'}\nMarket: ${bet.market || '-'}\nSide: ${bet.side || '-'}\nStake: ${bet.stake || '-'}\nOdd: ${bet.odd || '-'}`;

        logger.info(`TELEGRAM_NOTIFIER: Sending new bet message: ${formattedbetMessage}`);

        await this._sendMainChannelTelegramMessage(`#${this.bet365Account}\nNew bet:\n${formattedbetMessage}`, true);
    }

    /**
     * @param {string} message
     */
    async sendErrorNotification(message) {
        logger.info(`TELEGRAM_NOTIFIER: Sending error notification: ${message}`);

        this._sendErrorChannelTelegramMessage(`#${this.bet365Account}\nError: ${message}`);
    }

    /**
     * @param {string} message
     */
    async sendCustomErrorNotification(message) {
        logger.info(`TELEGRAM_NOTIFIER: Sending custom error notification: ${message}`);

        this._sendErrorChannelTelegramMessage(`#${this.bet365Account}\nCustom error: ${message}`);
    }
}

module.exports = {
    TelegramNotifier,
};
