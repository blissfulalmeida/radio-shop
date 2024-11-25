const { seconds } = require('../../components/util');

const SEND_INACTIVITY_NOTIFICATION_AFTER_SECONDS = 30;

class InactivityErrorHandler {
    /**
     * @param {import('../telegram-notifier').TelegramNotifier} telegramNotifier
     */
    constructor(telegramNotifier) {
        this.telegramNotifier = telegramNotifier;
    }

    init() {
        this.reenableInactivityTimeout();
    }

    clearInactivityTimeout() {
        if (this.inactivityTimeout) {
            clearTimeout(this.inactivityTimeout);
            this.inactivityTimeout = null;
        }
    }

    reenableInactivityTimeout() {
        this.clearInactivityTimeout();

        this.inactivityTimeout = setTimeout(() => {
            this.fireInactivityNotification();
            this.reenableInactivityTimeout();
        }, seconds(SEND_INACTIVITY_NOTIFICATION_AFTER_SECONDS));
    }

    fireInactivityNotification() {
        this.telegramNotifier.sendInactivityMessage(SEND_INACTIVITY_NOTIFICATION_AFTER_SECONDS);
    }
}

module.exports = {
    InactivityErrorHandler,
};
