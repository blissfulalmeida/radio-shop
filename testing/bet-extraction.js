const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const { OpenBetDataExtractor } = require('../src/services/bet365-page-wrapper/open-bet-data-extractor');

const html = fs.readFileSync(path.resolve(__dirname, '..', 'crawled-2', 'bets-2024-09-24T11:35:42.588Z.html'), 'utf8');
const $ = cheerio.load(html);

const betItems = $('div.myb-OpenBetItem, div.myb-SettledBetItem');

const openBets = [];

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
    }
});

console.log(JSON.stringify(openBets, null, 4));
