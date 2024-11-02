import { addDays, dateToString, daysDiff, startOfWeek } from '../src/utils.js';

describe('utils', () => {
  describe('dateToString', () => {
    it('should create an ISO date representation', () => {
      expect(dateToString(new Date(Date.UTC(2024, 1, 1)))).toEqual('2024-02-01');
    });
  });

  describe('startOfWeek', () => {
    it('should determine the start of the week (i.e. the previous monday) for a given date', () => {
      expect(startOfWeek('2024-11-01')).toEqual('2024-10-28');
      expect(startOfWeek('2024-11-02')).toEqual('2024-10-28');
      expect(startOfWeek('2024-11-03')).toEqual('2024-10-28');
      expect(startOfWeek('2024-11-04')).toEqual('2024-11-04');
      expect(startOfWeek('2024-11-05')).toEqual('2024-11-04');
      expect(startOfWeek('2024-11-06')).toEqual('2024-11-04');
      expect(startOfWeek('2024-11-07')).toEqual('2024-11-04');
      expect(startOfWeek('2024-11-08')).toEqual('2024-11-04');
    });
    it('should determine the start of the week using week offsets', () => {
      expect(startOfWeek('2024-11-01', 1)).toEqual('2024-11-04');
      expect(startOfWeek('2024-11-02', 2)).toEqual('2024-11-11');
      expect(startOfWeek('2024-11-04', -1)).toEqual('2024-10-28');
      expect(startOfWeek('2024-11-05', -2)).toEqual('2024-10-21');
      // DST
      expect(startOfWeek('2024-03-29', 1)).toEqual('2024-04-01');
      expect(startOfWeek('2024-04-05', -1)).toEqual('2024-03-25');
    });
  });

  describe('daysDiff', () => {
    it('should compute the difference between two dates as days', () => {
      expect(daysDiff('2024-11-01', '2024-11-02')).toEqual(1);
      expect(daysDiff('2024-11-02', '2024-11-01')).toEqual(-1);
      expect(daysDiff('2023-02-28', '2023-03-01')).toEqual(1);
      expect(daysDiff('2023-01-01', '2023-01-01')).toEqual(0);
      expect(daysDiff('2023-01-01', '2024-01-01')).toEqual(365);
      // leap year
      expect(daysDiff('2024-02-28', '2024-03-01')).toEqual(2);
      expect(daysDiff('2024-01-01', '2025-01-01')).toEqual(366);
      // DST
      expect(daysDiff('2024-03-30', '2024-04-01')).toEqual(2);
      expect(daysDiff('2024-10-26', '2024-10-28')).toEqual(2);
      expect(daysDiff('2024-06-01', '2024-12-01')).toEqual(183);
    });
    it('should return null if one date is missing', () => {
      expect(daysDiff('', '2024-11-02')).toBeNull();
      expect(daysDiff('2024-11-01', '')).toBeNull();
    });
  });

  describe('addDays', () => {
    it('should add a number of days to a date', () => {
      expect(addDays('2024-11-02', 2)).toEqual('2024-11-04');
      expect(addDays('2024-11-02', -2)).toEqual('2024-10-31');
      // DST
      expect(addDays('2024-03-30', 2)).toEqual('2024-04-01');
      expect(addDays('2024-10-26', 2)).toEqual('2024-10-28');
    });
  });
});
