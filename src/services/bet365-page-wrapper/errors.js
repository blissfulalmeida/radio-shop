const BET365_PAGE_WRAPPER_ERROR = {
    FAILED_TO_RELOAD: 'FAILED_TO_RELOAD',
    FAILED_TO_WAIT_FOR_PAGE_HEADER: 'FAILED_TO_WAIT_FOR_PAGE_HEADER',
    FAILED_TO_CHECK_LOGGED_IN: 'FAILED_TO_CHECK_LOGGED_IN',
    FAILED_TO_WAIT_FOR_BETS_HEADER: 'FAILED_TO_WAIT_FOR_BETS_HEADER',
    FAILED_TO_CLICK_ON_ALL_BETS: 'FAILED_TO_CLICK_ON_ALL_BETS',
    FAILED_TO_WAIT_FOR_BETS_CONTAINER: 'FAILED_TO_WAIT_FOR_BETS_CONTAINER',
    FAILED_TO_CHECK_IF_EMPTY_BETS_CONTAINER_EXISTS: 'FAILED_TO_CHECK_IF_EMPTY_BETS_CONTAINER_EXISTS',
    FAILED_TO_WAIT_FOR_BET_ITEMS_CONTAINER: 'FAILED_TO_WAIT_FOR_BET_ITEMS_CONTAINER',
    FAILED_TO_EXPAND_COLLAPSED_BETS: 'FAILED_TO_EXPAND_COLLAPSED_BETS',
    FAILED_TO_GET_ALL_BETS_HTML_ON_THE_PAGE: 'FAILED_TO_GET_ALL_BETS_HTML_ON_THE_PAGE',
};

class CustomBet365HeplerError extends Error {
    constructor(message, code) {
        super(message);

        this.code = code;
    }
}

module.exports = {
    BET365_PAGE_WRAPPER_ERROR,
    CustomBet365HeplerError,
};