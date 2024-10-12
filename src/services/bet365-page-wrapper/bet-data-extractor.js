const cheerio = require('cheerio');
const { createLogger } = require('../../components/logger');

const logger = createLogger(module);

class OpenBetDataExtractor {
    constructor(betElement) {
        this.betElement = betElement;
    }

    /**
     * @returns {BetData}
     */
    extractBetData() {
        try {
            const $ = cheerio.load(this.betElement);
            const betDict = {};

            betDict.stake = $(this.betElement).find('.myb-OpenBetItem_StakeDesc').text().trim();

            const sides = $(this.betElement).find('.myb-BetParticipant_ParticipantSpan');
            if (sides.length === 2) {
                betDict.side = `${sides.eq(0).text().trim()}, ${sides.eq(1).text().trim()}`;
            } else {
                betDict.side = sides.eq(0).text().trim();
            }

            const markets = $(this.betElement).find('.myb-BetParticipant_MarketDescription');
            if (markets.length === 2) {
                betDict.market = `${markets.eq(0).text().trim()}, ${markets.eq(1).text().trim()}`;
            } else {
                betDict.market = markets.eq(0).text().trim();
            }

            const team1Name = $(this.betElement).find('div[class*="_Team1Name"]');

            if (team1Name.length) {
                betDict.team1Name = team1Name.text().trim();
            }

            const team2Name = $(this.betElement).find('div[class*="_Team2Name"]');

            if (team2Name.length) {
                betDict.team2Name = team2Name.text().trim();
            }

            const odds = $(this.betElement).find('.myb-BetParticipant_HeaderOdds');

            if (odds.length === 2) {
                betDict.odd = `${odds.eq(0).text().trim()}, ${odds.eq(1).text().trim()}`;
            } else {
                betDict.odd = odds.eq(0).text().trim();
            }

            if (betDict.stake === '' || betDict.side === '' || betDict.market === '') {
                return null;
            }

            betDict.key = this.getKey(betDict);

            return betDict;
        } catch (error) {
            const $ = cheerio.load(this.betElement);
            const betHtml = $.html(this.betElement);

            logger.error(`OPEN_BET_DATA_EXTRACTION_ERROR:: Failed to extract bet data: ${error.message}. Bet HTML: ${betHtml}`);

            return null;
        }
    }

    /**
     * @param {BetData} betData
     */
    getKey(betData) {
        return `${betData.team1Name || '-'}:::${betData.team2Name || '-'}:::${betData.market || '-'}:::${betData.side || '-'}:::${betData.stake || '-'}:::${betData.odd || '-'}`;
    }
}

class SetteledBetDataExtractor {
    constructor(betElement) {
        this.betElement = betElement;
    }

    /**
     * @returns {BetData}
     */
    extractBetData() {
        try {
            const $ = cheerio.load(this.betElement);
            const betDict = {};

            betDict.stake = $(this.betElement).find('.mye-StakeDisplay_StakeWrapper').text().trim();

            const sides = $(this.betElement).find('.myb-BetParticipant_ParticipantSpan');
            if (sides.length === 2) {
                betDict.side = `${sides.eq(0).text().trim()}, ${sides.eq(1).text().trim()}`;
            } else {
                betDict.side = sides.eq(0).text().trim();
            }

            const markets = $(this.betElement).find('.myb-BetParticipant_MarketDescription');
            if (markets.length === 2) {
                betDict.market = `${markets.eq(0).text().trim()}, ${markets.eq(1).text().trim()}`;
            } else {
                betDict.market = markets.eq(0).text().trim();
            }

            const team1Name = $(this.betElement).find('div[class*="_Team1Name"]');

            if (team1Name.length) {
                betDict.team1Name = team1Name.text().trim();
            }

            const team2Name = $(this.betElement).find('div[class*="_Team2Name"]');

            if (team2Name.length) {
                betDict.team2Name = team2Name.text().trim();
            }

            const odds = $(this.betElement).find('.myb-BetParticipant_HeaderOdds');

            if (odds.length === 2) {
                betDict.odd = `${odds.eq(0).text().trim()}, ${odds.eq(1).text().trim()}`;
            } else {
                betDict.odd = odds.eq(0).text().trim();
            }

            betDict.key = this.getKey(betDict);

            betDict.cashedOut = $(this.betElement).text().includes('Cashed Out') || false;

            if (betDict.stake === '' || betDict.side === '' || betDict.market === '') {
                return null;
            }

            return betDict;
        } catch (error) {
            const $ = cheerio.load(this.betElement);
            const betHtml = $.html(this.betElement);

            logger.error(`OPEN_BET_DATA_EXTRACTION_ERROR:: Failed to extract bet data: ${error.message}. Bet HTML: ${betHtml}`);

            return null;
        }
    }

    /**
     * @param {BetData} betData
     */
    getKey(betData) {
        return `${betData.team1Name || '-'}:::${betData.team2Name || '-'}:::${betData.market || '-'}:::${betData.side || '-'}:::${betData.stake || '-'}:::${betData.odd || '-'}:::${(betData.cashedOut && 'cashed-out') || '-'}`;
    }
}

module.exports = {
    OpenBetDataExtractor,
    SetteledBetDataExtractor,
};
