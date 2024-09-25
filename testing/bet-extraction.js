const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

class SettledBetsCanonocalizer {
    constructor(cheerioNode) {
        this.cheerioNode = cheerioNode;
    }

    canonicalize() {
        return {

        };
    }
}

class OpenBetCanonicalizer {
    constructor(cheerioNode) {
        this.cheerioNode = cheerioNode;
    }

    canonicalize() {
        return {

        };
    }
}

const extractData = (cheerioElement) => {
    try {
        const classAttribute = el.attr('class');

        if (!classAttribute) {
            return { status: 'error', reason: 'No class attribute found' };
        }

        const splittedList = classAttribute.split(' ');

        const setteledItem = splittedList.includes('myb-SettledBetItem');
        const openItem = splittedList.includes('myb-OpenBetItem');

        if (setteledItem && !openItem) {
            const cannoicalData = new SettledBetsCanonocalizer($el).canonicalize();

            return { status: 'success', data: cannoicalData };
        } if (openItem && !setteledItem) {
            const canonicalData = new OpenBetCanonicalizer($el).canonicalize();

            return { status: 'success', data: canonicalData };
        }

        const betData = extractBetData($el);

        return { status: 'success', data: betData };
    } catch (error) {
        return { status: 'error', reason: error.message };
    }
};

/**
 * @param {cheerio.Cheerio<Element>} betElement
 */
function extractBetData(betElement) {
    const betDict = {};

    betDict.stake = betElement.find('.myb-OpenBetItem_StakeDesc').text().trim();

    const sides = betElement.find('.myb-BetParticipant_ParticipantSpan');
    if (sides.length === 2) {
        betDict.side = `${sides.eq(0).text().trim()}, ${sides.eq(1).text().trim()}`;
    } else {
        betDict.side = sides.eq(0).text().trim();
    }

    const markets = betElement.find('.myb-BetParticipant_MarketDescription');
    if (markets.length === 2) {
        betDict.market = `${markets.eq(0).text().trim()}, ${markets.eq(1).text().trim()}`;
    } else {
        betDict.market = markets.eq(0).text().trim();
    }

    const team1Name = betElement.find('.myb-BetParticipant_Team1Name');

    const odds = betElement.find('.myb-BetParticipant_HeaderOdds');
    if (odds.length === 2) {
        betDict.odd = `${odds.eq(0).text().trim()}, ${odds.eq(1).text().trim()}`;
    } else {
        betDict.odd = odds.eq(0).text().trim();
    }

    return betDict;
}

// Example usage:
const html = fs.readFileSync(path.resolve(__dirname, '..', 'crawled/bets-2024-09-24T13:12:51.909Z/0.html'), 'utf8');
const $ = cheerio.load(html);

console.log(extractBetData($('.myb-OpenBetItem')));
