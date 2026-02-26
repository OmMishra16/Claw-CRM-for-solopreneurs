/**
 * Pure scheduling logic.
 *
 * These functions carry the two guarantees the product depends on — that a series
 * of recurring appointments lands on the right dates, and that an overlapping
 * booking is never accepted. They are kept free of database and HTTP concerns so
 * they can be unit-tested directly; see __tests__/scheduling.test.js.
 */

/**
 * Maximum appointments created by a single recurring request.
 *
 * A full calendar year of weekly bookings is 53 occurrences, not 52, because both
 * endpoints are included (365 / 7 = 52.1). The cap is set to admit exactly that
 * case, which is the most natural use of the feature.
 */
const MAX_SERIES_LENGTH = 53;

/** Recurrence patterns accepted by the booking form. */
const PATTERNS = ['weekly', 'biweekly', 'monthly'];

/**
 * Every occurrence of a recurring appointment, from startDate up to and including
 * endDate.
 *
 * The end date is normalised to the last millisecond of its day, so a series that
 * runs "until 1 March" includes an appointment on 1 March rather than dropping it
 * on a time-of-day comparison.
 *
 * Monthly recurrence follows JavaScript's native Date semantics: a run starting
 * 31 January rolls into early March, because setMonth on a 31st in a 28-day month
 * overflows. This is existing behaviour, asserted in the tests so that any future
 * change to it is deliberate rather than accidental.
 *
 * @param {string|Date} startDate  first occurrence
 * @param {'weekly'|'biweekly'|'monthly'} pattern
 * @param {string|Date} endDate    inclusive last day of the series
 * @returns {Date[]} occurrences in chronological order
 */
const generateRecurringDates = (startDate, pattern, endDate) => {
  const dates = [];
  let current = new Date(startDate);
  const end = new Date(endDate);

  // Set end of day for end date comparison
  end.setHours(23, 59, 59, 999);

  while (current <= end) {
    dates.push(new Date(current));

    switch (pattern) {
      case 'weekly':
        current.setDate(current.getDate() + 7);
        break;
      case 'biweekly':
        current.setDate(current.getDate() + 14);
        break;
      case 'monthly':
        current.setMonth(current.getMonth() + 1);
        break;
      default:
        // Unknown pattern: emit the first occurrence only rather than looping forever.
        return dates;
    }
  }

  return dates;
};

/**
 * Do two half-open intervals overlap?
 *
 * The predicate is `existingStart < newEnd AND existingEnd > newStart`, which covers
 * all four overlap cases (partial from either side, containment, enclosure) while
 * treating back-to-back appointments — one ending exactly as the next begins — as
 * NOT overlapping.
 *
 * This is the same condition the database filter below applies; it is expressed here
 * in JavaScript so the rule itself can be tested without a database.
 */
const overlaps = (existingStart, existingEnd, newStart, newEnd) => {
  const es = new Date(existingStart).getTime();
  const ee = new Date(existingEnd).getTime();
  const ns = new Date(newStart).getTime();
  const ne = new Date(newEnd).getTime();
  return es < ne && ee > ns;
};

/**
 * The PostgREST filter expressing {@link overlaps} for a candidate slot, passed to
 * Supabase's `.or()`. Built here rather than inline so the predicate has one
 * definition and one test.
 *
 * @param {string} dateTime candidate start, ISO string
 * @param {string} endTime  candidate end, ISO string
 */
const overlapFilter = (dateTime, endTime) =>
  `and(date_time.lt.${endTime},end_time.gt.${dateTime})`;

module.exports = {
  MAX_SERIES_LENGTH,
  PATTERNS,
  generateRecurringDates,
  overlaps,
  overlapFilter,
};
