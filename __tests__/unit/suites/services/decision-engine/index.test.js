const _ = require('lodash');
const { DecisionEngine } = require('../../../../../src/services/decision-engine');

describe('DecisionEngine', () => {
    const storageMock = {
        get: jest.fn(),
        set: jest.fn(),
    };
    const telegramNotifier = {
        sendLoggedOutMessage: jest.fn(),
        sendNewBetMessage: jest.fn(),
    };

    it('calls storage correctly', () => {
        expect.assertions(4);

        /** @type { BetData[] } */
        const currentStorageItems = [];

        storageMock.get.mockReturnValueOnce(currentStorageItems);

        const decisionEngine = new DecisionEngine(storageMock, telegramNotifier);

        decisionEngine.handleFetchedOpenBets([]);

        expect(storageMock.get).toHaveBeenCalledTimes(1);
        expect(storageMock.get.mock.calls[0][0]).toBe('openBets');
        expect(storageMock.set).toHaveBeenCalledTimes(1);
        expect(storageMock.set.mock.calls[0][0]).toBe('openBets');
    });

    it('saves a single arrived bet', () => {
        expect.assertions(2);

        /** @type { BetData[] } */
        const currentStorageItems = [];

        storageMock.get.mockReturnValueOnce(currentStorageItems);

        const decisionEngine = new DecisionEngine(storageMock, telegramNotifier);

        const newBets = [
            {
                key: 'bet_key_one',
                stake: '0.10',
                side: 'Villarreal',
                market: 'Full Time Result',
                team1Name: 'Villarreal',
                team2Name: 'Las Palmas',
                odd: '1.50',
            },
        ];

        decisionEngine.handleFetchedOpenBets(newBets);

        const updatedBets = storageMock.set.mock.calls[0][1];

        expect(updatedBets).toHaveLength(1);
        expect(_.omit(updatedBets[0], 'metadata')).toStrictEqual(newBets[0]);
    });
});
