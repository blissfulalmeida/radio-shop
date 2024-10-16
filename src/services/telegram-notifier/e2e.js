const axios = require('axios');
const logger = console; // Using console as a logger for simplicity

class NotificationService {
    constructor(telegramBotId, telegramChatId, callWebHookUrl, callShouldBeInitiated) {
        this.telegramBotId = telegramBotId;
        this.telegramChatId = telegramChatId;
        this.callWebHookUrl = callWebHookUrl;
        this.callShouldBeInitiated = callShouldBeInitiated;
    }

    async _sendMainChannelTelegramMessage(message, makeCall = false) {
//        axios({
//            method: 'get',
//            url: `https://api.telegram.org/bot${this.telegramBotId}/sendMessage?chat_id=${this.telegramChatId}&text=${encodeURIComponent(message)}`,
//        })
//            .then(() => { logger.info('TELEGRAM_NOTIFIER: Message sent'); })
//            .catch((error) => { logger.error(`NOTIFIER_ERROR:: Failed to send main channel message - ${message}. Error - ${error.message}`); });

        // Prepare the payload for the second notification if required
        const payload = {
            token: "a3hho1hetck7673osy6e7opc8tvtrw", // Replace with your actual token
            user: "udzz53bo13vmrehmt6hdkujup5nzdy", // Replace with your actual user key
            message: message,                         // Message to send
            sound: "Bigfoot",                         // Sound for notification
            priority: 2,                              // Notification priority
            device: "clap",
            retry: 30,
            expire: 360
        };

        const callWebHookUrl = "https://api.pushover.net/1/messages.json";

        if (this.callShouldBeInitiated && makeCall) {
            axios({
                method: 'post',
                url: callWebHookUrl,
                data: payload,
                headers: {
                    'Content-Type': 'application/json'
                },
            })
                .then(() => { logger.info('TELEGRAM_NOTIFIER: Call made'); })
                .catch((error) => { logger.error(`TELEGRAM_NOTIFIER:: Failed to make call: ${error.message}`); });
        }
    }
}

// Function to trigger the test
function testNotification() {
    const telegramBotId = 'your_telegram_bot_id'; // Replace with your actual bot ID
    const telegramChatId = 'your_telegram_chat_id'; // Replace with your actual chat ID
    const callWebHookUrl = 'your_call_webhook_url'; // Replace with your actual webhook URL
    const callShouldBeInitiated = true; // Set to true to test the call sending

    const notificationService = new NotificationService(telegramBotId, telegramChatId, callWebHookUrl, callShouldBeInitiated);

    // Call the method to send a test message and initiate notifications
    notificationService._sendMainChannelTelegramMessage("It's cooking time!", true);
}

// Execute the test
testNotification();
