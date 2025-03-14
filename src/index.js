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
const { StorageCleaner } = require('./services/storage-cleaner');
const { ProxyManager } = require('./services/proxy-manager');
const { EventBus } = require('./services/event-bus');
const { ImageCleaner } = require('./services/image-cleaner');
const { GoogleSheetsService } = require('./services/google-sheets');

const logger = createLogger(module);

const validateConfig = () => {
    const requiredConfig = [
        'bet365.account',
        'octoBrowser.profileId',
        'telegram.botId',
        'telegram.chatId',
        'telegram.errorChatId',
        'googleSheets.spreadsheetId',
    ];

    const missingConfig = requiredConfig.filter((key) => !config.has(key));

    if (missingConfig.length) {
        throw new Error(`Missing required config keys: ${missingConfig.join(', ')}`);
    }
};

(async () => {
    try {
        validateConfig();

        logger.info('##########################################################');
        logger.info('#                                                        #');
        logger.info('# Starting application                                   #');
        logger.info('#                                                        #');
        logger.info('##########################################################');
        logger.info('');
        logger.info(`Partial config: ${JSON.stringify(_.omit(config, []))}`);

        const storageDirectory = path.resolve(__dirname, '..', 'db');
        fs.mkdirSync(storageDirectory, { recursive: true });

        const googleSheetsService = new GoogleSheetsService();
        const eventBus = new EventBus();
        const storage = new SimpleFileBasedStorage(path.resolve(storageDirectory, `${config.get('bet365.account')}.json`));
        const telegramNotifier = new TelegramNotifier();
        const proxyManager = new ProxyManager();
        const decisionEngine = new DecisionEngine(storage, telegramNotifier, proxyManager, eventBus, googleSheetsService);
        const octoBrowserApi = new OctoBrowserApi();
        const storageCleaner = new StorageCleaner(storage, config.get('storage.openBets.deleteAfterSeconds'));
        const imageCleaner = new ImageCleaner();

        await googleSheetsService.init()
            .catch((error) => {
                throw new Error(`Failed to connect to Google Sheets: ${error}`);
            });

        const currentOpenBets = storage.get('openBets') || [];

        logger.info(`Current open bets: ${JSON.stringify(currentOpenBets)}`);

        const isOctoRunning = await octoBrowserApi.checkOctoIsRunning();

        if (!isOctoRunning) {
            throw new Error('OctoBrowser is not running');
        }

        const neededProfileId = config.get('octoBrowser.profileId');

        const octoBrowserProfile = await octoBrowserApi.connectIfExistsCreateIfNot(neededProfileId);

        logger.info(`Connected to OctoBrowser with profile: ${JSON.stringify(octoBrowserProfile)}`);

        const bet365PageWrapper = new Bet365PageWrapper(octoBrowserProfile, decisionEngine, eventBus);

        await bet365PageWrapper.init();

        telegramNotifier.sendAppLaunchedMessage();

        storageCleaner.init();
        decisionEngine.init();
        imageCleaner.init();
    } catch (error) {
        logger.error(`INITIALIZATION_ERROR:: Failed to start application: ${error.message}`);

        process.exitCode = 1;

        setTimeout(() => {
            process.exit();
        }, 500);
    }
})();
