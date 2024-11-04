class CustomBet365ErrorHandler {
    /**
     * @param {import('../telegram-notifier').TelegramNotifier} telegramNotifier
     * @param {import('../proxy-manager').ProxyManager} proxyManager
     */
    constructor(telegramNotifier, proxyManager) {
        this.telegramNotifier = telegramNotifier;
        this.proxyManager = proxyManager;

        this.sendNextCustomErrorNotificationAfter = null;
    }

    /**
     * @param {import('../bet365-page-wrapper/errors').CustomBet365HelperError} error
     */
    handleError(error) {

    }

    resolveIncident() {

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
