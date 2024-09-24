const config = require('config');
const _ = require('lodash');
const puppeteer = require('puppeteer-core');
const { createLogger } = require('../src/components/logger');
const { OctoBrowserApi } = require('../src/services/octo-browser');

const logger = createLogger(module);

(async () => {
    try {
        logger.info(`Starting application. Partial config: ${JSON.stringify(_.omit(config))}`);

        const octoBrowserApi = new OctoBrowserApi();

        const isOctoRunning = await octoBrowserApi.checkOctoIsRunning();

        if (!isOctoRunning) {
            throw new Error('OctoBrowser is not running');
        }

        const neededProfileId = config.get('octoBrowser.profileId');

        const octoBrowserProfile = await octoBrowserApi.connectIfExistsCreateIfNot(neededProfileId);

        logger.info(`Connected to OctoBrowser with profile: ${JSON.stringify(octoBrowserProfile)}`);

        const browser = await puppeteer.connect({
            browserWSEndpoint: octoBrowserProfile.ws_endpoint,
            defaultViewport: null,
        });

        const pages = await browser.pages();
        const neededPage = pages[0];

        neededPage.waitForSelector('.myb-BetItemsContainer_Container', { timeout: 30000 });

        logger.info('Bets container appeared');

        /** @type {puppeteer.ElementHandle<HTMLDivElement>[]} */
        const betElements = await neededPage.$$('div.myb-BetItemsContainer_Container > div.myb-OpenBetItem, div.myb-BetItemsContainer_Container > div.myb-SettledBetItem');

        // eslint-disable-next-line no-restricted-syntax
        for (const betElement of betElements) {
            // await betElement.screenshot({ path: 'bet.png' });
            const box = await betElement.boundingBox();

            await neededPage.screenshot({
                path: 'bet.png',
                clip: {
                    x: box.x,
                    y: box.y,
                    width: box.width,
                    height: box.height,
                },
            });
        }
    } catch (error) {
        logger.error(`INITIALIZATION_ERROR:: Failed to start application: ${error.message}`);

        process.exitCode = 1;

        setTimeout(() => {
            process.exit();
        }, 500);
    }
})();
