const fs = require('fs');
const { createLogger } = require('../../components/logger');

const logger = createLogger(module);

class SimpleFileBasedStorage {
    constructor(path) {
        this.dataFilePath = path;
    }

    _ensureDataFileExists() {
        try {
            fs.accessSync(this.dataFilePath, fs.constants.F_OK);
        } catch (err) {
            logger.info('Data file does not exist, creating it...');

            fs.writeFileSync(this.dataFilePath, '{}', 'utf8');
        }
    }

    _readData() {
        try {
            this._ensureDataFileExists();

            const rawData = fs.readFileSync(this.dataFilePath, 'utf8');

            return JSON.parse(rawData);
        } catch (err) {
            logger.error('Error reading data:', err);

            return {};
        }
    }

    _writeData(data) {
        try {
            this._ensureDataFileExists();

            const jsonData = JSON.stringify(data, null, 2);

            fs.writeFileSync(this.dataFilePath, jsonData, 'utf8');
        } catch (err) {
            logger.error('Error writing data:', err);
        }
    }

    get(key) {
        const data = this._readData();

        return data[key];
    }

    set(key, value) {
        const data = this._readData();

        data[key] = value;

        this._writeData(data);
    }

    delete(key) {
        const data = this._readData();

        delete data[key];

        this._writeData(data);
    }

    getAll() {
        return this._readData();
    }
}

module.exports = {
    SimpleFileBasedStorage,
};
