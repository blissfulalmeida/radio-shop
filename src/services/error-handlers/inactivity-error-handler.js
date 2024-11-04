const { minutes } = require('../../components/util');

const SEND_INACTIVITY_NOTIFICATION_AFTER_MINUTES = 3;

class InactivityErrorHandler {
    /**
     * @param {import('../telegram-notifier').TelegramNotifier} telegramNotifier
     * @param {import('../proxy-manager').ProxyManager} proxyManager
     */
    constructor(telegramNotifier, proxyManager) {
        this.telegramNotifier = telegramNotifier;
        this.proxyManager = proxyManager;
    }

    init() {
        this.reenableInactivityTimeout();
    }

    clearInactivityTimeout() {
        if (this.inactivityTimeout) {
            clearTimeout(this.inactivityTimeout);
            this.inactivityTimeout = null;
        }
    }

    reenableInactivityTimeout() {
        this.clearInactivityTimeout();

        this.inactivityTimeout = setTimeout(() => {
            this.fireInactivityNotification();
            this.reenableInactivityTimeout();
        }, minutes(SEND_INACTIVITY_NOTIFICATION_AFTER_MINUTES));
    }

    fireInactivityNotification() {
        this.telegramNotifier.sendInactivityMessage(SEND_INACTIVITY_NOTIFICATION_AFTER_MINUTES);
        this.reloadProxy();
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
    InactivityErrorHandler,
};
