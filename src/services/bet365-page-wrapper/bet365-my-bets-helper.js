const { delay } = require('../../components/util');

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

    /**
     * @returns {Promise<boolean>}
     */
    async checkLoggedOut() {
        try {
            // We check if the login button is present
            const loggedInResult = await this.page.waitForSelector('.hm-MainHeaderRHSLoggedOutWide_Login ', { timeout: 5000 })
                .then(() => ({ loggedOut: true }))
                .catch(() => ({ loggedOut: false }));

            return loggedInResult.loggedOut;
        } catch (error) {
            throw new Error(`BET365_PAGE_WRAPPER_ERROR:: Failed to checkLoggedIn: ${error.message}`);
        }
    }

    /**
     * @returns {Promise<void>}
     */
    async clickOnAllBets() {
        try {
            await this.page.waitForSelector('.myb-MyBetsHeader_Scroller', { timeout: 30000 })
                .catch(() => { throw new Error('Failed to find myb-MyBetsHeader_Scroller'); });

            await delay(1000);

            await this.page.click('.myb-MyBetsHeader_Scroller > div[data-content="All"]', { delay: 100 });
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
