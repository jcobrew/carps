/**
 * Legibility layer: turns a computed candidate into a plain-language sentence
 * whose numbers are TRUE to the math, plus friendly explanations for the cases
 * where no fair trip exists.
 *
 * This sentence IS the product — it makes the fairness visible. Every number in
 * it is recomputed from the candidate's own `MemberBurden[]`, never hardcoded.
 */
import type { Candidate, FailureCode, MemberBurden, WindowContext } from './types';
import { TRIP_LENGTH_WEEKS } from './constants';
import { friendlyRange, tripEndISO, weekStartISO } from '../lib/week';

/** The largest gap, in hours, between any two members' flight durations. */
function durationSpreadHours(members: MemberBurden[]): number {
  const durations = members.map((m) => m.durationHours);
  return Math.max(...durations) - Math.min(...durations);
}

/** The highest fraction of budget any single member spends (0..1+). */
function maxCostRatio(members: MemberBurden[]): number {
  return Math.max(...members.map((m) => m.costRatio));
}

/**
 * Build the rationale sentence for a valid candidate, e.g.:
 * "Da Nang, Mar 12–17 — everyone lands within ~2h of each other's flight time,
 *  and nobody spends more than 85% of their budget."
 */
export function buildRationale(
  candidate: Candidate,
  ctx: WindowContext,
): string {
  const startISO = weekStartISO(ctx.windowStartMs, candidate.startWeekIndex);
  const endISO = tripEndISO(
    ctx.windowStartMs,
    candidate.startWeekIndex,
    TRIP_LENGTH_WEEKS,
  );
  const dateLabel = friendlyRange(startISO, endISO);

  const durSpread = Math.round(durationSpreadHours(candidate.members));
  const budgetPct = Math.round(maxCostRatio(candidate.members) * 100);

  const flightClause =
    durSpread <= 1
      ? `everyone lands within about an hour of each other's flight time`
      : `everyone lands within ~${durSpread}h of each other's flight time`;

  return (
    `${candidate.destination.name}, ${dateLabel} — ${flightClause}, ` +
    `and nobody spends more than ${budgetPct}% of their budget.`
  );
}

/** Friendly, specific explanation for why a run produced no valid proposal. */
export function explainFailure(
  code: FailureCode,
  ctx?: { memberName?: string },
): string {
  switch (code) {
    case 'NO_MEMBERS':
      return `This group has no members yet — invite some friends and have them set their availability.`;
    case 'NO_DESTINATIONS':
      return `No destinations are configured to choose from.`;
    case 'MEMBER_NO_AVAILABILITY':
      return ctx?.memberName
        ? `No dates work for everyone yet — ${ctx.memberName} hasn't painted any availability.`
        : `No dates work for everyone yet — someone hasn't painted any availability.`;
    case 'NO_DATE_OVERLAP':
      return `No single week works for everyone yet — your painted weeks don't overlap. Try widening your availability.`;
    case 'ALWAYS_OVER_BUDGET':
      return ctx?.memberName
        ? `Every option puts someone over budget — ${ctx.memberName}'s budget is too low for any destination on the overlapping dates. Try raising budgets or widening dates.`
        : `Every option puts someone over budget — try raising budgets or widening dates.`;
  }
}
