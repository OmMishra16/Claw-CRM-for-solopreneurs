const {
  MAX_SERIES_LENGTH,
  generateRecurringDates,
  overlaps,
  overlapFilter,
} = require('../scheduling');

/** Local time, so assertions do not drift with the machine's timezone. */
const at = (y, m, d, h = 10, min = 0) => new Date(y, m - 1, d, h, min, 0, 0);
const ymd = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`;

describe('generateRecurringDates', () => {
  test('weekly series lands on 7-day intervals', () => {
    const dates = generateRecurringDates(at(2026, 3, 2), 'weekly', at(2026, 3, 30));
    expect(dates.map(ymd)).toEqual([
      '2026-03-02',
      '2026-03-09',
      '2026-03-16',
      '2026-03-23',
      '2026-03-30',
    ]);
  });

  test('bi-weekly series lands on 14-day intervals', () => {
    const dates = generateRecurringDates(at(2026, 3, 2), 'biweekly', at(2026, 4, 13));
    expect(dates.map(ymd)).toEqual(['2026-03-02', '2026-03-16', '2026-03-30', '2026-04-13']);
  });

  test('monthly series keeps the day of month', () => {
    const dates = generateRecurringDates(at(2026, 1, 15), 'monthly', at(2026, 4, 15));
    expect(dates.map(ymd)).toEqual(['2026-01-15', '2026-02-15', '2026-03-15', '2026-04-15']);
  });

  test('preserves the time of day across occurrences', () => {
    const dates = generateRecurringDates(at(2026, 3, 2, 14, 30), 'weekly', at(2026, 3, 16));
    for (const d of dates) {
      expect(d.getHours()).toBe(14);
      expect(d.getMinutes()).toBe(30);
    }
  });

  // The end date is normalised to end-of-day, so a series "until the 30th" must
  // include the 30th rather than dropping it on a time-of-day comparison.
  test('includes an occurrence falling on the end date itself', () => {
    const dates = generateRecurringDates(at(2026, 3, 2, 16, 0), 'weekly', at(2026, 3, 9, 0, 0));
    expect(dates.map(ymd)).toEqual(['2026-03-02', '2026-03-09']);
  });

  test('a start date after the end date produces nothing', () => {
    expect(generateRecurringDates(at(2026, 5, 1), 'weekly', at(2026, 4, 1))).toEqual([]);
  });

  test('start and end on the same day produces a single occurrence', () => {
    expect(generateRecurringDates(at(2026, 3, 2), 'weekly', at(2026, 3, 2))).toHaveLength(1);
  });

  test('crosses a month boundary without skipping', () => {
    const dates = generateRecurringDates(at(2026, 1, 26), 'weekly', at(2026, 2, 16));
    expect(dates.map(ymd)).toEqual(['2026-01-26', '2026-02-02', '2026-02-09', '2026-02-16']);
  });

  test('crosses a leap-year February correctly', () => {
    // 2028 is a leap year: 29 February exists.
    const dates = generateRecurringDates(at(2028, 2, 22), 'weekly', at(2028, 3, 7));
    expect(dates.map(ymd)).toEqual(['2028-02-22', '2028-02-29', '2028-03-07']);
  });

  // Documents existing behaviour rather than endorsing it: a monthly series starting
  // on the 31st overflows short months, because Date.setMonth rolls forward.
  test('monthly from the 31st overflows short months (documented behaviour)', () => {
    const dates = generateRecurringDates(at(2026, 1, 31), 'monthly', at(2026, 4, 30));
    expect(dates.map(ymd)).toEqual(['2026-01-31', '2026-03-03', '2026-04-03']);
  });

  test('an unknown pattern returns the first occurrence and does not loop forever', () => {
    const dates = generateRecurringDates(at(2026, 3, 2), 'fortnightly', at(2026, 12, 31));
    expect(dates).toHaveLength(1);
  });

  // A full calendar year contains 53 weekly occurrences when both endpoints are
  // included (365 / 7 = 52.1). The cap admits exactly this case; it previously
  // stopped at 52 and rejected it.
  test('a full calendar year of weekly bookings yields 53 occurrences and is accepted', () => {
    const dates = generateRecurringDates(at(2026, 1, 1), 'weekly', at(2026, 12, 31));
    expect(dates).toHaveLength(53);
    expect(dates.length).toBeLessThanOrEqual(MAX_SERIES_LENGTH);
  });

  test('52 weekly occurrences sit exactly on the cap and are accepted', () => {
    const dates = generateRecurringDates(at(2026, 1, 1), 'weekly', at(2026, 12, 24));
    expect(dates).toHaveLength(52);
    expect(dates.length).toBeLessThanOrEqual(MAX_SERIES_LENGTH);
  });

  test('a run well beyond a year exceeds the cap, so the route rejects it', () => {
    const dates = generateRecurringDates(at(2026, 1, 1), 'weekly', at(2027, 6, 30));
    expect(dates.length).toBeGreaterThan(MAX_SERIES_LENGTH);
  });
});

describe('overlaps', () => {
  // An existing appointment from 10:00 to 11:00.
  const start = at(2026, 3, 2, 10, 0);
  const end = at(2026, 3, 2, 11, 0);

  test('detects a booking starting inside the existing one', () => {
    expect(overlaps(start, end, at(2026, 3, 2, 10, 30), at(2026, 3, 2, 11, 30))).toBe(true);
  });

  test('detects a booking ending inside the existing one', () => {
    expect(overlaps(start, end, at(2026, 3, 2, 9, 30), at(2026, 3, 2, 10, 30))).toBe(true);
  });

  test('detects a booking wholly inside the existing one', () => {
    expect(overlaps(start, end, at(2026, 3, 2, 10, 15), at(2026, 3, 2, 10, 45))).toBe(true);
  });

  test('detects a booking that completely encloses the existing one', () => {
    expect(overlaps(start, end, at(2026, 3, 2, 9, 0), at(2026, 3, 2, 12, 0))).toBe(true);
  });

  test('detects an exactly identical slot', () => {
    expect(overlaps(start, end, start, end)).toBe(true);
  });

  // The boundary cases that make back-to-back scheduling possible at all.
  test('allows a booking that starts exactly when the existing one ends', () => {
    expect(overlaps(start, end, at(2026, 3, 2, 11, 0), at(2026, 3, 2, 12, 0))).toBe(false);
  });

  test('allows a booking that ends exactly when the existing one starts', () => {
    expect(overlaps(start, end, at(2026, 3, 2, 9, 0), at(2026, 3, 2, 10, 0))).toBe(false);
  });

  test('allows a clearly earlier booking', () => {
    expect(overlaps(start, end, at(2026, 3, 2, 7, 0), at(2026, 3, 2, 8, 0))).toBe(false);
  });

  test('allows a clearly later booking', () => {
    expect(overlaps(start, end, at(2026, 3, 2, 15, 0), at(2026, 3, 2, 16, 0))).toBe(false);
  });

  test('allows the same time on a different day', () => {
    expect(overlaps(start, end, at(2026, 3, 3, 10, 0), at(2026, 3, 3, 11, 0))).toBe(false);
  });

  test('accepts ISO strings as well as Date objects', () => {
    expect(
      overlaps(start.toISOString(), end.toISOString(), at(2026, 3, 2, 10, 30).toISOString(), at(2026, 3, 2, 11, 30).toISOString())
    ).toBe(true);
  });
});

describe('overlapFilter', () => {
  // The database applies the same predicate as overlaps(); this guards the
  // hand-written filter string against a typo that would silently disable
  // double-booking prevention.
  test('compares existing start against the new end, and existing end against the new start', () => {
    const filter = overlapFilter('2026-03-02T10:00:00.000Z', '2026-03-02T11:00:00.000Z');
    expect(filter).toBe(
      'and(date_time.lt.2026-03-02T11:00:00.000Z,end_time.gt.2026-03-02T10:00:00.000Z)'
    );
  });

  test('uses strict comparisons so back-to-back bookings are not treated as conflicts', () => {
    const filter = overlapFilter('S', 'E');
    expect(filter).toContain('date_time.lt.');
    expect(filter).toContain('end_time.gt.');
    expect(filter).not.toContain('lte');
    expect(filter).not.toContain('gte');
  });
});
