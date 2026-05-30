/**
 * The fairness engine — the heart of Convergence.
 *
 * Given a group's members (each with home airport, budget, and painted weeks),
 * a set of candidate destinations, and a swappable flight-data source, this pure
 * function finds the trip that is FAIREST to everyone:
 *
 *   1. Only consider (destination, week) candidates where the week is inside the
 *      availability overlap of ALL members.
 *   2. For each member compute a `burden` blending cost-vs-their-own-budget and
 *      flight duration (weighted roughly equally; weights are named constants).
 *   3. A candidate is VALID only if every member is at or under their own budget.
 *   4. Rank valid candidates by SMALLEST burden spread (the gap between the most-
 *      and least-burdened member); break ties by lowest total cost.
 *   5. Return the top 1–3, each with a true plain-language rationale.
 *
 * When nothing converges, return a clear, friendly reason instead.
 */
import type {
  Candidate,
  Destination,
  EngineResult,
  Member,
  MemberBurden,
  Proposal,
  WindowContext,
} from './types';
import type { FlightDataSource } from './flightSource';
import {
  DURATION_NORM_HOURS,
  MAX_PROPOSALS,
  TRIP_LENGTH_WEEKS,
  W_COST,
  W_DURATION,
} from './constants';
import { buildRationale, explainFailure } from './rationale';
import { tripEndISO, weekStartISO } from '../lib/week';

/** Intersection of every member's painted weeks, sorted ascending. */
export function intersectWeeks(members: Member[]): number[] {
  if (members.length === 0) return [];
  let acc = new Set(members[0].availableWeeks);
  for (const m of members.slice(1)) {
    const next = new Set(m.availableWeeks);
    acc = new Set([...acc].filter((w) => next.has(w)));
  }
  return [...acc].sort((a, b) => a - b);
}

/**
 * Enumerate contiguous trip windows of `tripLengthWeeks` whose every week is in
 * the overlap set. Returns [{ start, end }] inclusive of both endpoints.
 */
export function enumerateWindows(
  overlapWeeks: number[],
  tripLengthWeeks: number = TRIP_LENGTH_WEEKS,
): Array<{ start: number; end: number }> {
  const present = new Set(overlapWeeks);
  const windows: Array<{ start: number; end: number }> = [];
  for (const start of overlapWeeks) {
    let fits = true;
    for (let k = 1; k < tripLengthWeeks; k++) {
      if (!present.has(start + k)) {
        fits = false;
        break;
      }
    }
    if (fits) windows.push({ start, end: start + tripLengthWeeks - 1 });
  }
  return windows;
}

/** Compute a single member's burden for a given flight estimate. Exported for tests. */
export function computeBurden(
  member: Member,
  cost: number,
  durationHours: number,
): MemberBurden {
  const costRatio = cost / member.budget;
  const durationNorm = durationHours / DURATION_NORM_HOURS;
  const burden = W_COST * costRatio + W_DURATION * durationNorm;
  return {
    userId: member.userId,
    name: member.name,
    cost,
    durationHours,
    costRatio,
    burden,
    overBudget: cost > member.budget,
  };
}

/**
 * Build the full candidate for one (destination, window). Returns null when any
 * member has no known route to the destination (unreachable → not a candidate).
 */
function buildCandidate(
  destination: Destination,
  window: { start: number; end: number },
  members: Member[],
  source: FlightDataSource,
): Candidate | null {
  const burdens: MemberBurden[] = [];
  for (const member of members) {
    const est = source.getFlightEstimate(member.homeAirport, destination.code);
    if (!est) return null; // unreachable for this member
    burdens.push(computeBurden(member, est.cost, est.durationHours));
  }
  const burdenValues = burdens.map((b) => b.burden);
  return {
    destination,
    startWeekIndex: window.start,
    endWeekIndex: window.end,
    members: burdens,
    burdenSpread: Math.max(...burdenValues) - Math.min(...burdenValues),
    totalCost: burdens.reduce((sum, b) => sum + b.cost, 0),
    valid: burdens.every((b) => !b.overBudget),
  };
}

