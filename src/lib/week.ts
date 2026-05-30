/**
 * Pure week <-> date math, shared by the engine, availability overlap, and UI.
 *
 * All arithmetic is done in UTC against the group's window start so that testers
 * in Tokyo, São Paulo, and London all agree on which calendar week a `weekIndex`
 * refers to (no off-by-one across time zones).
 */

export const MS_PER_DAY = 86_400_000;
export const MS_PER_WEEK = 7 * MS_PER_DAY;

/** Epoch ms of the start of the given week index within a window. */
export function weekStartMs(windowStartMs: number, weekIndex: number): number {
  return windowStartMs + weekIndex * MS_PER_WEEK;
}

/** Number of whole weeks between two epoch-ms timestamps (rounded up). */
export function weekCountBetween(startMs: number, endMs: number): number {
  return Math.max(0, Math.ceil((endMs - startMs) / MS_PER_WEEK));
}

/** ISO yyyy-mm-dd (UTC) for the start of a week index. */
export function weekStartISO(windowStartMs: number, weekIndex: number): string {
  return new Date(weekStartMs(windowStartMs, weekIndex))
    .toISOString()
    .slice(0, 10);
}

/**
 * ISO yyyy-mm-dd (UTC) for the END of a trip that starts at `startWeekIndex` and
 * spans `lengthWeeks` weeks — i.e. the Saturday-ish tail of the last week.
 */
export function tripEndISO(
  windowStartMs: number,
  startWeekIndex: number,
  lengthWeeks: number,
): string {
  const endMs =
    weekStartMs(windowStartMs, startWeekIndex + lengthWeeks - 1) + 5 * MS_PER_DAY;
  return new Date(endMs).toISOString().slice(0, 10);
}

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/** Friendly "Mar 12" style label (UTC) for an ISO yyyy-mm-dd string. */
export function friendlyDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00Z');
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

/**
 * Friendly range like "Mar 12–17" (same month) or "Mar 30 – Apr 4".
 */
export function friendlyRange(startISO: string, endISO: string): string {
  const s = new Date(startISO + 'T00:00:00Z');
  const e = new Date(endISO + 'T00:00:00Z');
  const startLabel = `${MONTHS[s.getUTCMonth()]} ${s.getUTCDate()}`;
  if (s.getUTCMonth() === e.getUTCMonth()) {
    return `${startLabel}–${e.getUTCDate()}`;
  }
  return `${startLabel} – ${MONTHS[e.getUTCMonth()]} ${e.getUTCDate()}`;
}
