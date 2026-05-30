/**
 * Week-level availability helpers: overlap and heatmap aggregation.
 *
 * The engine's `intersectWeeks` covers the cross-member overlap used for
 * planning; this module adds the per-week count used to render the shared
 * heatmap on the group surface. All indexing is in `weekIndex` space; date
 * conversion lives in `lib/week.ts`.
 */

export interface HeatmapCell {
  weekIndex: number;
  /** ISO yyyy-mm-dd of this week's start (for labels). */
  startISO: string;
  /** How many members painted this week. */
  count: number;
  /** count / memberCount, 0..1 — full saturation = everyone is free. */
  intensity: number;
  /** True when every member painted it (this is the planning overlap). */
  isOverlap: boolean;
}

import { weekStartISO } from './week';

/**
 * Build the heatmap for a group window from each member's painted week set.
 *
 * @param paintsByMember Map/array of members' painted weekIndex arrays.
 * @param weekCount      Number of weeks in the window.
 * @param windowStartMs  Epoch ms of week index 0.
 */
export function buildHeatmap(
  paintsByMember: number[][],
  weekCount: number,
  windowStartMs: number,
): HeatmapCell[] {
  const memberCount = paintsByMember.length;
  const counts = new Array<number>(weekCount).fill(0);
  for (const weeks of paintsByMember) {
    for (const w of weeks) {
      if (w >= 0 && w < weekCount) counts[w] += 1;
    }
  }
  return counts.map((count, weekIndex) => ({
    weekIndex,
    startISO: weekStartISO(windowStartMs, weekIndex),
    count,
    intensity: memberCount === 0 ? 0 : count / memberCount,
    isOverlap: memberCount > 0 && count === memberCount,
  }));
}
