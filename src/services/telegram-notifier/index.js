const config = require('config');
const axios = require('axios').default;
const FormData = require('form-data');
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
     * @param {boolean} makeCall
     */
    async _sendMainChannelTelegramMessage(message, makeCall = false) {
        axios({
            method: 'get',
            url: `https://api.telegram.org/bot${this.telegramBotId}/sendMessage?chat_id=${this.telegramChatId}&text=${encodeURIComponent(message)}`,
        })
            .then(() => { logger.info('TELEGRAM_NOTIFIER: Message sent'); })
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
    async sendErrorChannelTelegramMessage(message, imageBuffer) {
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
                .then(() => { logger.info('TELEGRAM_NOTIFIER: Error message sent'); })
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
        logger.info('TELEGRAM_NOTIFIER: Sending app launched message');

        this._sendMainChannelTelegramMessage(`#${this.bet365Account}\nApp launched`);
    }

    async sendLoggedOutMessage() {
        logger.info('TELEGRAM_NOTIFIER: Sending logged out message');

        this._sendMainChannelTelegramMessage(`#${this.bet365Account}\nLogged out`, true);
    }

    async sendLoggedInMessage() {
        logger.info('TELEGRAM_NOTIFIER: Sending logged in message');

        this._sendMainChannelTelegramMessage(`#${this.bet365Account}\nLogged in`);
    }

    async sendMainChannelMessage(message, makeCall = false) {
        logger.info(`TELEGRAM_NOTIFIER: Sending main channel message: ${message}`);

        this._sendMainChannelTelegramMessage(`#${this.bet365Account}\n${message}`, makeCall);
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
     * @param {BetData} bet
     */
    async sendsCashedOutBetMessage(bet) {
        const formattedbetMessage = `Team 1: ${bet.team1Name || '-'}\nTeam 2: ${bet.team2Name || '-'}\nMarket: ${bet.market || '-'}\nSide: ${bet.side || '-'}\nStake: ${bet.stake || '-'}\nOdd: ${bet.odd || '-'}`;

        logger.info(`TELEGRAM_NOTIFIER: Sending casged out bet message: ${formattedbetMessage}`);

        await this._sendMainChannelTelegramMessage(`#${this.bet365Account}\nCashed out:\n${formattedbetMessage}`, true);
    }

    /**
     * @param {string} incidentId
     * @param {string} message
     */
    async sendUnknownErrorMessage(incidentId, message) {
        logger.info(`TELEGRAM_NOTIFIER: Sending unknown error notification: ${message}`);

        this.sendErrorChannelTelegramMessage(`#${this.bet365Account}\n🚨Unknown error\n#${incidentId}\n${message}`);
    }

    /**
     * @param {string} incidentId
     * @param {string} reason
     */
    async sendResolveUnknownErrorMessage(incidentId, reason = null) {
        logger.info(`TELEGRAM_NOTIFIER: Sending resolved unknown error notification for incident: ${incidentId}${reason ? `, REASON: ${reason}` : ''}`);

        this.sendErrorChannelTelegramMessage(`#${this.bet365Account}\n✅️Unknown error resolved\n${reason ? `REASON: ${reason}\n` : ''}#${incidentId}`);
    }

    /**
     * @param {import('../bet365-page-wrapper/errors').CustomBet365HelperError} error
     */
    async sendCustomErrorMessage(incidentId, error) {
        logger.info(`TELEGRAM_NOTIFIER: Sending custom error notification: ${error.message}`);

        this.sendErrorChannelTelegramMessage(`#${this.bet365Account}\n🚨Custom error\n#${incidentId}\n${error.message}`, error.screenshot);
    }

    /**
     * @param {string} incidentId
     * @param {string} reason
     */
    async sendResolveCustomErrorMessage(incidentId, reason = null) {
        logger.info(`TELEGRAM_NOTIFIER: Sending resolved custom error notification for incident: ${incidentId}${reason ? `, REASON: ${reason}` : ''}`);

        this.sendErrorChannelTelegramMessage(`#${this.bet365Account}\n✅️Custom error resolved\n${reason ? `REASON: ${reason}\n` : ''}#${incidentId}`);
    }

    async sendInactivityMessage(minutes) {
        logger.info('TELEGRAM_NOTIFIER: Sending inactivity notification');

        this.sendErrorChannelTelegramMessage(`#${this.bet365Account}\nInactive for ${minutes} minutes`);
    }

    async sendCycleDurationExceededMessage(message) {
        this.sendErrorChannelTelegramMessage(`#${this.bet365Account}\nCycle duration exceeded:\n${message}`);
    }
}

module.exports = {
    TelegramNotifier,
};
