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

    /**
     * @returns {Promise<Profile[]>}
     */
    async listActiveProfiles() {
        try {
            logger.info('Listing active profiles');

            const response = await axios.get(`${this.baseUrl}/api/profiles/active`);

            return response.data;
        } catch (error) {
            throw new Error(`OCTO_BROWSER_ERROR:: Failed to list active profiles: ${formatOctoError(error)}`);
        }
    }

    async checkOctoIsRunning() {
        try {
            await this.listActiveProfiles();

            return true;
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

    async connectIfExistsCreateIfNot(profileId) {
        try {
            logger.info(`Connecting to profile with id: ${profileId}`);

            const activeProfiles = await this.listActiveProfiles();

            const profile = activeProfiles.find(({ uuid }) => uuid === profileId);

            if (profile) {
                return profile;
            }

            return this.startProfile(profileId);
        } catch (error) {
            if (error.response && error.response.status === 404) {
                return this.startProfile(profileId);
            }

            throw new Error(`OCTO_BROWSER_ERROR:: Failed to connect to profile: ${formatOctoError(error)}`);
        }
    }
}

module.exports = {
    OctoBrowserApi,
};
