const fs = require('fs');
const path = require('path');
const moment = require('moment');
const config = require('config');
const puppeteer = require('puppeteer-core');
const cheerio = require('cheerio');
const { createLogger } = require('../../components/logger');
const { Bet365MyBetsPageHelper } = require('./bet365-my-bets-helper');
const { beautifyHTML } = require('../../components/util');
const { OpenBetDataExtractor } = require('./open-bet-data-extractor');
const { BET_365_STATE } = require('../../constants');

const logger = createLogger(module);

const NEED_TO_SAVE_HTML = config.get('bet365.saveHtml');

class Bet365PageWrapper {
    /**
     * @param {Profile} profile
     * @param {import('../decision-engine').DecisionEngine} decisionEngine
     */
    constructor(profile, decisionEngine) {
        this.profile = profile;
        this.decisionEngine = decisionEngine;

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
        this.jobsQueue = [];
        this.taskInProgress = false;
    }

    async init() {
        try {
            this.browser = await puppeteer.connect({
                browserWSEndpoint: this.profile.ws_endpoint,
                defaultViewport: null,
            });

            this.page = await this.browser.newPage();

            const pages = await this.browser.pages();

            // eslint-disable-next-line no-restricted-syntax
            for (const p of pages) {
                if (p !== this.page) {
                    await p.close();
                }
            }

            await this.page.goto(this.bet365MyBetsPage, { timeout: 30000, waitUntil: 'domcontentloaded' });

            this._setState(BET_365_STATE.READY);

            this._startRealityCheckSolvingLoop();
            this._startDataCrawlingLoop();
            this._startLeanDataCrawlingLoop();
        } catch (error) {
            throw new Error(`BET365_PAGE_WRAPPER_ERROR:: Failed to init: ${error.message}`);
        }
    }

    _startRealityCheckSolvingLoop() {
        this._realityCheckTick();
    }

    async _realityCheckTick() {
        try {
            await this._executeAsyncJob(() => this._trySolveRealityCheck()
                .catch((error) => {
                    logger.error(`REALITY_CHECK_ERROR:: Failed to poll reality check: ${error.message}`);
                }));
        } finally {
            setTimeout(() => {
                this._realityCheckTick();
            }, 1000 * 5);
        }
    }

    _startDataCrawlingLoop() {
        this._dataCrawlingTick();
    }

    async _dataCrawlingTick() {
        try {
            await this._executeAsyncJob(() => this._executePageAction());
        } finally {
            setTimeout(() => {
                this._dataCrawlingTick();
            }, 1000 * 60 * 5);
        }
    }

    _startLeanDataCrawlingLoop() {
        this._leanDataCrawlingTick();
    }

    async _leanDataCrawlingTick() {
        try {
            await this._executeAsyncJob(() => this._executePageAction(false));
        } finally {
            setTimeout(() => {
                this._leanDataCrawlingTick();
            }, 1000);
        }
    }

    _executeAsyncJob(asyncJob) {
        let resolve;

        const promise = new Promise((res) => {
            resolve = res;
        });

        this.jobsQueue.push({
            asyncJob,
            resolve,
        });

        setTimeout(() => {
            this._checkTasksQueue();
        }, 0);

        return promise;
    }

    _checkTasksQueue() {
        if (this.jobsQueue.length === 0 || this.taskInProgress) {
            return;
        }

        this.taskInProgress = true;

        const { asyncJob, resolve } = this.jobsQueue.shift();

        asyncJob()
            .then(() => {
                resolve();

                this.taskInProgress = false;

                this._checkTasksQueue();
            });
    }

    _setState(newState) {
        const currentState = this.state;

        if (currentState === newState) {
            return;
        }

        this.state = newState;

        this.decisionEngine.handleStateChange(currentState, newState);
    }

