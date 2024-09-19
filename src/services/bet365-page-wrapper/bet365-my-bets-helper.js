const { delay, retriebleAsyncOperationExecutor } = require('../../components/util');

class Bet365MyBetsPageHelper {
    constructor(page) {
        /**
         * @type {import('puppeteer-core').Page}
         */
        this.page = page;
    }

    async reload() {
        try {
            await this.page.reload({ timeout: 30000, waitUntil: 'networkidle2' });
        } catch (error) {
            throw new Error(`BET365_PAGE_WRAPPER_ERROR:: Failed to reload: ${error.message}`);
        }
    }

    async waitForPageHeaderToAppear() {
        try {
            await this.page.waitForSelector('.hm-MainHeaderWide', { timeout: 30000 })
                .catch(() => { throw new Error('Failed to waitForPageHeaderToAppear'); });
        } catch (error) {
            throw new Error(`BET365_PAGE_WRAPPER_ERROR:: Failed to waitForPageHeaderToAppear: ${error.message}`);
        }
    }

    /**
     * @returns {Promise<boolean>}
     */
    async checkLoggedIn() {
        try {
            const loggedInContainerSearchResult = await this.page.waitForSelector('.hm-MainHeaderRHSLoggedInWide', { timeout: 5000 })
                .then(() => ({ exists: true }))
                .catch(() => ({ exists: false }));

            const loggedOutContainerSearchResult = await this.page.waitForSelector('.hm-MainHeaderRHSLoggedOutWide_Login', { timeout: 5000 })
                .then(() => ({ exists: true }))
                .catch(() => ({ exists: false }));

            return loggedInContainerSearchResult.exists === true && loggedOutContainerSearchResult.exists === false;
        } catch (error) {
            throw new Error(`BET365_PAGE_WRAPPER_ERROR:: Failed to checkLoggedIn: ${error.message}`);
        }
    }

    /**
     * @returns {Promise<void>}
     */
    async waitForBetsHeaderToAppear() {
        try {
            await this.page.waitForSelector('.myb-MyBetsHeader_Scroller', { timeout: 30000 })
                .catch(() => { throw new Error('Failed to find myb-MyBetsHeader_Scroller'); });
        } catch (error) {
            throw new Error(`BET365_PAGE_WRAPPER_ERROR:: Failed waiting for bets selection header to appear: ${error.message}`);
        }
    }

    /**
     * @returns {Promise<void>}
     */
    async clickOnAllBets() {
        try {
            await retriebleAsyncOperationExecutor({
                operation: () => this.page.click('.myb-MyBetsHeader_Scroller > div[data-content="All"]', { delay: 100, timeout: 10000 }),
                retries: 3,
                delayBetweenRetries: 1000,
            });
        } catch (error) {
            throw new Error(`BET365_PAGE_WRAPPER_ERROR:: Failed to clickOnAllBets: ${error.message}`);
        }
    }

    /**
     * @returns {Promise<void>}
     */
    async waitForBetsContainerToAppear() {
        try {
            await this.page.waitForSelector('.myb-MyBets_Container', { timeout: 30000 })
                .catch(() => { throw new Error('Failed to find myb-MyBets_Container '); });
        } catch (error) {
            throw new Error(`BET365_PAGE_WRAPPER_ERROR:: Failed to waitForBetsToAppear: ${error.message}`);
        }
    }

    /**
     * @returns {Promise<boolean>}
     */
    async checkIfEmptyBetsContainerExists() {
        try {
            const emptyBetsContainerResult = await this.page.waitForSelector('.myb-BetItemsContainer_EmptyMessage', { timeout: 5000 })
                .then(() => ({ isEmpty: true }))
                .catch(() => ({ isEmpty: false }));

            return emptyBetsContainerResult.isEmpty;
        } catch (error) {
            throw new Error(`BET365_PAGE_WRAPPER_ERROR:: Failed to checkIfEmptyBetsContainerExists: ${error.message}`);
        }
    }
}

module.exports = {
    Bet365MyBetsPageHelper,
};
