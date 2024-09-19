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

module.exports = {
    delay,
    retriebleAsyncOperationExecutor,
};
