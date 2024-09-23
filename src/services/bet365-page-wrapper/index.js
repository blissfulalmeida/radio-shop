const fs = require('fs');
const path = require('path');
const moment = require('moment');
const config = require('config');
const puppeteer = require('puppeteer-core');
const { createLogger } = require('../../components/logger');
const { Bet365MyBetsPageHelper } = require('./bet365-my-bets-helper');

const logger = createLogger(module);

const BET_365_STATE = {
    IDLE: 'IDLE',
    READY: 'READY',
    LOGGED_OUT: 'LOGGED_OUT',
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

            await this.page.goto(this.bet365MyBetsPage, { timeout: 30000, waitUntil: 'domcontentloaded' });

            this._changeState(BET_365_STATE.READY);
            this._startRealityCheckSolvingLoop();
            this._startDataCrawlingLoop();
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
            await this._executeAsyncJob(() => this._executePageAction()
                .catch((error) => {
                    logger.error(`BET365_PAGE_WRAPPER_ERROR:: Failed to poll ${this.cycleNumber}: ${error.message}`);
                }));
        } finally {
            setTimeout(() => {
                this._dataCrawlingTick();
            }, 1000 * 60 * 5);
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

    _changeState(newState) {
        logger.info(`Changing state from ${this.state} to ${newState}`);

        this.state = newState;
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

    async _executePageAction() {
        try {
            this.cycleNumber += 1;

            logger.info(`${this.cycleNumber}: Starting new cycle`);

            const bet365MyBetsPageHelper = new Bet365MyBetsPageHelper(this.page, this.bet365MyBetsPage);

            await bet365MyBetsPageHelper.goToPage();

            logger.info(`${this.cycleNumber}: Page reloaded`);

            await bet365MyBetsPageHelper.waitForPageHeaderToAppear();

            const loggedIn = await bet365MyBetsPageHelper.checkLoggedIn();

            logger.info(`${this.cycleNumber}: Logged in: ${loggedIn ? 'YES' : 'NO'}`);

            if (!loggedIn) {
                // Do not send message if the state has not changed
                if (this.state !== BET_365_STATE.LOGGED_OUT) {
                    this._changeState(BET_365_STATE.LOGGED_OUT);

                    this.telegramNotifier.sendLoggedOutMessage();
                }

                return;
            }

            await bet365MyBetsPageHelper.waitForBetsHeaderToAppear();

            logger.info(`${this.cycleNumber}: Bets header appeared`);

            await bet365MyBetsPageHelper.clickOnAllBets();

            logger.info(`${this.cycleNumber}: Clicked on all bets`);

            await bet365MyBetsPageHelper.waitForBetsContainerToAppear();

            logger.info(`${this.cycleNumber}: Bets container appeared`);

            const noBetsContainerExists = await bet365MyBetsPageHelper.checkIfEmptyBetsContainerExists();

            logger.info(`${this.cycleNumber}: No bets container visible: ${noBetsContainerExists ? 'YES' : 'NO'}`);

            if (noBetsContainerExists) {
                logger.info(`${this.cycleNumber}: No bets found`);

                return;
            }

            await bet365MyBetsPageHelper.waitForBetItemsContainerToAppear();

            logger.info(`${this.cycleNumber}: Bet items container appeared`);

            await bet365MyBetsPageHelper.expandCollapsedBets();

            logger.info(`${this.cycleNumber}: Expanded collapsed bets`);

            const allBetsInnerHtml = await bet365MyBetsPageHelper.getAllBetsHtmlOnThePage();

            const fileName = `bets-${moment.utc().toISOString()}.html`;

            fs.writeFileSync(path.resolve(__dirname, '..', '..', '..', 'crawled', fileName), allBetsInnerHtml);

            logger.info(`${this.cycleNumber}: Saved all bets to ${fileName}`);
        } catch (error) {
            throw new Error(`BET365_PAGE_WRAPPER_ERROR:: Failed to execute page action: ${error.message}`);
        }
    }
}

module.exports = {
    Bet365PageWrapper,
};
