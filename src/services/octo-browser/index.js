const axios = require('axios').default;
const config = require('config');
const _ = require('lodash');
const { createLogger } = require('../../components/logger');

const logger = createLogger(module);

const formatOctoError = (error) => {
    if (error.response) {
        return JSON.stringify(_.get(error, 'response.data', {}));
    }

    return error.message;
};

class OctoBrowserApi {
    constructor() {
        this.baseUrl = config.get('octoBrowser.baseUrl');
    }

    async checkOctoIsRunning() {
        try {
            logger.info('Checking if OctoBrowser is running');

            const response = await axios.get(`${this.baseUrl}/api/profiles/active`);

            return response.status === 200;
        } catch (error) {
            return false;
        }
    }

    /**
     * @param {string} profileId
     * @returns {Promise<Profile>}
     */
    async startProfile(profileId) {
        try {
            logger.info(`Starting profile with id: ${profileId}`);

            const response = await axios({
                method: 'post',
                url: `${this.baseUrl}/api/profiles/start`,
                data: {
                    uuid: profileId,
                    headless: false,
                    debug_port: true,
                },
            });

            return response.data;
        } catch (error) {
            throw new Error(`OCTO_BROWSER_ERROR:: Failed to start profile: ${formatOctoError(error)}`);
        }
    }
}

module.exports = {
    OctoBrowserApi,
};
