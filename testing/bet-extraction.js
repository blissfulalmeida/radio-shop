const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const { OpenBetDataExtractor, SetteledBetDataExtractor } = require('../src/services/bet365-page-wrapper/bet-data-extractor');

const html = fs.readFileSync(path.resolve(__dirname, '..', 'crawled', 'bets-2024-10-12-06-25-59', '0.html'), 'utf8');
const $ = cheerio.load(html);

const betItems = $('div.myb-OpenBetItem, div.myb-SettledBetItem');

const openBets = [];
const settledBets = [];

Array.from(betItems).forEach((betElement) => {
    const className = betElement.attribs.class || '';

    if (className.includes('myb-OpenBetItem')) {
        const extractor = new OpenBetDataExtractor(betElement);
        const betData = extractor.extractBetData();

        if (betData) {
            openBets.push(betData);
        } else {
            console.log('Failed to extract bet data');
        }
    } else if (className.includes('myb-SettledBetItem')) {
        const extractor = new SetteledBetDataExtractor(betElement);
        const betData = extractor.extractBetData();

        if (betData) {
            settledBets.push(betData);
        } else {
            console.log('Failed to extract bet data');
        }
    }
});

console.log(JSON.stringify(openBets, null, 4));
console.log(JSON.stringify(settledBets, null, 4));
