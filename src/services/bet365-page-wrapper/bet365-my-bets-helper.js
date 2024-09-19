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
            const element = await this.page.waitForSelector('.myb-MyBetsHeader_Scroller > div[data-content="All"]', { visible: true, timeout: 10000 });

            const box = await element.boundingBox();

            if (box) {
                await this.page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 10 });
            }

            await delay(Math.random() * 500 + 100);
            await this.page.mouse.down();
            await delay(Math.random() * 150 + 50);
            await this.page.mouse.up();
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

    /**
     * @returns {Promise<void>}
     */
    async waitForBetItemsContainerToAppear() {
        try {
            await this.page.waitForSelector('.myb-BetItemsContainer_BetItemsContainer', { timeout: 30000 })
                .catch(() => { throw new Error('Failed to find myb-BetItemsContainer_BetItemsContainer'); });
        } catch (error) {
            throw new Error(`BET365_PAGE_WRAPPER_ERROR:: Failed to waitForBetItemsContainerToAppear: ${error.message}`);
        }
    }

    /**
     * @returns {Promise<void>}
     */
    async expandCollapsedBets() {
        try {
            const betItems = await this.page.$$(
                'div.myb-BetItemsContainer_BetItemsContainer > div.myb-OpenBetItem, div.myb-BetItemsContainer_BetItemsContainer > div.myb-SettledBetItem',
            );

            // eslint-disable-next-line no-restricted-syntax
            for (const item of betItems) {
                const classNames = await item.evaluate((el) => el.className);

                if (classNames.includes('_DefaultCollapsed')) {
                    const box = await item.boundingBox();

                    if (box) {
                        await this.page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 10 });
                    }

                    await delay(Math.random() * 500 + 100);

                    await item.click();
                }
            }
        } catch (error) {
            throw new Error(`BET365_PAGE_WRAPPER_ERROR:: Failed to expandCollapsedBets: ${error.message}`);
        }
    }

    async getAllBetsHtmlOnThePage() {
        try {
            const betsHtml = await this.page.$eval('.myb-BetItemsContainer_BetItemsContainer ', (betElement) => betElement.innerHTML);

            return betsHtml;
        } catch (error) {
            throw new Error(`BET365_PAGE_WRAPPER_ERROR:: Failed to getAllBetsHtmlOnThePage: ${error.message}`);
        }
    }
}

module.exports = {
    Bet365MyBetsPageHelper,
};
