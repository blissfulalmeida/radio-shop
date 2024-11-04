const config = require('config');
const moment = require('moment');
const { v4 } = require('uuid');
const { createLogger } = require('../../components/logger');

const logger = createLogger(module);

const CUSTOM_ERROR_NOTIFICATION_INTERVAL_SECONDS = config.get('customErrorNotificationIntervalSeconds');

class UnknownErrorHandler {
    /**
     * @param {import('../telegram-notifier').TelegramNotifier} telegramNotifier
     */
    constructor(telegramNotifier) {
        this.telegramNotifier = telegramNotifier;

        this.incidentId = null;

        this.sendNextUnknownErrorNotificationAfter = null;
    }

    /**
     * @param {Error} error
     */
    handleError(error) {
        if (!this.incidentId) {
            this.incidentId = v4().replace(/-/g, '_');
        }

        if (this.sendNextUnknownErrorNotificationAfter && !moment().isAfter(this.sendNextUnknownErrorNotificationAfter)) {
            logger.info('Custom error notification skipped');

            return;
        }

        this.telegramNotifier.sendUnknownErrorMessage(this.incidentId, error.message);

        this.sendNextUnknownErrorNotificationAfter = moment().add(CUSTOM_ERROR_NOTIFICATION_INTERVAL_SECONDS, 'seconds');
    }

    resolveIncident() {
        this.telegramNotifier.sendResolveUnknownErrorMessage(this.incidentId);

        this.incidentId = null;
        this.sendNextUnknownErrorNotificationAfter = null;
    }
}

module.exports = {
    UnknownErrorHandler,
};
