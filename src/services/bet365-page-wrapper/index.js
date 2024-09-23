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
            this._startIntervaledFramesPolling();
        } catch (error) {
            throw new Error(`BET365_PAGE_WRAPPER_ERROR:: Failed to init: ${error.message}`);
        }
    }

    _startIntervaledFramesPolling() {
        setInterval(async () => {
            try {
                const frames = await this.page.frames();

                logger.info(`FRAMES: There are ${frames.length} frames`);

                if (frames.length > 1) {
                    frames.forEach((frame, index) => {
                        logger.info(`Frame ${index}: ${frame.url()}`);
                    });
                }
            } catch (error) {
                logger.error(`FRAMES_ERROR:: Failed to poll frames: ${error.message}`);
            }
        }, 1000 * 10);
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
            }, 1000 * 60 * 5);
        }
    }

    _changeState(newState) {
        logger.info(`Changing state from ${this.state} to ${newState}`);

        this.state = newState;
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
