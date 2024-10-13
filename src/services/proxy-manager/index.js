const config = require('config');
const axios = require('axios').default;
const { createLogger } = require('../../components/logger');

const logger = createLogger(module);

class ProxyManager {
    async reloadProxy() {
        const prixyReloadResponse = await axios({
            method: 'get',
            url: config.get('proxy.reloadUrl'),
        })
            .then((response) => ({ status: 'success', res: response.data }))
            .catch((error) => ({ status: 'error', error: error.message }));

        logger.info(`PROXY_MANAGER: Proxy reloaded: ${JSON.stringify(prixyReloadResponse)}`);

        return prixyReloadResponse;
    }
}

module.exports = {
    ProxyManager,
};
