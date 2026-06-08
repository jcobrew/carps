/**
 * Core types for the Convergence fairness engine.
 *
 * This module is PURE: it imports nothing from the database, React, or Next.js.
 * That isolation is what lets the engine be unit-tested on its own and lets the
 * flight-data source be swapped (mock now, real API later) without touching the
 * ranking logic.
 */

/** IATA-style airport code, e.g. "NRT", "GRU", "LHR". */
export type AirportCode = string;

/** A single round-trip flight estimate from one origin to one destination. */
export interface FlightEstimate {
  /** Round-trip cost in USD. */
  cost: number;
  /** Approximate one-way flight duration in hours. */
  durationHours: number;
}

/** One member of a trip group, as the engine sees them. */
export interface Member {
  userId: string;
  /** Display name — used to build friendly rationale / failure sentences. */
  name: string;
  homeAirport: AirportCode;
  /** The member's own maximum spend for the trip (their budget ceiling). */
  budget: number;
  /** Sorted list of week indices this member painted as "I could travel". */
  availableWeeks: number[];
}

/** A candidate destination with per-origin flight estimates. */
export interface Destination {
  code: string;
  name: string;
  /** Map of origin airport code -> flight estimate to this destination. */
  flights: Record<AirportCode, FlightEstimate>;
}

/** The computed burden a single member carries for a given candidate. */
export interface MemberBurden {
  userId: string;
  name: string;
  cost: number;
  durationHours: number;
  /** cost / member.budget — the fraction of their budget consumed. */
  costRatio: number;
  /** Blended scalar: W_COST * costRatio + W_DURATION * durationNorm. */
  burden: number;
  /** True when this member's cost exceeds their own budget. */
  overBudget: boolean;
}

/** A (destination, date-window) pair with everyone's burdens computed. */
export interface Candidate {
  destination: Destination;
  startWeekIndex: number;
  endWeekIndex: number;
  members: MemberBurden[];
  /** max(burden) - min(burden) across members — the fairness metric. */
  burdenSpread: number;
  /** Sum of every member's flight cost. */
  totalCost: number;
  /** Valid only when every member is at or under their own budget. */
  valid: boolean;
}

/** A ranked, ready-to-show proposal with a human-readable rationale. */
export interface Proposal {
  destinationCode: string;
  destinationName: string;
  startWeekIndex: number;
  endWeekIndex: number;
  /** Display date strings derived from the group's window (ISO yyyy-mm-dd). */
  startDate: string;
  endDate: string;
  /** Map of userId -> that member's flight cost. */
  perMemberCost: Record<string, number>;
  burdenSpread: number;
  totalCost: number;
  /** Plain-language sentence whose numbers are true to the computed values. */
  rationale: string;
}

/** Why a convergence run failed to produce any valid proposal. */
export type FailureCode =
  | 'NO_DATE_OVERLAP'
  | 'ALWAYS_OVER_BUDGET'
  | 'MEMBER_NO_AVAILABILITY'
  | 'NO_DESTINATIONS'
  | 'NO_MEMBERS';

/** The result of a convergence run: either ranked proposals or a clear reason. */
export type EngineResult =
  | { ok: true; proposals: Proposal[] }
  | { ok: false; code: FailureCode; reason: string };

/**
 * Context the engine passes to the rationale/failure builders so generated
 * sentences carry real, computed values (never hardcoded).
 */
export interface WindowContext {
  /** Epoch ms of week index 0 (the start of the group's planning window). */
  windowStartMs: number;
  /** Number of weeks in the planning window. */
  weekCount: number;
}
