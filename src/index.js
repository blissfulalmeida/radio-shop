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
        } else {
            logger.info('OctoBrowser is running');
        }
    } catch (error) {
        console.error(error);
    }
})();
