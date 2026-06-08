/**
 * Group planning-window helpers (pure). A window is a run of whole weeks,
 * anchored on a Monday (UTC) so week cells line up cleanly.
 */
import { MS_PER_DAY, MS_PER_WEEK } from './week';

/** Default window length: ~6 months of week-level planning. */
export const DEFAULT_WINDOW_WEEKS = 26;

/** The Monday (UTC) on or after the given epoch ms. */
export function mondayOnOrAfter(ms: number): number {
  const d = new Date(ms);
  const utcMidnight = Date.UTC(
    d.getUTCFullYear(),
    d.getUTCMonth(),
    d.getUTCDate(),
  );
  const dow = new Date(utcMidnight).getUTCDay(); // 0 Sun .. 6 Sat
  const daysUntilMonday = (8 - dow) % 7; // 0 if already Monday
  return utcMidnight + daysUntilMonday * MS_PER_DAY;
}

/** Build a window of `weeks` weeks starting at the Monday on/after `startMs`. */
export function makeWindow(
  startMs: number,
  weeks: number = DEFAULT_WINDOW_WEEKS,
): { windowStart: number; windowEnd: number } {
  const windowStart = mondayOnOrAfter(startMs);
  return { windowStart, windowEnd: windowStart + weeks * MS_PER_WEEK };
}
