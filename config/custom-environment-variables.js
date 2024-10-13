module.exports = {
    logLevel: 'CB_LOG_LEVEL',
    octoBrowser: {
        baseUrl: 'CB_OCTOBROWSER_BASE_URL',
        profileId: 'CB_OCTOBROWSER_PROFILE_ID',
    },
    bet365: {
        account: 'CB_BET365_ACCOUNT',
        myBetsPage: 'CB_BET365_MY_BETS_PAGE',
        saveHtml: {
            __name: 'CB_BET365_SAVE_HTML',
            __format: 'boolean',
        },
    },
    telegram: {
        botId: 'CB_TELEGRAM_BOT_ID',
        chatId: 'CB_TELEGRAM_CHAT_ID',
        errorChatId: 'CB_TELEGRAM_ERROR_CHAT_ID',
    },
    call: {
        shouldBeInitiated: {
            __name: 'CB_CALL_SHOULD_BE_INITIATED',
            __format: 'boolean',
        },
        webHookUrl: 'CB_CALL_WEB_HOOK_URL',
    },
    proxy: {
        reloadUrl: 'CB_PROXY_RELOAD_URL',
    },
};
