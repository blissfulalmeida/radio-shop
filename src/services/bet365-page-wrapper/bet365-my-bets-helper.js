const { delay, repeatedAsyncOperationExecutor } = require('../../components/util');
const { createLogger } = require('../../components/logger');
const { CustomBet365HelperError, BET365_PAGE_WRAPPER_ERROR } = require('./errors');

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
            throw new CustomBet365HelperError(
                `Failed to reload: ${error.message}`,
                BET365_PAGE_WRAPPER_ERROR.FAILED_TO_RELOAD,
            );
        }
    }

    async waitForPageHeaderToAppear() {
        try {
            await repeatedAsyncOperationExecutor({
                operation: () => this.page.$('div.wc-WebConsoleModule_Header > div.hm-HeaderModule'),
                predicate: (el) => el,
                timeout: 50,
                attempts: 50,
            });
        } catch (error) {
            throw new CustomBet365HelperError(
                'Failed to waitForPageHeaderToAppear',
                BET365_PAGE_WRAPPER_ERROR.FAILED_TO_WAIT_FOR_PAGE_HEADER,
            );
        }
    }

    /**
     * @returns {Promise<boolean>}
     */
    async checkLoggedInWide() {
        try {
            const [
                loggedInContainerSearchResult,
                loggedOutContainerSearchResult,
            ] = await repeatedAsyncOperationExecutor({
                operation: async () => Promise.all([
                    this.page.$('.hm-MainHeaderRHSLoggedInWide').then((el) => ({ exists: el !== null })).catch(() => ({ exists: false })),
                    this.page.$('.hm-MainHeaderRHSLoggedOutWide_Login').then((el) => ({ exists: el !== null })).catch(() => ({ exists: false })),
                ]),
                predicate: ([liRes, loRes]) => (liRes.exists === true && loRes.exists === false) || (liRes.exists === false && loRes.exists === true),
                timeout: 50,
                attempts: 10,
            });

            return loggedInContainerSearchResult.exists === true && loggedOutContainerSearchResult.exists === false;
        } catch (error) {
            throw new CustomBet365HelperError(
                'Failed to checkLoggedIn',
                BET365_PAGE_WRAPPER_ERROR.FAILED_TO_CHECK_LOGGED_IN,
            );
        }
    }

    /**
     * @returns {Promise<boolean>}
     */
    async checkLoggedInNarrow() {
        try {
            const [
                loggedInContainerSearchResult,
                loggedOutContainerSearchResult,
            ] = await repeatedAsyncOperationExecutor({
                operation: async () => Promise.all([
                    this.page.$('.hm-MainHeaderRHSLoggedInNarrow').then((el) => ({ exists: el !== null })).catch(() => ({ exists: false })),
                    this.page.$('.hm-MainHeaderRHSLoggedOutNarrow_Login').then((el) => ({ exists: el !== null })).catch(() => ({ exists: false })),
                ]),
                predicate: ([liRes, loRes]) => (liRes.exists === true && loRes.exists === false) || (liRes.exists === false && loRes.exists === true),
                timeout: 50,
                attempts: 10,
            });

            return loggedInContainerSearchResult.exists === true && loggedOutContainerSearchResult.exists === false;
        } catch (error) {
            throw new CustomBet365HelperError(
                'Failed to checkLoggedIn',
                BET365_PAGE_WRAPPER_ERROR.FAILED_TO_CHECK_LOGGED_IN,
            );
        }
    }

    // If wide check fails, we will try to check the narrow version
    async checkLoggedIn() {
        const wideLoginResult = await this.checkLoggedInWide()
            .then((res) => ({
                status: 'ok',
                result: res,
                type: 'wide',
            }))
            .catch(() => ({
                status: 'error',
                type: 'wide',
            }));

        if (wideLoginResult.status === 'ok') {
            return wideLoginResult.result;
        }

        return this.checkLoggedInNarrow();
    }

    /**
     * @returns {Promise<void>}
     */
    async waitForBetsHeaderToAppear() {
        try {
            await repeatedAsyncOperationExecutor({
                operation: () => this.page.$('.myb-MyBetsHeader_Scroller'),
                predicate: (el) => el,
                timeout: 50,
                attempts: 50,
            });
        } catch (error) {
            throw new CustomBet365HelperError(
                'Failed waiting for bets selection header to appear',
                BET365_PAGE_WRAPPER_ERROR.FAILED_TO_WAIT_FOR_BETS_HEADER,
            );
        }
    }

    /**
     * @returns {Promise<void>}
     */
    async clickOnFilterBets(betsFilter, durationMeasureTool = null) {
        try {
            const element = await repeatedAsyncOperationExecutor({
                operation: () => this.page.$(`.myb-MyBetsHeader_Scroller > div[data-content="${betsFilter}"]`),
                predicate: (el) => el,
                timeout: 50,
                attempts: 50,
            });

            if (durationMeasureTool) {
                durationMeasureTool.addAction(`CLICK_ON_FILTER_BETS:::${betsFilter}:::ELEMENT_FOUND`);
            }

            const box = await element.boundingBox();

            if (durationMeasureTool) {
                durationMeasureTool.addAction(`CLICK_ON_FILTER_BETS:::${betsFilter}:::BOUNDING_BOX_FOUND`);
            }

            if (box) {
                await this.page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 1 });
            }

            if (durationMeasureTool) {
                durationMeasureTool.addAction(`CLICK_ON_FILTER_BETS:::${betsFilter}:::MOUSE_MOVE`);
            }

            await delay(Math.random() * 500 + 100);
            await this.page.mouse.down();
            await delay(Math.random() * 150 + 50);
            await this.page.mouse.up();

            if (durationMeasureTool) {
                durationMeasureTool.addAction(`CLICK_ON_FILTER_BETS:::${betsFilter}:::MOUSE_CLICK`);
            }
        } catch (error) {
            throw new CustomBet365HelperError(
                `Failed to clickOnAllBets: ${error.message}`,
                BET365_PAGE_WRAPPER_ERROR.FAILED_TO_CLICK_ON_ALL_BETS,
            );
        }
    }

    /**
     * @returns {Promise<void>}
     */
    async waitForBetsContainerToAppear() {
        try {
            await repeatedAsyncOperationExecutor({
                operation: () => this.page.$('.myb-BetItemsContainer'),
                predicate: (el) => el,
                timeout: 50,
                attempts: 50,
            });
        } catch (error) {
            throw new CustomBet365HelperError(
                'waitForBetsContainerToAppear failed',
                BET365_PAGE_WRAPPER_ERROR.FAILED_TO_WAIT_FOR_BETS_CONTAINER,
            );
        }
    }

    /**
     * @returns {Promise<void>}
     */
    async waitForBetItemsContainerToAppear() {
        try {
            await repeatedAsyncOperationExecutor({
                operation: () => this.page.$('.myb-BetItemsContainer_Container'),
                predicate: (el) => el,
                timeout: 50,
                attempts: 50,
            });
        } catch (error) {
            throw new CustomBet365HelperError(
                `waitForBetItemsContainerToAppear failed: ${error.message}`,
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

                if (classNames.includes('Collapsed')) {
                    const box = await item.boundingBox();

                    if (box) {
                        await this.page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 10 });
                    }

                    await delay(Math.random() * 500 + 100);

                    await item.click();
                }
            }
        } catch (error) {
            throw new CustomBet365HelperError(
                `Failed to expandCollapsedBets: ${error.message}`,
                BET365_PAGE_WRAPPER_ERROR.FAILED_TO_EXPAND_COLLAPSED_BETS,
            );
        }
    }

    async getAllBetsHtmlOnThePage() {
        try {
            const betsHtml = await this.page.$eval('.myb-BetItemsContainer_Container', (betElement) => betElement.innerHTML);

            return betsHtml;
        } catch (error) {
            throw new CustomBet365HelperError(
                `getAllBetsHtmlOnThePage failed: ${error.message}`,
                BET365_PAGE_WRAPPER_ERROR.FAILED_TO_GET_ALL_BETS_HTML_ON_THE_PAGE,
            );
        }
    }
}

module.exports = {
    Bet365MyBetsPageHelper,
};
