const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const { beautifyHTML } = require('../src/components/util');

const plainHtmlText = fs.readFileSync(path.join(__dirname, '..', 'crawled-2', 'bets-2024-09-24T11:35:42.588Z.html'), 'utf8');
const $ = cheerio.load(plainHtmlText);
const bets = $('div.myb-OpenBetItem, div.myb-SettledBetItem');

Array.from(bets).forEach((betElement, index) => {
    const betHtml = $.html(betElement);
    const beautifiedBetHtml = beautifyHTML(betHtml);

    fs.writeFileSync(path.join(__dirname, `bet-${index}.beautified.html`), beautifiedBetHtml);
});