    async _trySolveRealityCheck() {
        try {
            const frames = await this.page.frames();

            const realityCheckFrame = frames.find((frame) => frame.url().includes('members.bet365.es'));

            if (realityCheckFrame) {
                logger.info('Found reality check frame');

                /**
                 * @type {puppeteer.ElementHandle<HTMLButtonElement>[]}
                 */
                const buttonHandles = await realityCheckFrame.$$('button');

                const stayLoggedInButton = buttonHandles.find(async (buttonHandle) => {
                    const text = await buttonHandle.evaluate((node) => node.innerText);

                    return text.includes('Stay Logged In');
                });

                if (stayLoggedInButton) {
                    const boundingBox = await stayLoggedInButton.boundingBox();

                    if (boundingBox) {
                        await this.page.mouse.move(
                            boundingBox.x + boundingBox.width / 2,
                            boundingBox.y + boundingBox.height / 2,
                        );
                        await this.page.mouse.down();
                        await this.page.mouse.up();

                        logger.info('Button clicked as a human!');
                    } else {
                        logger.info("Failed to get the button's position.");
                    }
                } else {
                    logger.info('No button found.');
                }
            }
        } catch (error) {
            logger.error(`REALITY_CHECK_ERROR:: Failed to solve reality check: ${error.message}`);
        }
    }

    async _executePageAction(reloadPage = true) {
        try {
            this.cycleNumber += 1;

            logger.info(`${this.cycleNumber}: Starting new cycle${reloadPage ? ' (reloading page)' : ' (skipping page reload)'}`);

            const bet365MyBetsPageHelper = new Bet365MyBetsPageHelper(this.page, this.bet365MyBetsPage);

            if (reloadPage) {
                await bet365MyBetsPageHelper.goToPage();

                logger.info(`${this.cycleNumber}: Page reloaded`);
            } else {
                logger.info(`${this.cycleNumber}: Page reloaded skipped`);
            }

            await bet365MyBetsPageHelper.waitForPageHeaderToAppear();

            logger.info(`${this.cycleNumber}: Page header appeared`);

            const loggedIn = await bet365MyBetsPageHelper.checkLoggedIn();

            logger.info(`${this.cycleNumber}: Logged in: ${loggedIn ? 'YES' : 'NO'}`);

            this._setState(loggedIn ? BET_365_STATE.LOGGED_IN : BET_365_STATE.LOGGED_OUT);

            if (!loggedIn) {
                return;
            }

            await bet365MyBetsPageHelper.waitForBetsHeaderToAppear();

            logger.info(`${this.cycleNumber}: Bets header appeared`);

            await bet365MyBetsPageHelper.clickOnUnsettledBets();

            logger.info(`${this.cycleNumber}: Clicked on unsettled bets`);

            await bet365MyBetsPageHelper.waitForBetsContainerToAppear();

            logger.info(`${this.cycleNumber}: Bets container appeared`);

            await bet365MyBetsPageHelper.waitForBetItemsContainerToAppear();

            logger.info(`${this.cycleNumber}: Bet items container appeared`);

            await bet365MyBetsPageHelper.expandCollapsedBets();

            logger.info(`${this.cycleNumber}: Expanded collapsed bets`);

            const allBetsInnerHtml = await bet365MyBetsPageHelper.getAllBetsHtmlOnThePage();

            const $ = cheerio.load(allBetsInnerHtml);

            const betItems = $('div.myb-OpenBetItem, div.myb-SettledBetItem');

            if (NEED_TO_SAVE_HTML) {
                const folderName = `bets-${moment.utc().format('YYYY-MM-DD-HH-mm-ss')}`;
                const folderPath = path.resolve(__dirname, '..', '..', '..', 'crawled', folderName);

                fs.mkdirSync(folderPath);

                Array.from(betItems).forEach((betElement, index) => {
                    const betHtml = $.html(betElement);
                    const beautifiedHtml = beautifyHTML(betHtml);

                    fs.writeFileSync(path.join(folderPath, `${index}.html`), beautifiedHtml);
                });

                logger.info(`${this.cycleNumber}: Saved all bets to ${folderName}`);
            }

            const openBets = [];

            Array.from(betItems).forEach((betElement) => {
                const className = betElement.attribs.class || '';

                if (className.includes('myb-OpenBetItem')) {
                    const extractor = new OpenBetDataExtractor(betElement);
                    const betData = extractor.extractBetData();

                    if (betData) {
                        openBets.push(betData);
                    }
                }
            });

            this.decisionEngine.handleFetchedOpenBets(openBets);

            logger.info(`${this.cycleNumber}: Fetched cycle`);
        } catch (error) {
            this.decisionEngine.handleError(error);
        }
    }
}

module.exports = {
    Bet365PageWrapper,
};
