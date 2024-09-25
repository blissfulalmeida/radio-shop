const path = require('path');
const fs = require('fs');
const config = require('config');
const _ = require('lodash');
const { createLogger } = require('./components/logger');
const { OctoBrowserApi } = require('./services/octo-browser');
const { Bet365PageWrapper } = require('./services/bet365-page-wrapper');
const { TelegramNotifier } = require('./services/telegram-notifier');
const { SimpleFileBasedStorage } = require('./services/storage');
const { DecisionEngine } = require('./services/decision-engine');

const logger = createLogger(module);

(async () => {
    try {
        logger.info(`Starting application. Partial config: ${JSON.stringify(_.omit(config))}`);

        const storageDirectory = path.resolve(__dirname, '', 'db');

        fs.mkdirSync(storageDirectory, { recursive: true });

        const storage = new SimpleFileBasedStorage(path.resolve(storageDirectory, 'data.json'));
        const telegramNotifier = new TelegramNotifier();
        const decisionEngine = new DecisionEngine(storage, telegramNotifier);
        const octoBrowserApi = new OctoBrowserApi();

        const isOctoRunning = await octoBrowserApi.checkOctoIsRunning();

        if (!isOctoRunning) {
            throw new Error('OctoBrowser is not running');
        }

        const neededProfileId = config.get('octoBrowser.profileId');

        const octoBrowserProfile = await octoBrowserApi.connectIfExistsCreateIfNot(neededProfileId);

        logger.info(`Connected to OctoBrowser with profile: ${JSON.stringify(octoBrowserProfile)}`);

        const bet365PageWrapper = new Bet365PageWrapper(octoBrowserProfile, decisionEngine);

        await bet365PageWrapper.init();

        telegramNotifier.sendAppLaunchedMessage();
    } catch (error) {
        logger.error(`INITIALIZATION_ERROR:: Failed to start application: ${error.message}`);

        process.exitCode = 1;

        setTimeout(() => {
            process.exit();
        }, 500);
    }
})();
