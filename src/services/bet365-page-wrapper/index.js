const fs = require('fs');
const path = require('path');
const moment = require('moment');
const config = require('config');
const puppeteer = require('puppeteer-core');
const cheerio = require('cheerio');
const _ = require('lodash');
const { createLogger } = require('../../components/logger');
const { Bet365MyBetsPageHelper } = require('./bet365-my-bets-helper');
const { beautifyHTML } = require('../../components/util');
const { OpenBetDataExtractor, SettledBetDataExtractor } = require('./bet-data-extractor');
const { BET_365_STATE } = require('../../constants');
const { DurationMeasureTool } = require('../../components/duration-measure-tool');
const { CustomBet365HelperError } = require('./errors');
const { EVENT } = require('../event-bus');

const logger = createLogger(module);

const NEED_TO_SAVE_HTML = config.get('bet365.saveHtml');

class Bet365PageWrapper {
    /**
     * @param {Profile} profile
     * @param {import('../decision-engine').DecisionEngine} decisionEngine
     * @param {import('../event-bus').EventBus} eventBus
     */
    constructor(profile, decisionEngine, eventBus) {
        this.profile = profile;
        this.decisionEngine = decisionEngine;
        this.eventBus = eventBus;

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

            await this._recreateMainPage();

            this._setState(BET_365_STATE.READY);

            this._startRealityCheckSolvingLoop();
            this._startPageReloadCrawlingLoop();
            this._starExistingPageCrawlingLoop();

            this._subscribeToEvents();
            this._startIntervalScreenshotCapture();
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
            }, 500);
        }
    }

    _startPageReloadCrawlingLoop() {
        this._dataCrawlingTick();
    }

    async _dataCrawlingTick() {
        try {
            await this._executeAsyncJob(() => this._executePageAction());
        } finally {
            setTimeout(() => {
                this._dataCrawlingTick();
            }, 1000 * config.get('bet365PageReloadIntervalSeconds'));
        }
    }

    _starExistingPageCrawlingLoop() {
        this._leanDataCrawlingTick();
    }

    async _leanDataCrawlingTick() {
        try {
            await this._executeAsyncJob(() => this._executePageAction(false));
        } finally {
            setTimeout(() => {
                this._leanDataCrawlingTick();
            }, 500);
        }
    }

    _subscribeToEvents() {
        // When a page reload is requested - we need to start the data crawling process with page reload
        this.eventBus.on(EVENT.PAGE_RELOAD, async () => {
            await this._executeAsyncJob(() => this._executePageAction());
        });

        // When a full page reload is requested - we need to recreate the main page
        this.eventBus.on(EVENT.FULL_PAGE_RELOAD, async () => {
            await this._executeAsyncJob(() => this._recreateMainPage().catch(_.noop));
        });
    }

    _startIntervalScreenshotCapture() {
        this._takePageScreenshotTick();
    }

    async _takePageScreenshotTick() {
        try {
            await this._executeAsyncJob(() => this._takePageScreenshot(false));
        } finally {
            setTimeout(() => {
                this._takePageScreenshotTick();
            }, 1000 * 10);
        }
    }

    async _takePageScreenshot() {
        try {
            if (!this.page) {
                return;
            }

            const screenshotDir = path.resolve(__dirname, '..', '..', '..', 'screenshots', config.get('bet365.account'));
            const screenshotName = `${moment.utc().format('YYYY-MM-DD-HH-mm-ss')}.jpg`;

            if (!fs.existsSync(screenshotDir)) {
                fs.mkdirSync(screenshotDir, { recursive: true });
            }

            await this.page.screenshot({
                type: 'jpeg',
                quality: 100,
                omitBackground: true,
                path: path.join(screenshotDir, screenshotName),
            });
        } catch (error) {
            logger.error(`SCREENSHOT_ERROR:: Failed to take screenshot: ${error.message}`);
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
        const durationMeasureTool = new DurationMeasureTool();

        try {
            durationMeasureTool.addAction('START');

            this.cycleNumber += 1;

            logger.debug(`${this.cycleNumber}: Starting new cycle${reloadPage ? ' (reloading page)' : ' (skipping page reload)'}`);

            const bet365MyBetsPageHelper = new Bet365MyBetsPageHelper(this.page, this.bet365MyBetsPage);

            if (reloadPage) {
                await bet365MyBetsPageHelper.goToPage();
            }

            durationMeasureTool.addAction('PAGE_RELOADED');

            await bet365MyBetsPageHelper.waitForPageHeaderToAppear(reloadPage);

            durationMeasureTool.addAction('PAGE_HEADER_APPEARED');

            const loggedIn = await bet365MyBetsPageHelper.checkLoggedIn(reloadPage);

            durationMeasureTool.addAction('CHECKED_LOGGED_IN');

            this._setState(loggedIn ? BET_365_STATE.LOGGED_IN : BET_365_STATE.LOGGED_OUT);

            if (!loggedIn) {
                return;
            }

            await bet365MyBetsPageHelper.waitForBetsHeaderToAppear();

            durationMeasureTool.addAction('BETS_HEADER_APPEARED');

            // When the page is not reloaded and the bet is cashed out - it can not be opened unless a tab switch will be made
            if (this.cycleNumber % 20 === 0) {
                await bet365MyBetsPageHelper.clickOnFilterBets('Settled');

                durationMeasureTool.addAction('CLICKED_SETTLED');
            }

            await bet365MyBetsPageHelper.clickOnFilterBets('All');

            durationMeasureTool.addAction('CLICKED_ALL');

            await bet365MyBetsPageHelper.waitForBetsContainerToAppear();

            durationMeasureTool.addAction('BETS_CONTAINER_APPEARED');

            await bet365MyBetsPageHelper.waitForBetItemsContainerToAppear();

            durationMeasureTool.addAction('BET_ITEMS_CONTAINER_APPEARED');

            await bet365MyBetsPageHelper.expandCollapsedBets(durationMeasureTool);

            durationMeasureTool.addAction('EXPANDED_COLLAPSED');

            const allBetsInnerHtml = await bet365MyBetsPageHelper.getAllBetsHtmlOnThePage();

            durationMeasureTool.addAction('GOT_ALL_BETS_HTML');

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
            const settledBets = [];
            const settledCashOutBets = [];

            Array.from(betItems).forEach((betElement) => {
                const className = betElement.attribs.class || '';

                if (className.includes('myb-OpenBetItem')) {
                    const extractor = new OpenBetDataExtractor(betElement);
                    const betData = extractor.extractBetData();

                    if (betData) {
                        openBets.push(betData);
                    }
                } else if (className.includes('myb-SettledBetItem')) {
                    const extractor = new SettledBetDataExtractor(betElement);
                    const betData = extractor.extractBetData();

                    if (betData) {
                        if (betData.cashedOut) {
                            settledCashOutBets.push(betData);
                        } else {
                            settledBets.push(betData);
                        }
                    }
                }
            });

            durationMeasureTool.addAction('END');

            const report = durationMeasureTool.report();

            logger.debug(`${this.cycleNumber}: Cycle end, report: ${JSON.stringify(_.omit(report, ['actions']))}`);

            this.decisionEngine.handleBets({ openBets, settledBets, settledCashOutBets, report });
        } catch (error) {
            durationMeasureTool.addAction('ERROR');

            const report = durationMeasureTool.report();

            logger.error(`${this.cycleNumber}: Cycle error - ${error.message}, report: ${JSON.stringify(_.omit(report, ['actions']))}`);

            if (error instanceof CustomBet365HelperError) {
                let timeoutOccurred = false;

                const captureScreenshot = async () => {
                    try {
                        const imageUint8Array = await this.page.screenshot({
                            type: 'jpeg',
                            quality: 95,
                            omitBackground: true,
                        });

                        if (!timeoutOccurred) {
                            error.addScreenshot(Buffer.from(imageUint8Array));
                        }
                    } catch (screenshotError) {
                        if (!timeoutOccurred) {
                            error.addScreenshotGrabError(screenshotError);
                        }
                    }
                };

                const timeout = new Promise((__, reject) => setTimeout(() => {
                    timeoutOccurred = true;

                    reject(new Error('Screenshot timeout exceeded'));
                }, 500));

                await Promise.race([captureScreenshot(), timeout])
                    .then(() => {
                        durationMeasureTool.addAction('SCREENSHOT_CAPTURED');
                    })
                    .catch((err) => {
                        durationMeasureTool.addAction('SCREENSHOT_ERROR');

                        error.addScreenshotGrabError(err);
                    });

                error.addReport(durationMeasureTool.report());
            }

            this.decisionEngine.handleError(error, durationMeasureTool.report());
        }
    }

    async _recreateMainPage() {
        try {
            // Close the current page if it exists
            if (this.page) {
                this.page = null;
            }

            const newPageToBeCreated = await this.browser.newPage();

            const pages = await this.browser.pages();

            // eslint-disable-next-line no-restricted-syntax
            for (const p of pages) {
                if (p !== newPageToBeCreated) {
                    await p.close().catch((error) => {
                        logger.error(`BET365_PAGE_WRAPPER_ERROR:: Failed to close page: ${error.message}`);
                    });
                }
            }

            await newPageToBeCreated.goto(this.bet365MyBetsPage, { timeout: 30000, waitUntil: 'load' });

            const client = await newPageToBeCreated.target().createCDPSession();
            await client.send('DOM.enable');
            await client.send('Overlay.enable');

            logger.info('Main page recreated successfully');

            this.page = newPageToBeCreated;
        } catch (error) {
            logger.error(`BET365_PAGE_WRAPPER_ERROR:: Failed to recreate main page: ${error.message}`);

            this.decisionEngine.handleError(new Error(`Failed to recreate main page: ${error.message}`));

            throw error;
        }
    }
}

module.exports = {
    Bet365PageWrapper,
};
