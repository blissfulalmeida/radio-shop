const axios = require('axios').default;
const config = require('config');

class OctoBrowserApi {
    constructor() {
        this.baseUrl = config.get('octoBrowser.baseUrl');
    }

    async checkOctoIsRunning() {
        try {
            const response = await axios.get(`${this.baseUrl}/api/profiles/active`);

            return response.status === 200;
        } catch (error) {
            return false;
        }
    }

    acrivateProfile(profileId) {

    }
}

module.exports = {
    OctoBrowserApi,
};
