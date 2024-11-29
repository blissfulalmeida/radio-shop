const config = require('config');
const axios = require('axios').default;
const FormData = require('form-data');
const { createLogger } = require('../../components/logger');
const { formatReport } = require('../../components/duration-measure-tool');

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
     * @param {boolean} makeCall
     */
    async _sendMainChannelTelegramMessage(message, makeCall = false) {
        logger.info(`TELEGRAM_NOTIFIER: Sending main channel message:\n${message}`);

        axios({
            method: 'get',
            url: `https://api.telegram.org/bot${this.telegramBotId}/sendMessage?chat_id=${this.telegramChatId}&text=${encodeURIComponent(message)}`,
        })
            .catch((error) => { logger.error(`NOTIFIER_ERROR:: Failed to send main channel message - ${message}. Error - ${error.message}`); });

        if (this.callShouldBeInitiated && makeCall) {
            axios({
                method: 'post',
                url: this.callWebHookUrl,
            })
                .then(() => { logger.info('TELEGRAM_NOTIFIER: Call made'); })
                .catch((error) => { logger.error(`TELEGRAM_NOTIFIER:: Failed to make call: ${error.message}`); });

            axios({
                method: 'post',
                url: 'https://api.pushover.net/1/messages.json',
                data: {
                    token: config.get('pushover.token'),
                    user: config.get('pushover.user'),
                    message,
                    sound: 'Bigfoot',
                    priority: 2,
                    retry: 30,
                    expire: 360,
                },
                headers: {
                    'Content-Type': 'application/json',
                },
            })
                .then(() => { logger.info('TELEGRAM_NOTIFIER: Pushover alert sent'); })
                .catch((error) => { logger.error(`TELEGRAM_NOTIFIER:: Failed to send pushover alert: ${error.message}`); });
        }
    }

    /**
     * @param {string} message
     */
    async _sendErrorChannelTelegramMessage(message, imageBuffer) {
        logger.info(`TELEGRAM_NOTIFIER: Sending error channel message:\n${message}`);

        if (imageBuffer) {
            const form = new FormData();

            form.append('chat_id', this.telegramErrorChatId);
            form.append('caption', message);
            form.append('photo', imageBuffer, { filename: 'error' });

            axios.post(
                `https://api.telegram.org/bot${this.telegramBotId}/sendPhoto`,
                form,
                { headers: form.getHeaders() },
            )
                .catch((error) => { logger.error(`TELEGRAM_NOTIFIER:: Failed to send error message - ${message}. Error - ${error.message}`); });
        } else {
            axios({
                method: 'get',
                url: `https://api.telegram.org/bot${this.telegramBotId}/sendMessage?chat_id=${this.telegramErrorChatId}&text=${encodeURIComponent(message)}`,
            })
                .then(() => { logger.info('TELEGRAM_NOTIFIER: Error message sent'); })
                .catch((error) => { logger.error(`TELEGRAM_NOTIFIER:: Failed to send error message - ${message}. Error - ${error.message}`); });
        }
    }

    async sendAppLaunchedMessage() {
        this._sendMainChannelTelegramMessage(`#${this.bet365Account}\nApp launched`);
    }

    async sendLoggedOutMessage() {
        this._sendMainChannelTelegramMessage(`#${this.bet365Account}\nLogged out`, true);
    }

    async sendLoggedInMessage() {
        this._sendMainChannelTelegramMessage(`#${this.bet365Account}\nLogged in`);
    }

    async sendMainChannelMessage(message, makeCall = false) {
        this._sendMainChannelTelegramMessage(`#${this.bet365Account}\n${message}`, makeCall);
    }

    /**
     * @param {BetData} bet
     */
    async sendNewBetMessage(bet) {
        const formattedBetMessage = `Team 1: ${bet.team1Name || '-'}\nTeam 2: ${bet.team2Name || '-'}\nMarket: ${bet.market || '-'}\nSide: ${bet.side || '-'}\nStake: ${bet.stake || '-'}\nOdd: ${bet.odd || '-'}`;

        await this._sendMainChannelTelegramMessage(`#${this.bet365Account}\nNew bet:\n${formattedBetMessage}`, true);
    }

    /**
     * @param {BetData} bet
     */
    async sendsCashedOutBetMessage(bet) {
        const formattedBetMessage = `Team 1: ${bet.team1Name || '-'}\nTeam 2: ${bet.team2Name || '-'}\nMarket: ${bet.market || '-'}\nSide: ${bet.side || '-'}\nStake: ${bet.stake || '-'}\nOdd: ${bet.odd || '-'}`;

        await this._sendMainChannelTelegramMessage(`#${this.bet365Account}\nCashed out:\n${formattedBetMessage}`, true);
    }

    /**
     * @param {string} incidentId
     * @param {string} message
     */
    async sendUnknownErrorMessage(incidentId, message) {
        this._sendErrorChannelTelegramMessage(`#${this.bet365Account}\n🚨Unknown error\n#${incidentId}\n${message}`);
    }

    /**
     * @param {string} incidentId
     * @param {string} reason
     */
    async sendResolveUnknownErrorMessage(incidentId, reason = null) {
        this._sendErrorChannelTelegramMessage(`#${this.bet365Account}\n✅️Unknown error resolved\n${reason ? `REASON: ${reason}\n` : ''}#${incidentId}`);
    }

    /**
     * @param {import('../bet365-page-wrapper/errors').CustomBet365HelperError} error
     */
    async sendCustomErrorMessage(incidentId, error) {
        this._sendErrorChannelTelegramMessage(`#${this.bet365Account}\n🚨Custom error\n#${incidentId}\n${error.code}\n${formatReport(error.report)}`, error.screenshot);
    }

    /**
     * @param {string} incidentId
     * @param {string} reason
     */
    async sendResolveCustomErrorMessage(incidentId, reason = null) {
        this._sendErrorChannelTelegramMessage(`#${this.bet365Account}\n✅️Custom error resolved\n${reason ? `REASON: ${reason}\n` : ''}#${incidentId}`);
    }

    async sendInactivityMessage(seconds) {
        this._sendErrorChannelTelegramMessage(`#${this.bet365Account}\nInactive for ${seconds} seconds`);
    }

    async sendCycleDurationExceededMessage(message) {
        this._sendErrorChannelTelegramMessage(`#${this.bet365Account}\nCycle duration exceeded:\n${message}`);
    }

    async sendErrorRepairerExceededMessage(message) {
        this._sendErrorChannelTelegramMessage(`#${this.bet365Account}\n${message}`);
    }
}

module.exports = {
    TelegramNotifier,
};
