const BET365_PAGE_WRAPPER_ERROR = {
    FAILED_TO_RELOAD: 'FAILED_TO_RELOAD',
    FAILED_TO_WAIT_FOR_PAGE_HEADER: 'FAILED_TO_WAIT_FOR_PAGE_HEADER',
    FAILED_TO_CHECK_LOGGED_IN: 'FAILED_TO_CHECK_LOGGED_IN',
    FAILED_TO_WAIT_FOR_BETS_HEADER: 'FAILED_TO_WAIT_FOR_BETS_HEADER',
    FAILED_TO_CLICK_ON_BETS_SECTION: 'FAILED_TO_CLICK_ON_BETS_SECTION',
    FAILED_TO_WAIT_FOR_BETS_CONTAINER: 'FAILED_TO_WAIT_FOR_BETS_CONTAINER',
    FAILED_TO_WAIT_FOR_BET_ITEMS_CONTAINER: 'FAILED_TO_WAIT_FOR_BET_ITEMS_CONTAINER',
    FAILED_TO_EXPAND_COLLAPSED_BETS: 'FAILED_TO_EXPAND_COLLAPSED_BETS',
    FAILED_TO_GET_ALL_BETS_HTML_ON_THE_PAGE: 'FAILED_TO_GET_ALL_BETS_HTML_ON_THE_PAGE',
};

class CustomBet365HelperError extends Error {
    /**
     * @param {string} message
     * @param {string} code
     * @param {DurationMeasureToolReport} report
     */
    constructor(message, code) {
        super(message);

        this.code = code;

        this.screenshot = null;
        this.screenshotError = null;
        this.report = null;
    }

    /**
     * @param {Buffer} screenshot
     */
    addScreenshot(screenshot) {
        this.screenshot = screenshot;
    }

    /**
     * @param {Error} error
    */
    addScreenshotGrabError(error) {
        this.screenshotError = error;
    }

    /**
     * @param {DurationMeasureToolReport} report
     */
    addReport(report) {
        this.report = report;
    }
}

module.exports = {
    BET365_PAGE_WRAPPER_ERROR,
    CustomBet365HelperError,
};
