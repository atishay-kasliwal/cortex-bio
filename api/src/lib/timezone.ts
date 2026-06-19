import { DateTime } from 'luxon';

/** Calendar date in the user's timezone as UTC midnight (for Prisma @db.Date). */
export function toDateOnly(localDate: DateTime): Date {
  return new Date(Date.UTC(localDate.year, localDate.month - 1, localDate.day));
}

/** Local day bounds [start, end) as UTC instants for a YYYY-MM-DD key in user timezone. */
export function localDayBoundsFromKey(
  dateKey: string,
  timezone: string,
): { start: Date; end: Date } {
  const local = DateTime.fromISO(dateKey, { zone: timezone }).startOf('day');
  return {
    start: local.toUTC().toJSDate(),
    end: local.plus({ days: 1 }).startOf('day').toUTC().toJSDate(),
  };
}

export function localHourBoundsFromKey(
  dateKey: string,
  hour: number,
  timezone: string,
): { start: Date; end: Date } {
  const local = DateTime.fromISO(dateKey, { zone: timezone }).set({
    hour,
    minute: 0,
    second: 0,
    millisecond: 0,
  });
  return {
    start: local.toUTC().toJSDate(),
    end: local.plus({ hours: 1 }).toUTC().toJSDate(),
  };
}

/** Which local calendar dates does a UTC instant fall into? */
export function utcToLocalDateKey(instant: Date, timezone: string): string {
  return DateTime.fromJSDate(instant, { zone: 'utc' }).setZone(timezone).toISODate()!;
}

export function dateKeysBetween(start: Date, end: Date, timezone: string): string[] {
  const keys = new Set<string>();
  let cursor = DateTime.fromJSDate(start, { zone: 'utc' }).setZone(timezone).startOf('day');
  const limit = DateTime.fromJSDate(end, { zone: 'utc' }).setZone(timezone).endOf('day');

  while (cursor <= limit) {
    keys.add(cursor.toISODate()!);
    cursor = cursor.plus({ days: 1 });
  }

  return [...keys].sort();
}
