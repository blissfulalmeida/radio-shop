const config = require('config');
const puppeteer = require('puppeteer-core');
const { createLogger } = require('../../components/logger');

const logger = createLogger(module);

const BET_365_STATE = {
    IDLE: 'IDLE',
    READY: 'READY',
};

class Bet365PageWrapper {
    /**
     * @param {Profile} profile
     * @param {import('../telegram-notifier').TelegramNotifier} telegramNotifier
     */
    constructor(profile, telegramNotifier) {
        this.profile = profile;
        this.telegramNotifier = telegramNotifier;

        this.state = BET_365_STATE.IDLE;
        this.bet365MyBetsPage = config.get('bet365.myBetsPage');
        this.cycleNumber = 0;

        /**
         * @type {puppeteer.Browser}
         */
        this.browser = null;

        /**
         * @type {puppeteer.Page}
         */
        this.page = null;
    }

    async init() {
        try {
            this.browser = await puppeteer.connect({
                browserWSEndpoint: this.profile.ws_endpoint,
                defaultViewport: null,
            });

            this.page = await this.browser.newPage();

            this.page.goto(this.bet365MyBetsPage, { timeout: 30000, waitUntil: 'domcontentloaded' });

            this.state = BET_365_STATE.READY;
        } catch (error) {
            throw new Error(`BET365_PAGE_WRAPPER_ERROR:: Failed to init: ${error.message}`);
        }
    }

    startIntervaledPolling() {
        this._poll();
    }

    async _poll() {
        try {
            await this._executePageAction();
        } catch (error) {
            logger.error(`BET365_PAGE_WRAPPER_ERROR:: Failed to poll ${this.cycleNumber}: ${error.message}`);
        } finally {
            setTimeout(() => {
                this._poll();
            }, 1000 * 60 * 2);
        }
    }

    async _executePageAction() {
        try {
            this.cycleNumber += 1;

            if (this.state !== BET_365_STATE.READY) {
                logger.warn(`${this.cycleNumber}: Polling while not ready`);
            }

            logger.info(`${this.cycleNumber}: Starting new cycle`);

            await this.page.reload({ timeout: 30000, waitUntil: 'domcontentloaded' });
        } catch (error) {
            throw new Error(`BET365_PAGE_WRAPPER_ERROR:: Failed to execute page action: ${error.message}`);
        }
    }
}

module.exports = {
    Bet365PageWrapper,
};
