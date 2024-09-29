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

const repeatedAsyncOperationExecutor = async ({
    operation,
    predicate,
    timeout,
    attempts,
}) => {
    let lastError = null;
    let counter = 0;

    while (counter !== attempts) {
        try {
            const res = await operation();

            if (predicate(res)) {
                return res;
            }
        } catch (err) {
            lastError = err;
        }

        await delay(timeout);

        counter += 1;
    }

    throw lastError === null ? new Error('RepeatedAsyncOperationExecutor attempts exceeded') : lastError;
};

const beautifyHTML = (textHTML) => beautify(textHTML, { end_with_newline: true, inline: [] });

const seconds = (ms) => ms * 1000;
const minutes = (ms) => seconds(ms) * 60;

module.exports = {
    delay,
    retriebleAsyncOperationExecutor,
    repeatedAsyncOperationExecutor,
    beautifyHTML,
    seconds,
    minutes,
};
