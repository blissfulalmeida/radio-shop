const _ = require('lodash');
const moment = require('moment');
const { DecisionEngine } = require('../../../../../src/services/decision-engine');
const { CustomBet365HelperError } = require('../../../../../src/services/bet365-page-wrapper/errors');

describe('DecisionEngine', () => {
    const storageMock = {
        get: jest.fn(),
        set: jest.fn(),
    };
    const telegramNotifier = {
        sendLoggedOutMessage: jest.fn(),
        sendNewBetMessage: jest.fn(),
        sendErrorNotification: jest.fn(),
        sendCustomErrorNotification: jest.fn(),
    };

    it('calls storage correctly', () => {
        expect.assertions(4);

        /** @type { BetData[] } */
        const currentStorageItems = [];

        storageMock.get.mockReturnValueOnce(currentStorageItems);

        const decisionEngine = new DecisionEngine(storageMock, telegramNotifier);

        decisionEngine.handleOpenBets([]);

        expect(storageMock.get).toHaveBeenCalledTimes(1);
        expect(storageMock.get.mock.calls[0][0]).toBe('openBets');
        expect(storageMock.set).toHaveBeenCalledTimes(1);
        expect(storageMock.set.mock.calls[0][0]).toBe('openBets');
    });

    it('saves a single arrived bet', () => {
        expect.assertions(4);

        /** @type { BetData[] } */
        const currentStorageItems = [];

        storageMock.get.mockReturnValueOnce(currentStorageItems);

        const mockUTCTimestamp = '2023-01-01T00:00:00Z';
        jest.spyOn(moment, 'utc').mockReturnValue({
            toISOString: jest.fn()
                .mockReturnValueOnce(mockUTCTimestamp)
                .mockReturnValueOnce(mockUTCTimestamp),
        });

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

        decisionEngine.handleOpenBets(newBets);

        const updatedBets = storageMock.set.mock.calls[0][1];

        expect(updatedBets).toHaveLength(1);

        const savedBet = updatedBets[0];

        expect(_.omit(savedBet, 'metadata')).toStrictEqual(newBets[0]);
        expect(savedBet.metadata).toStrictEqual({
            firstSeenAt: mockUTCTimestamp,
            lastSeenAt: mockUTCTimestamp,
        });
        expect(telegramNotifier.sendNewBetMessage).toHaveBeenCalledTimes(1);
    });

    it('updates the last seen time of a single bet', () => {
        expect.assertions(2);

        const currentStorageItems = [
            {
                key: 'bet_key_one',
                stake: '0.10',
                side: 'Villarreal',
                market: 'Full Time Result',
                team1Name: 'Villarreal',
                team2Name: 'Las Palmas',
                odd: '1.50',
                metadata: {
                    firstSeenAt: '2023-01-01T00:00:00Z',
                    lastSeenAt: '2023-01-01T00:00:00Z',
                },
            },
        ];

        storageMock.get.mockReturnValueOnce(currentStorageItems);

        const mockUTCTimestamp = '2024-01-01T00:00:00Z';
        jest.spyOn(moment, 'utc').mockReturnValue({
            toISOString: jest.fn()
                .mockReturnValueOnce(mockUTCTimestamp),
        });

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

        decisionEngine.handleOpenBets(newBets);

        const updatedBets = storageMock.set.mock.calls[0][1];
        const savedBet = updatedBets[0];

        expect(savedBet.metadata.lastSeenAt).toStrictEqual(mockUTCTimestamp);
        expect(telegramNotifier.sendNewBetMessage).toHaveBeenCalledTimes(0);
    });

    it('adds two new bets and updates the last seen time of one bet', () => {
        expect.assertions(6);

        const currentStorageItems = [
            {
                key: 'bet_key_one',
                stake: '0.10',
                side: 'Villarreal',
                market: 'Full Time Result',
                team1Name: 'Villarreal',
                team2Name: 'Las Palmas',
                odd: '1.50',
                metadata: {
                    firstSeenAt: '2023-01-01T00:00:00Z',
                    lastSeenAt: '2023-01-01T00:00:00Z',
                },
            },
        ];

        storageMock.get.mockReturnValueOnce(currentStorageItems);

        const mockUTCTimestamp = '2024-01-01T00:00:00Z';
        jest.spyOn(moment, 'utc').mockReturnValue({
            toISOString: jest.fn()
                .mockReturnValueOnce(mockUTCTimestamp)
                .mockReturnValueOnce(mockUTCTimestamp)
                .mockReturnValueOnce(mockUTCTimestamp),
        });

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
            {
                key: 'bet_key_two',
                stake: '0.10',
                side: 'Villarreal',
                market: 'Full Time Result',
                team1Name: 'Villarreal',
                team2Name: 'Las Palmas',
                odd: '1.50',
            },
        ];

        decisionEngine.handleOpenBets(newBets);

        const updatedBets = storageMock.set.mock.calls[0][1];

        expect(updatedBets).toHaveLength(2);

        const bet1 = updatedBets[0];
        const bet2 = updatedBets[1];

        expect(bet1.key).toBe('bet_key_one');
        expect(bet2.key).toBe('bet_key_two');

        expect(bet1.metadata.lastSeenAt).toStrictEqual(mockUTCTimestamp);
        expect(bet2.metadata).toStrictEqual({
            firstSeenAt: mockUTCTimestamp,
            lastSeenAt: mockUTCTimestamp,
        });
        expect(telegramNotifier.sendNewBetMessage).toHaveBeenCalledTimes(1);
    });

    it('sends not custom error immediately', () => {
        expect.assertions(2);

        const decisionEngine = new DecisionEngine(storageMock, telegramNotifier);

        decisionEngine.handleError(new Error('Test error'));

        expect(telegramNotifier.sendErrorNotification).toHaveBeenCalledTimes(1);
        expect(telegramNotifier.sendErrorNotification).toHaveBeenCalledWith('Test error');
    });

    it('sends custom error after 2 minutes', () => {
        expect.assertions(3);

        jest.useFakeTimers();

        const decisionEngine = new DecisionEngine(storageMock, telegramNotifier);

        const customError = new CustomBet365HelperError('Test error', 'TEST_CODE');

        decisionEngine.handleError(customError);

        expect(telegramNotifier.sendCustomErrorNotification).toHaveBeenCalledTimes(0);

        jest.advanceTimersByTime(1000 * 60);

        expect(telegramNotifier.sendCustomErrorNotification).toHaveBeenCalledTimes(0);

        jest.advanceTimersByTime(1000 * 60 + 1);

        expect(telegramNotifier.sendCustomErrorNotification).toHaveBeenCalledTimes(1);
    });
});
