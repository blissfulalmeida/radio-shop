const { minutes } = require('../../components/util');

const SEND_INACTIVITY_NOTIFICATION_AFTER_MINUTES = 3;

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
        }, minutes(SEND_INACTIVITY_NOTIFICATION_AFTER_MINUTES));
    }

    fireInactivityNotification() {
        this.telegramNotifier.sendInactivityMessage(SEND_INACTIVITY_NOTIFICATION_AFTER_MINUTES);
    }
}

module.exports = {
    InactivityErrorHandler,
};
