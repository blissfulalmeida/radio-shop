/* eslint-disable no-continue */
/* eslint-disable no-restricted-syntax */
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const { OpenBetDataExtractor } = require('../src/services/bet365-page-wrapper/bet-data-extractor');

const main = async () => {
    try {
        const crawledDir = path.join(__dirname, '..', 'crawled');
        const crawledDirEntries = fs.readdirSync(crawledDir);
        crawledDirEntries.sort();

        const actionsLog = [];
        let currentOpenBets = [];

        for (const crawledDirEntry of crawledDirEntries) {
            const crawledDirEntryPath = path.join(crawledDir, crawledDirEntry);
            const files = fs.readdirSync(crawledDirEntryPath);

            files.sort();

            const openBets = [];

            for (const file of files) {
                const filePath = path.join(crawledDirEntryPath, file);
                const fileContent = fs.readFileSync(filePath, 'utf8');

                const $ = cheerio.load(fileContent);
                const betItems = $('.myb-SettledBetItem, .myb-OpenBetItem');

                if (betItems.length !== 1) {
                    console.log('NOT_SINGLE_BET:', filePath);

                    continue;
                }

                const betItem = Array.from(betItems)[0];

                const classList = $(betItem).attr('class').split(' ');

                if (classList.includes('myb-OpenBetItem')) {
                    const extractor = new OpenBetDataExtractor(betItem);
                    const data = extractor.extractBetData();

                    if (data === null) {
                        console.log('EXTRACTION_FAILED:', filePath);

                        continue;
                    }

                    openBets.push(data);
                }
            }

            const added = [];
            const removed = [];

            for (const bet of openBets) {
                const betWasAlreadySeen = currentOpenBets.some((currentBet) => currentBet.key === bet.key);

                if (!betWasAlreadySeen) {
                    added.push(bet);
                }
            }

            for (const currentBet of currentOpenBets) {
                const betIsStillOpen = openBets.some((bet) => bet.key === currentBet.key);

                if (!betIsStillOpen) {
                    removed.push(currentBet);
                }
            }

            currentOpenBets = openBets;

            if (added.length > 0 || removed.length > 0) {
                actionsLog.push({
                    date: crawledDirEntry,
                    added,
                    removed,
                });
            }

            console.log('Processed:', crawledDirEntry);
        }

        fs.writeFileSync(path.join(__dirname, 'actions-log.json'), JSON.stringify(actionsLog, null, 4));
    } catch (error) {
        console.error(error);

        process.exit(1);
    }
};

main()
    .catch(console.error);
