const { seconds, minutes } = require('../../components/util');
const { EVENT } = require('../event-bus');

class CustomErrorRepairer {
    /**
     * @param {import('../telegram-notifier').TelegramNotifier} telegramNotifier
     * @param {import('../proxy-manager').ProxyManager} proxyManager
     * @param {import('../event-bus').EventBus} eventBus
     */
    constructor(telegramNotifier, proxyManager, eventBus) {
        this.telegramNotifier = telegramNotifier;
        this.proxyManager = proxyManager;
        this.eventBus = eventBus;

        this.pageReloadTimeout = null;
        this.proxyReloadTimeout = null;
        this.fullPageReloadTimeout = null;
        this.handsDownTimeout = null;

        this.repairIteration = 0;
    }

    startRepairing() {
        this.repairIteration += 1;

        this.pageReloadTimeout = setTimeout(() => {
            this.telegramNotifier.sendErrorChannelTelegramMessage(`ERROR_REPAIRER: FIX #${this.repairIteration}.1: Page reload`);

            this.eventBus.emit(EVENT.PAGE_RELOAD);
        }, seconds(30));

        this.proxyReloadTimeout = setTimeout(async () => {
            this.telegramNotifier.sendErrorChannelTelegramMessage(`ERROR_REPAIRER: FIX #${this.repairIteration}.2: Proxy reload and page reload`);

            await this.proxyManager.reloadProxy();

            this.eventBus.emit(EVENT.PAGE_RELOAD);
        }, minutes(1));

        this.fullPageReloadTimeout = setTimeout(() => {
            this.telegramNotifier.sendErrorChannelTelegramMessage(`ERROR_REPAIRER: FIX #${this.repairIteration}.3: Page hard reload`);

            this.eventBus.emit(EVENT.FULL_PAGE_RELOAD);
        }, minutes(2));

        this.handsDownTimeout = setTimeout(() => {
            this.telegramNotifier.sendErrorChannelTelegramMessage(`ERROR_REPAIRER: FIX #${this.repairIteration} All fix attempts failed. Retrying from the beginning`);

            this.terminate();
            this.startRepairing();
        }, minutes(3));
    }

    terminate() {
        clearTimeout(this.pageReloadTimeout);
        clearTimeout(this.proxyReloadTimeout);
        clearTimeout(this.fullPageReloadTimeout);
        clearTimeout(this.handsDownTimeout);
    }
}

module.exports = {
    CustomErrorRepairer,
};
