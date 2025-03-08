const path = require('path');
const config = require('config');
const { google } = require('googleapis');
const { createLogger } = require('../../components/logger');

const logger = createLogger(module);

class GoogleSheetsService {
    /**
     * @param {import('../telegram-notifier').TelegramNotifier} telegramNotifier
     */
    constructor(telegramNotifier) {
        this.telegramNotifier = telegramNotifier;

        this.auth = null;
        this.spreadsheetId = config.get('googleSheets.spreadsheetId');

        /**
         * @type {BetData[][]}
         */
        this.betsBuffer = [];
        this.isUploading = false;
    }

    async init() {
        try {
            this.auth = new google.auth.GoogleAuth({
                keyFile: path.resolve(__dirname, '..', '..', '..', 'google-sa.json'),
                scopes: ['https://www.googleapis.com/auth/spreadsheets'],
            });

            const sheets = google.sheets({ version: 'v4', auth: this.auth });

            const response = await sheets.spreadsheets.get({ spreadsheetId: this.spreadsheetId })
                .catch((error) => {
                    throw new Error(`Error getting spreadsheet "${this.spreadsheetId}" from Google Sheets: ${error}`);
                });

            const sheetExists = response.data.sheets.some((sheet) => sheet.properties.title === config.get('bet365.account'));

            if (!sheetExists) {
                logger.info(`Creating sheet "${config.get('bet365.account')}" in Google Sheets as it doesn't exist`);

                await sheets.spreadsheets.batchUpdate({
                    spreadsheetId: this.spreadsheetId,
                    resource: {
                        requests: [
                            {
                                addSheet: {
                                    properties: {
                                        title: config.get('bet365.account'),
                                    },
                                },
                            },
                        ],
                    },
                }).catch((error) => {
                    throw new Error(`Error creating sheet "${config.get('bet365.account')}" in Google Sheets: ${error}`);
                });

                // possible to fill the cell with a color
                await sheets.spreadsheets.values.append({
                    spreadsheetId: this.spreadsheetId,
                    range: `${config.get('bet365.account')}!A:A`,
                    valueInputOption: 'RAW',
                    requestBody: {
                        values: [['Account', 'Date', 'Key', 'Team 1', 'Team 2', 'Market', 'Side', 'Stake', 'Odd', 'Return']],
                    },
                }).catch((error) => {
                    throw new Error(`Error adding first row to sheet "${config.get('bet365.account')}" in Google Sheets: ${error}`);
                });
            } else {
                logger.info(`Sheet "${config.get('bet365.account')}" already exists in Google Sheets`);
            }
        } catch (error) {
            throw new Error(`Error initializing Google Sheets service: ${error}`);
        }
    }

    async saveBets(betsData) {
        this.betsBuffer.push(betsData);

        this._tryTriggerBetsUpload();
    }

    _tryTriggerBetsUpload() {
        if (this.isUploading) {
            return;
        }

        if (this.betsBuffer.length === 0) {
            return;
        }

        this._triggerBetsUpload();
    }

    async _triggerBetsUpload() {
        try {
            const betsData = this.betsBuffer.shift();

            if (!betsData) {
                return;
            }

            this.isUploading = true;

            logger.info(`Saving ${betsData.length} settled bets to Google Sheets`);

            const sheets = google.sheets({ version: 'v4', auth: this.auth });

            await sheets.spreadsheets.values.append({
                spreadsheetId: this.spreadsheetId,
                range: `${config.get('bet365.account')}!A:A`,
                valueInputOption: 'RAW',
                requestBody: {
                    values: betsData.map((betData) => [
                        config.get('bet365.account'),
                        betData.metadata.firstSeenAt,
                        betData.key,
                        betData.team1Name,
                        betData.team2Name,
                        betData.market,
                        betData.side,
                        betData.stake,
                        betData.odd,
                        betData.return,
                    ]),
                },
            });

            logger.info('Settled bets saved to Google Sheets');
        } catch (error) {
            logger.error(`SERVICE_ERROR: Error saving settled bets to Google Sheets: ${error}`);

            this.telegramNotifier.sendUnknownErrorMessage('', `SERVICE_ERROR: Error saving settled bets to Google Sheets: ${error}`)
                .catch((tgMessageSendingError) => {
                    logger.error(`SERVICE_ERROR: Error sending unknown error message to Telegram: ${tgMessageSendingError}`);
                });
        } finally {
            this.isUploading = false;

            this._tryTriggerBetsUpload();
        }
    }
}

module.exports = {
    GoogleSheetsService,
};
