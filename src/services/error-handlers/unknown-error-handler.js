const config = require('config');
const moment = require('moment');
const { v4 } = require('uuid');
const { createLogger } = require('../../components/logger');

const logger = createLogger(module);

const UNKNOWN_ERROR_NOTIFICATION_INTERVAL_SECONDS = config.get('unknownErrorNotificationIntervalSeconds');

class UnknownErrorHandler {
    /**
     * @param {import('../telegram-notifier').TelegramNotifier} telegramNotifier
     */
    constructor(telegramNotifier) {
        this.telegramNotifier = telegramNotifier;

        // This property is used to track the incident ID
        // If it is not null, it means that an unknown error has occurred and has not been resolved yet
        // Not resolved means that after the error occurred, not successful data collection has happened
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
            logger.info('Unknown error notification skipped');

            return;
        }

        this.telegramNotifier.sendUnknownErrorMessage(this.incidentId, error.message);

        this.sendNextUnknownErrorNotificationAfter = moment().add(UNKNOWN_ERROR_NOTIFICATION_INTERVAL_SECONDS, 'seconds');
    }

    resolveIncident(reason = null) {
        if (this.incidentId) {
            this.telegramNotifier.sendResolveUnknownErrorMessage(this.incidentId, reason);

            this.incidentId = null;
            this.sendNextUnknownErrorNotificationAfter = null;
        }
    }
}

module.exports = {
    UnknownErrorHandler,
};
