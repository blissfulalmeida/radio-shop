const config = require('config');
const axios = require('axios');

const logger = console;

class NotificationService {
    async send(message) {
        axios({
            method: 'post',
            url: 'https://api.pushover.net/1/messages.json',
            data: {
                token: config.get('pushover.token'),
                user: config.get('pushover.user'),
                message,
                sound: 'Bigfoot',
                priority: 2,
                retry: 30,
                expire: 360,
            },
            headers: {
                'Content-Type': 'application/json',
            },
        })
            .then(() => { logger.info('TELEGRAM_NOTIFIER: Call made'); })
            .catch((error) => { logger.error(`TELEGRAM_NOTIFIER:: Failed to make call: ${error.message}`); });
    }
}

function testNotification() {
    const notificationService = new NotificationService();

    notificationService.send(`#sorrentino36
New bet:
Team 1: SK Unicov
Team 2: FK Hodonin
Market: 1st Half Goals
Side: Over 1.5
Stake: €357.14
Odd: 2.75`);
}

testNotification();
