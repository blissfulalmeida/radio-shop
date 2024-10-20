const config = require('config');
const axios = require('axios');

const logger = console;

class NotificationService {
    async send(message) {
        axios({
            method: 'post',
            url: 'https://api.pushover.net/1/messages.json',
            data: {
                user: 'gsjco4zei16113pfx5sr27iyvg5koc',
                token: 'a3hho1hetck7673osy6e7opc8tvtrw',
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

// axios({
//     method: 'post',
//     url: 'https://api.pushover.net/1/messages.json',
//     data: {
//         user: config.get('pushover.user'),
//         token: config.get('pushover.token'),
//         message,
//         sound: 'Bigfoot',
//         priority: 2,
//         retry: 30,
//         expire: 360,
//     },
//     headers: {
//         'Content-Type': 'application/json',
//     },
// })
//     .then(() => { logger.info('TELEGRAM_NOTIFIER: Call made'); })
//     .catch((error) => { logger.error(`TELEGRAM_NOTIFIER:: Failed to make call: ${error.message}`); });

function testNotification() {
    const notificationService = new NotificationService();

    notificationService.send("It's cooking time!");
}

testNotification();
