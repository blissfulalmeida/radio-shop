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

function extractBetData(betElement) {
    const betDict = {};

    // Extracting stake
    betDict.stake = betElement.find('.myb-OpenBetItem_StakeDesc').text().trim();

    // Extracting side (team names)
    const sides = betElement.find('.myb-BetParticipant_ParticipantSpan');
    if (sides.length === 2) {
        betDict.side = `${sides.eq(0).text().trim()}, ${sides.eq(1).text().trim()}`;
    } else {
        betDict.side = sides.eq(0).text().trim();
    }

    // Extracting market description
    const markets = betElement.find('.myb-BetParticipant_MarketDescription');
    if (markets.length === 2) {
        betDict.market = `${markets.eq(0).text().trim()}, ${markets.eq(1).text().trim()}`;
    } else {
        betDict.market = markets.eq(0).text().trim();
    }

    // Extracting fixture (match names)
    const fixtures = betElement.find('.myb-BetParticipant_FixtureName');
    if (fixtures.length === 2) {
        betDict.fixture = `${fixtures.eq(0).text().trim()}, ${fixtures.eq(1).text().trim()}`;
    } else {
        betDict.fixture = fixtures.eq(0).text().trim();
    }

    // Extracting odds
    const odds = betElement.find('.myb-BetParticipant_HeaderOdds');
    if (odds.length === 2) {
        betDict.odd = `${odds.eq(0).text().trim()}, ${odds.eq(1).text().trim()}`;
    } else {
        betDict.odd = odds.eq(0).text().trim();
    }

    // Extracting score, if available
    const score = betElement.find('.myb-OpenBetScores_Score');
    betDict.score = score.length ? score.text().trim() : '';

    // Extracting time, if available
    const time = betElement.find('.myb-OpenBetScores_InPlayTime');
    betDict.time = time.length ? time.text().trim() : '';

    return betDict;
}

// Example usage:
const html = fs.readFileSync(path.resolve(__dirname, '..', 'crawled', 'bets-2024-09-19T10:35:50.822Z.html'), 'utf8');
const $ = cheerio.load(html);
const betElements = $('.myb-OpenBetItem, .myb-SettledBetItem');

// iterate and print class lists
const data = Array.from(betElements).map((el) => {
    try {
        const $el = $(el);
        const classAttribute = $el.attr('class');

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

        return { status: 'error', reason: 'Unknown class list' };
    } catch (error) {
        return { status: 'error', reason: error.message };
    }
});

console.log(data);
