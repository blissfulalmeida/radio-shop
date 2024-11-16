const fs = require('fs');
const path = require('path');
const config = require('config');
const axios = require('axios').default;
const FormData = require('form-data');

const sendPhotoToTelegram = async (botToken, chatId, caption, photoPath) => {
    const url = `https://api.telegram.org/bot${botToken}/sendPhoto`;

    try {
        // Create a FormData instance
        const form = new FormData();
        form.append('chat_id', chatId);
        form.append('caption', caption);
        form.append('photo', fs.readFileSync(photoPath), { filename: 'a' });

        // Send POST request
        const response = await axios.post(url, form, {
            headers: form.getHeaders(),
        });

        console.log('Screenshot sent to Telegram successfully:', response.data);
    } catch (error) {
        if (error.response) {
            console.error(`Error sending photo to Telegram: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
        } else {
            console.error(`Error sending photo to Telegram: ${error}`);
        }
    }
};

const botToken = config.get('telegram.botId');
const chatId = config.get('telegram.chatId');
const caption = 'Photo caption here';
const photoPath = path.resolve(__dirname, 'image.jpeg');

sendPhotoToTelegram(botToken, chatId, caption, photoPath);