function toProposal(candidate: Candidate, ctx: WindowContext): Proposal {
  const perMemberCost: Record<string, number> = {};
  for (const m of candidate.members) perMemberCost[m.userId] = m.cost;
  return {
    destinationCode: candidate.destination.code,
    destinationName: candidate.destination.name,
    startWeekIndex: candidate.startWeekIndex,
    endWeekIndex: candidate.endWeekIndex,
    startDate: weekStartISO(ctx.windowStartMs, candidate.startWeekIndex),
    endDate: tripEndISO(ctx.windowStartMs, candidate.startWeekIndex, TRIP_LENGTH_WEEKS),
    perMemberCost,
    burdenSpread: candidate.burdenSpread,
    totalCost: candidate.totalCost,
    rationale: buildRationale(candidate, ctx),
  };
}

/**
 * The main entry point. Pure: same inputs always yield the same EngineResult.
 */
export function planTrip(
  members: Member[],
  destinations: Destination[],
  source: FlightDataSource,
  ctx: WindowContext,
): EngineResult {
  // --- Pre-flight failure checks (friendly, specific) ---
  if (members.length === 0) {
    return { ok: false, code: 'NO_MEMBERS', reason: explainFailure('NO_MEMBERS') };
  }
  if (destinations.length === 0) {
    return { ok: false, code: 'NO_DESTINATIONS', reason: explainFailure('NO_DESTINATIONS') };
  }
  const memberWithNoAvail = members.find((m) => m.availableWeeks.length === 0);
  if (memberWithNoAvail) {
    return {
      ok: false,
      code: 'MEMBER_NO_AVAILABILITY',
      reason: explainFailure('MEMBER_NO_AVAILABILITY', {
        memberName: memberWithNoAvail.name,
      }),
    };
  }
  const overlap = intersectWeeks(members);
  const windows = enumerateWindows(overlap, TRIP_LENGTH_WEEKS);
  if (windows.length === 0) {
    return { ok: false, code: 'NO_DATE_OVERLAP', reason: explainFailure('NO_DATE_OVERLAP') };
  }

  // --- Build & evaluate every (destination, window) candidate ---
  const validCandidates: Candidate[] = [];
  const overBudgetTally = new Map<string, { name: string; count: number }>();

  for (const destination of destinations) {
    for (const window of windows) {
      const candidate = buildCandidate(destination, window, members, source);
      if (!candidate) continue;
      if (candidate.valid) {
        validCandidates.push(candidate);
      } else {
        for (const m of candidate.members) {
          if (m.overBudget) {
            const entry = overBudgetTally.get(m.userId) ?? { name: m.name, count: 0 };
            entry.count += 1;
            overBudgetTally.set(m.userId, entry);
          }
        }
      }
    }
  }

  // --- No valid candidate: explain why (name the most-often-over member) ---
  if (validCandidates.length === 0) {
    let worst: { name: string; count: number } | undefined;
    for (const entry of overBudgetTally.values()) {
      if (!worst || entry.count > worst.count) worst = entry;
    }
    return {
      ok: false,
      code: 'ALWAYS_OVER_BUDGET',
      reason: explainFailure('ALWAYS_OVER_BUDGET', { memberName: worst?.name }),
    };
  }

  // --- Fairness-first ranking: smallest burden spread, then lowest total cost ---
  validCandidates.sort(
    (a, b) =>
      a.burdenSpread - b.burdenSpread || a.totalCost - b.totalCost,
  );

  // Keep the best window per destination so proposals are distinct destinations
  // (for date-independent mock costs, all windows of a destination tie, so this
  // collapses them to one representative — the earliest fair week).
  const seen = new Set<string>();
  const topProposals: Proposal[] = [];
  for (const candidate of validCandidates) {
    if (seen.has(candidate.destination.code)) continue;
    seen.add(candidate.destination.code);
    topProposals.push(toProposal(candidate, ctx));
    if (topProposals.length >= MAX_PROPOSALS) break;
  }

  return { ok: true, proposals: topProposals };
}
