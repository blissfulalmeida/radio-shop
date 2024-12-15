const fs = require('fs');
const path = require('path');
const config = require('config');
const moment = require('moment');
const { createLogger } = require('../../components/logger');

const logger = createLogger(module);

class ImageCleaner {
    constructor() {
        this.screenshotsImagesDir = null;
    }

    init() {
        this.screenshotsImagesDir = path.resolve(__dirname, '..', '..', '..', 'screenshots', config.get('bet365.account'));

        this._cleanTick();
    }

    async _cleanTick() {
        try {
            await this._clean();
        } catch (error) {
            logger.error('Error while cleaning images:', error);
        } finally {
            setTimeout(() => {
                this._cleanTick();
            }, 1000 * 60 * 30);
        }
    }

    async _clean() {
        const startTime = Date.now();

        try {
            logger.info('Cleaning images...');

            const files = await fs.promises.readdir(this.screenshotsImagesDir);

            const now = Date.now();
            const twelveHoursAgo = moment(now).subtract(12, 'hours');

            // eslint-disable-next-line no-restricted-syntax
            for (const file of files) {
                const filePath = path.join(this.screenshotsImagesDir, file);

                try {
                    const fileWithoutExtension = file.split('.').slice(0, -1).join('.');
                    const fileCreationTime = moment.utc(fileWithoutExtension, 'YYYY-MM-DD-HH-mm-ss');

                    if (fileCreationTime.isBefore(twelveHoursAgo)) {
                        await fs.promises.unlink(filePath);

                        logger.debug(`Deleted old file: ${file}`);
                    }
                } catch (err) {
                    logger.error(`Error processing file ${file}:`, err);
                }
            }
        } catch (error) {
            logger.error('Error while cleaning images:', error);
        } finally {
            logger.info(`Cleaning images done in ${Date.now() - startTime}ms`);
        }
    }
}

module.exports = {
    ImageCleaner,
};
