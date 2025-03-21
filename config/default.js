module.exports = {
    logLevel: 'debug',
    fileLogLevel: 'info',
    octoBrowser: {
        baseUrl: 'http://127.0.0.1:58888',
    },
    bet365: {
        myBetsPage: 'https://www.bet365.es/#/MB/',
        saveHtml: false,
    },
    storage: {
        openBets: {
            cleaningInterval: 1000 * 60 * 5,
            deleteAfterSeconds: 60 * 60 * 24 * 7,
        },
    },
    call: {
        shouldBeInitiated: true,
    },
    maxCycleDuration: 1000 * 15,
    bet365PageReloadIntervalSeconds: 60 * 10,
    cycleDurationExceededNotificationIntervalSeconds: 60 * 5,
    unknownErrorNotificationIntervalSeconds: 60 * 5,
    customErrorNotificationIntervalSeconds: 60 * 2,
    googleSheets: {
        spreadsheetId: '1CnBxc5xWbyoyXaEKCCcLNL6Jn9hzxq2SNDKHtyctZsM',
    },
};
