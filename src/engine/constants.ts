/**
 * Tunable constants for the fairness engine.
 *
 * These are deliberately named and centralized so the fairness "values
 * judgment" (how much cost matters vs. flight duration) is easy to adjust
 * after watching real testers react. Cost and duration are weighted roughly
 * equally per the fairness-first brief.
 */

/** Weight applied to the cost-vs-budget ratio when computing burden. */
export const W_COST = 0.5;

/** Weight applied to the normalized flight duration when computing burden. */
export const W_DURATION = 0.5;

/**
 * Divisor that normalizes flight duration (hours) into a ~0..1 scale so it is
 * comparable to costRatio. 24h ≈ "a full day of travel" maps to ~1.0; a long
 * 31h haul intentionally exceeds 1.0 so long-haul burden can dominate.
 */
export const DURATION_NORM_HOURS = 24;

/** Maximum number of proposals returned from a single convergence run. */
export const MAX_PROPOSALS = 3;

/**
 * Width of a candidate trip window, in painted weeks. Fixed at 1 for v0 to keep
 * window enumeration trivial.
 * // TODO: post-v0 — support variable / fortnight-length trips.
 */
export const TRIP_LENGTH_WEEKS = 1;
