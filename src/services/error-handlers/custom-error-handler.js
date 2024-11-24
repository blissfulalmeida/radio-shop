const config = require('config');
const moment = require('moment');
const { v4 } = require('uuid');
const { createLogger } = require('../../components/logger');

const logger = createLogger(module);

const CUSTOM_ERROR_NOTIFICATION_INTERVAL_SECONDS = config.get('customErrorNotificationIntervalSeconds');

class CustomBet365ErrorHandler {
    /**
     * @param {import('../telegram-notifier').TelegramNotifier} telegramNotifier
     * @param {import('../proxy-manager').ProxyManager} proxyManager
     * @param {import('../event-bus').EventBus} eventBus
     */
    constructor(telegramNotifier, proxyManager, eventBus) {
        this.telegramNotifier = telegramNotifier;
        this.proxyManager = proxyManager;
        this.eventBus = eventBus;

        // This property is used to track the incident ID
        // If it is not null, it means that an unknown error has occurred and has not been resolved yet
        // Not resolved means that after the error occurred, not successful data collection has happened
        this.incidentId = null;

        this.sendNextCustomErrorNotificationAfter = null;
    }

    /**
     * @param {import('../bet365-page-wrapper/errors').CustomBet365HelperError} error
     */
    handleError(error) {
        if (!this.incidentId) {
            this.incidentId = v4().replace(/-/g, '_');
        }

        if (this.sendNextCustomErrorNotificationAfter && !moment().isAfter(this.sendNextCustomErrorNotificationAfter)) {
            logger.info('Custom error notification skipped');

            return;
        }

        this.telegramNotifier.sendCustomErrorMessage(this.incidentId, error);

        this.sendNextCustomErrorNotificationAfter = moment().add(CUSTOM_ERROR_NOTIFICATION_INTERVAL_SECONDS, 'seconds');
    }

    resolveIncident(reason = null) {
        if (this.incidentId) {
            this.telegramNotifier.sendResolveCustomErrorMessage(this.incidentId, reason);

            this.incidentId = null;
            this.sendNextCustomErrorNotificationAfter = null;
        }
    }

    async reloadProxy() {
        const proxyReloadResponse = await this.proxyManager.reloadProxy();

        let message;

        if (proxyReloadResponse.status === 'success') {
            message = `Proxy reloaded successfully: ${JSON.stringify(proxyReloadResponse.res)}`;
        } else {
            message = `Failed to reload proxy: ${proxyReloadResponse.error.message}`;
        }

        this.telegramNotifier.sendMainChannelMessage(message);
    }
}

module.exports = {
    CustomBet365ErrorHandler,
};
