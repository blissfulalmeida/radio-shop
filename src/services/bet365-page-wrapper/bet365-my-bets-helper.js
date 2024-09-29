const { delay, repeatedAsyncOperationExecutor } = require('../../components/util');
const { createLogger } = require('../../components/logger');
const { CustomBet365HeplerError, BET365_PAGE_WRAPPER_ERROR } = require('./errors');

const logger = createLogger(module);

class Bet365MyBetsPageHelper {
    constructor(page, baseUrl) {
        /**
         * @type {import('puppeteer-core').Page}
         */
        this.page = page;
        this.baseUrl = baseUrl;
    }

    async goToPage() {
        try {
            const currentUrl = this.page.url();

            if (currentUrl !== this.baseUrl) {
                logger.info(`Current URL is different. Navigating to ${this.baseUrl}`);

                await this.page.goto(this.baseUrl, { timeout: 30000, waitUntil: 'networkidle2' });
            } else {
                logger.info('Current URL is the same. Reloading the page.');

                await this.page.reload({ timeout: 30000, waitUntil: 'networkidle0' });
            }
        } catch (error) {
            throw new CustomBet365HeplerError(
                `BET365_PAGE_WRAPPER_ERROR:: Failed to reload: ${error.message}`,
                BET365_PAGE_WRAPPER_ERROR.FAILED_TO_RELOAD,
            );
        }
    }

    async waitForPageHeaderToAppear() {
        try {
            await repeatedAsyncOperationExecutor({
                operation: () => this._page.$('div.wc-WebConsoleModule_Header > div.hm-HeaderModule'),
                predicate: (el) => el,
                timeout: 20,
                attempts: 100,
            })
                .catch(() => {
                    throw new Error('Failed to waitForPageHeaderToAppear');
                });
        } catch (error) {
            throw new CustomBet365HeplerError(
                `BET365_PAGE_WRAPPER_ERROR:: Failed to waitForPageHeaderToAppear: ${error.message}`,
                BET365_PAGE_WRAPPER_ERROR.FAILED_TO_WAIT_FOR_PAGE_HEADER,
            );
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
            throw new CustomBet365HeplerError(
                `BET365_PAGE_WRAPPER_ERROR:: Failed to checkLoggedIn: ${error.message}`,
                BET365_PAGE_WRAPPER_ERROR.FAILED_TO_CHECK_LOGGED_IN,
            );
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
            throw new CustomBet365HeplerError(
                `BET365_PAGE_WRAPPER_ERROR:: Failed waiting for bets selection header to appear: ${error.message}`,
                BET365_PAGE_WRAPPER_ERROR.FAILED_TO_WAIT_FOR_BETS_HEADER,
            );
        }
    }

    /**
     * @returns {Promise<void>}
     */
    async clickOnAllBets() {
        try {
            const element = await this.page.waitForSelector('.myb-MyBetsHeader_Scroller > div[data-content="Unsettled"]', { visible: true, timeout: 10000 });

            const box = await element.boundingBox();

            if (box) {
                await this.page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 10 });
            }

            await delay(Math.random() * 500 + 100);
            await this.page.mouse.down();
            await delay(Math.random() * 150 + 50);
            await this.page.mouse.up();
        } catch (error) {
            throw new CustomBet365HeplerError(
                `BET365_PAGE_WRAPPER_ERROR:: Failed to clickOnAllBets: ${error.message}`,
                BET365_PAGE_WRAPPER_ERROR.FAILED_TO_CLICK_ON_ALL_BETS,
            );
        }
    }

    /**
     * @returns {Promise<void>}
     */
    async waitForBetsContainerToAppear() {
        try {
            await this.page.waitForSelector('.myb-BetItemsContainer', { timeout: 30000 })
                .catch(() => { throw new Error('Failed to find myb-BetItemsContainer '); });
        } catch (error) {
            throw new CustomBet365HeplerError(
                `BET365_PAGE_WRAPPER_ERROR:: waitForBetsContainerToAppear failed: ${error.message}`,
                BET365_PAGE_WRAPPER_ERROR.FAILED_TO_WAIT_FOR_BETS_CONTAINER,
            );
        }
    }

    /**
     * @returns {Promise<boolean>}
     */
    async checkIfEmptyBetsContainerExists() {
        try {
            const emptyBetsContainerResult = await this.page.waitForSelector('.BetItemsContainer_EmptyMessage', { timeout: 5000 })
                .then(() => ({ isEmpty: true }))
                .catch(() => ({ isEmpty: false }));

            return emptyBetsContainerResult.isEmpty;
        } catch (error) {
            throw new CustomBet365HeplerError(
                `BET365_PAGE_WRAPPER_ERROR:: checkIfEmptyBetsContainerExists failed: ${error.message}`,
                BET365_PAGE_WRAPPER_ERROR.FAILED_TO_CHECK_IF_EMPTY_BETS_CONTAINER_EXISTS,
            );
        }
    }

    /**
     * @returns {Promise<void>}
     */
    async waitForBetItemsContainerToAppear() {
        try {
            await this.page.waitForSelector('.myb-BetItemsContainer_Container', { timeout: 30000 })
                .catch(() => { throw new Error('Failed to find myb-BetItemsContainer_BetItemsContainer'); });
        } catch (error) {
            throw new CustomBet365HeplerError(
                `BET365_PAGE_WRAPPER_ERROR:: waitForBetItemsContainerToAppear failed: ${error.message}`,
                BET365_PAGE_WRAPPER_ERROR.FAILED_TO_WAIT_FOR_BET_ITEMS_CONTAINER,
            );
        }
    }

    /**
     * @returns {Promise<void>}
     */
    async expandCollapsedBets() {
        try {
            const betItems = await this.page.$$(
                'div.myb-BetItemsContainer_Container > div.myb-OpenBetItem, div.myb-BetItemsContainer_Container > div.myb-SettledBetItem',
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
            throw new CustomBet365HeplerError(
                `BET365_PAGE_WRAPPER_ERROR:: Failed to expandCollapsedBets: ${error.message}`,
                BET365_PAGE_WRAPPER_ERROR.FAILED_TO_EXPAND_COLLAPSED_BETS,
            );
        }
    }

    async getAllBetsHtmlOnThePage() {
        try {
            const betsHtml = await this.page.$eval('.myb-BetItemsContainer_Container', (betElement) => betElement.innerHTML);

            return betsHtml;
        } catch (error) {
            throw new CustomBet365HeplerError(
                `BET365_PAGE_WRAPPER_ERROR:: getAllBetsHtmlOnThePage failed: ${error.message}`,
                BET365_PAGE_WRAPPER_ERROR.FAILED_TO_GET_ALL_BETS_HTML_ON_THE_PAGE,
            );
        }
    }
}

module.exports = {
    Bet365MyBetsPageHelper,
};
