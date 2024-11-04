const path = require('path');
const fs = require('fs');
const config = require('config');
const _ = require('lodash');
const puppeteer = require('puppeteer-core');
const FormData = require('form-data');
const axios = require('axios').default;

const { createLogger } = require('./components/logger');
const { OctoBrowserApi } = require('./services/octo-browser');

const logger = createLogger(module);

const validateConfig = () => {
    const requiredConfig = [
        'bet365.account',
        'octoBrowser.profileId',
        'telegram.botId',
        'telegram.chatId',
        'telegram.errorChatId',
    ];

    const missingConfig = requiredConfig.filter((key) => !config.has(key));

    if (missingConfig.length) {
        throw new Error(`Missing required config keys: ${missingConfig.join(', ')}`);
    }
};

(async () => {
    try {
        validateConfig();

        logger.info(`Starting application. Partial config: ${JSON.stringify(_.omit(config, []))}`);

        const storageDirectory = path.resolve(__dirname, '..', 'db');
        fs.mkdirSync(storageDirectory, { recursive: true });

        const octoBrowserApi = new OctoBrowserApi();

        const isOctoRunning = await octoBrowserApi.checkOctoIsRunning();

        if (!isOctoRunning) {
            throw new Error('OctoBrowser is not running');
        }

        const neededProfileId = config.get('octoBrowser.profileId');

        const octoBrowserProfile = await octoBrowserApi.connectIfExistsCreateIfNot(neededProfileId);

        const browser = await puppeteer.connect({
            browserWSEndpoint: octoBrowserProfile.ws_endpoint,
            defaultViewport: null,
        });

        const page = await browser.newPage();

        await page.goto('https://www.google.com');

        const imageBuffer = await page.screenshot({
            type: 'jpeg',
            quality: 50,
            omitBackground: true,
        });

        const sendPhotoToTelegram = async (botToken, chatId, caption, uint8Array) => {
            const url = `https://api.telegram.org/bot${botToken}/sendPhoto`;

            try {
                // Create a FormData instance
                const form = new FormData();
                form.append('chat_id', chatId);
                form.append('caption', caption);
                form.append('photo', Buffer.from(uint8Array), { filename: 'a' });

                // Send POST request
                const response = await axios.post(url, form, {
                    headers: form.getHeaders(),
                });

                console.log('Screenshot sent to Telegram successfully:', response.data);
            } catch (error) {
                if (error.response) {
                    console.error(`Error sending photo to Telegram: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
                } else {
                    console.error(`Error sending photo to Telegram: ${error}`);
                }
            }
        };

        const botToken = config.get('telegram.botId');
        const chatId = config.get('telegram.chatId');
        const caption = 'Photo caption here';

        await sendPhotoToTelegram(botToken, chatId, caption, imageBuffer);

        logger.info(`Connected to OctoBrowser with profile: ${JSON.stringify(octoBrowserProfile)}`);

        process.exit();
    } catch (error) {
        logger.error(`INITIALIZATION_ERROR:: Failed to start application: ${error.message}`);

        process.exitCode = 1;

        setTimeout(() => {
            process.exit();
        }, 500);
    }
})();
