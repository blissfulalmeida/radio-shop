const moment = require('moment');
const { StorageCleaner } = require('../../../../../src/services/storage-cleaner');

describe('DecisionEngine', () => {
    const storageMock = {
        get: jest.fn(),
        set: jest.fn(),
    };

    it('cleans storage correctly', () => {
        expect.assertions(5);

        const momentNow = moment.utc();

        /** @type { BetData[] } */
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
                    firstSeenAt: momentNow.clone().subtract(2, 'minutes').toISOString(),
                    lastSeenAt: momentNow.clone().subtract(2, 'minutes').toISOString(),
                },
            },
        ];

        storageMock.get.mockReturnValueOnce(currentStorageItems);

        const storageCleaner = new StorageCleaner(storageMock, 60);

        storageCleaner.clean();

        expect(storageMock.get).toHaveBeenCalledTimes(1);
        expect(storageMock.get.mock.calls[0][0]).toBe('openBets');
        expect(storageMock.set).toHaveBeenCalledTimes(1);
        expect(storageMock.set.mock.calls[0][0]).toBe('openBets');
        expect(storageMock.set.mock.calls[0][1]).toStrictEqual([]);
    });

    it('cleans storage correctly 2', () => {
        expect.assertions(1);

        const momentNow = moment.utc();

        /** @type { BetData[] } */
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
                    firstSeenAt: momentNow.clone().subtract(1, 'minutes').toISOString(),
                    lastSeenAt: momentNow.clone().subtract(1, 'minutes').toISOString(),
                },
            },
            {
                key: 'bet_key_two',
                stake: '0.10',
                side: 'Villarreal',
                market: 'Full Time Result',
                team1Name: 'Villarreal',
                team2Name: 'Las Palmas',
                odd: '1.50',
                metadata: {
                    firstSeenAt: momentNow.clone().subtract(5, 'minutes').toISOString(),
                    lastSeenAt: momentNow.clone().subtract(5, 'minutes').toISOString(),
                },
            },
        ];

        storageMock.get.mockReturnValueOnce(currentStorageItems);

        const storageCleaner = new StorageCleaner(storageMock, 60 * 3);

        storageCleaner.clean();

        expect(storageMock.set.mock.calls[0][1]).toHaveLength(1);
    });
});
