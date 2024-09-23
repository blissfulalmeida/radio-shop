const beautify = require('js-beautify').html;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const retriebleAsyncOperationExecutor = async ({ operation, maxRetries = 3, delayBetweenRetries = 1000 }) => {
    let retries = 0;

    while (retries < maxRetries) {
        try {
            return await operation();
        } catch (error) {
            retries += 1;

            await delay(delayBetweenRetries);
        }
    }

    throw new Error('Failed to execute operation');
};

const beautifyHTML = (textHTML) => beautify(textHTML, { end_with_newline: true, inline: [] });

module.exports = {
    delay,
    retriebleAsyncOperationExecutor,
    beautifyHTML,
};
