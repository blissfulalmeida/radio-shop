const moment = require('moment');

describe('moment.js basic test', () => {
    it('should return moment.utc().toISOString', () => {
        const mockUTCTimestamp = '2023-01-01T00:00:00Z';
        const mockUTCTimestamp2 = '2023-01-01T00:00:00Z';

        jest.spyOn(moment, 'utc').mockReturnValue({
            toISOString: jest.fn()
                .mockReturnValueOnce(mockUTCTimestamp)
                .mockReturnValueOnce(mockUTCTimestamp2),
        });

        const result = moment.utc().toISOString();
        const result2 = moment.utc().toISOString();

        expect(result).toBe(mockUTCTimestamp);
        expect(result2).toBe(mockUTCTimestamp2);
    });
});
