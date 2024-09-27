module.exports = {
    logLevel: 'info',
    octoBrowser: {
        baseUrl: 'http://localhost:58888',
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
};
