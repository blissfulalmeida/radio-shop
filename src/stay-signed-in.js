const fs = require('fs');
const path = require('path');
const config = require('config');
const _ = require('lodash');
const puppeteer = require('puppeteer-core');
const { createLogger } = require('./components/logger');
const { OctoBrowserApi } = require('./services/octo-browser');

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
        const page = pages[0];

        const frames = await page.frames();

        logger.info(`FRAMES: There are ${frames.length} frames`);

        frames.forEach((frame, index) => {
            logger.info(`FRAME ${index}: ${frame.url()}`);
        });

        const realityCheckFrame = frames.find((frame) => frame.url().includes('members.bet365.es'));

        // const frameHtml = await realityCheckFrame.content();

        // fs.writeFileSync(path.join(__dirname, 'reality-check-frame.html'), frameHtml);

        if (realityCheckFrame) {
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
                    await page.mouse.move(
                        boundingBox.x + boundingBox.width / 2,
                        boundingBox.y + boundingBox.height / 2,
                    );
                    await page.mouse.down();
                    await page.mouse.up();

                    console.log('Button clicked as a human!');
                } else {
                    console.log("Failed to get the button's position.");
                }
            } else {
                console.log('No button found.');
            }
        } else {
            console.log('No reality check frame found.');
        }
    } catch (error) {
        logger.error(`INITIALIZATION_ERROR:: Failed to start application: ${error.message}`);

        process.exitCode = 1;

        setTimeout(() => {
            process.exit();
        }, 500);
    }
})();
