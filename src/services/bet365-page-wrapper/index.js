const puppeteer = require('puppeteer-core');
const { createLogger } = require('../../components/logger');

const logger = createLogger(module);

class Bet365PageWrapper {
    /**
     *
     * @param {Profile} profile
     */
    constructor(profile) {
        this.profile = profile;

        this.browser = null;
        this.page = null;
    }

    async init() {
        try {
            this.browser = await puppeteer.connect({
                browserWSEndpoint: this.profile.ws_endpoint,
                defaultViewport: null,
            });

            const pages = await this.browser.pages();

            logger.info(`Number of pages: ${pages.length}`);
        } catch (error) {
            throw new Error(`BET365_PAGE_WRAPPER_ERROR:: Failed to init: ${error.message}`);
        }
    }
}

module.exports = {
    Bet365PageWrapper,
};
