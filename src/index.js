const config = require('config');
const _ = require('lodash');
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
    } catch (error) {
        logger.error(`INITIALIZATION_ERROR:: Failed to start application: ${error.message}`);

        process.exitCode = 1;

        setTimeout(() => {
            process.exit();
        }, 500);
    }
})();
