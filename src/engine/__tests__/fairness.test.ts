import { describe, it, expect } from 'vitest';
import {
  planTrip,
  intersectWeeks,
  enumerateWindows,
  computeBurden,
} from '../fairness';
import { mockFlightSource, destinations } from '../mockFlightSource';
import type { Destination, Member, WindowContext } from '../types';
import type { FlightDataSource } from '../flightSource';
import { W_COST, W_DURATION, DURATION_NORM_HOURS, MAX_PROPOSALS } from '../constants';

// A Monday in UTC so week math is stable across time zones.
const CTX: WindowContext = { windowStartMs: Date.UTC(2026, 2, 2), weekCount: 26 };

/** The canonical 3-person test group: Tokyo, São Paulo, Europe. */
function threePersonGroup(overrides: Partial<Record<string, Partial<Member>>> = {}): Member[] {
  const base: Member[] = [
    { userId: 'tk', name: 'Yuki', homeAirport: 'NRT', budget: 1500, availableWeeks: [0, 1, 2] },
    { userId: 'sp', name: 'Maria', homeAirport: 'GRU', budget: 3000, availableWeeks: [0, 1, 2] },
    { userId: 'eu', name: 'Liam', homeAirport: 'LHR', budget: 2000, availableWeeks: [0, 1, 2] },
  ];
  return base.map((m) => ({ ...m, ...(overrides[m.userId] ?? {}) }));
}

/** Build a FlightDataSource + Destination[] from a hand-specified table. */
function fixedSource(
  table: Record<string, Record<string, { cost: number; durationHours: number }>>,
): { source: FlightDataSource; dests: Destination[] } {
  const dests: Destination[] = Object.entries(table).map(([code, flights]) => ({
    code,
    name: code,
    flights,
  }));
  const byCode = new Map(dests.map((d) => [d.code, d]));
  const source: FlightDataSource = {
    getFlightEstimate: (origin, destCode) =>
      byCode.get(destCode)?.flights[origin] ?? null,
  };
  return { source, dests };
}

describe('helpers', () => {
  it('intersectWeeks returns the common painted weeks', () => {
    const members = threePersonGroup({
      tk: { availableWeeks: [0, 1, 2, 3] },
      sp: { availableWeeks: [1, 2, 3, 4] },
      eu: { availableWeeks: [2, 3] },
    });
    expect(intersectWeeks(members)).toEqual([2, 3]);
  });

  it('enumerateWindows yields one window per overlap week for 1-week trips', () => {
    // Assertion #10: overlap of 3 weeks, trip length 1 -> 3 windows.
    expect(enumerateWindows([0, 1, 2], 1)).toEqual([
      { start: 0, end: 0 },
      { start: 1, end: 1 },
      { start: 2, end: 2 },
    ]);
  });

  it('enumerateWindows requires contiguous weeks for multi-week trips', () => {
    // [0,1,3] with length 2 -> only {0,1} is contiguous.
    expect(enumerateWindows([0, 1, 3], 2)).toEqual([{ start: 0, end: 1 }]);
  });

  it('computeBurden matches W_COST*costRatio + W_DURATION*durationNorm', () => {
    // Assertion #5: burden math for a known input.
    const member: Member = {
      userId: 'x', name: 'X', homeAirport: 'NRT', budget: 1500, availableWeeks: [0],
    };
    const b = computeBurden(member, 600, 12);
    const expected =
      W_COST * (600 / 1500) + W_DURATION * (12 / DURATION_NORM_HOURS);
    expect(b.costRatio).toBeCloseTo(0.4, 10);
    expect(b.burden).toBeCloseTo(expected, 10);
    expect(b.overBudget).toBe(false);
  });
});

describe('planTrip — happy path against the real mock data', () => {
  const result = planTrip(threePersonGroup(), destinations, mockFlightSource, CTX);

  it('returns between 1 and MAX_PROPOSALS proposals', () => {
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.proposals.length).toBeGreaterThanOrEqual(1);
    expect(result.proposals.length).toBeLessThanOrEqual(MAX_PROPOSALS);
  });

  it('every proposal costs each member at or under their budget', () => {
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const budgets: Record<string, number> = { tk: 1500, sp: 3000, eu: 2000 };
    for (const p of result.proposals) {
      for (const [userId, cost] of Object.entries(p.perMemberCost)) {
        expect(cost).toBeLessThanOrEqual(budgets[userId]);
      }
    }
  });

  it('proposals are sorted by ascending burden spread', () => {
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const spreads = result.proposals.map((p) => p.burdenSpread);
    const sorted = [...spreads].sort((a, b) => a - b);
    expect(spreads).toEqual(sorted);
  });

  it('every proposal carries a non-empty rationale naming the destination', () => {
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    for (const p of result.proposals) {
      expect(p.rationale.length).toBeGreaterThan(0);
      expect(p.rationale).toContain(p.destinationName);
      expect(p.rationale).toMatch(/budget/);
    }
  });
});

describe('planTrip — fairness-first ranking', () => {
  it('the hard budget gate excludes a destination where any member is over budget', () => {
    // Assertion #2: EVEN (valid, spread 0) and OVERBUDGET (spread 0 but Maria over
    // her 3000 budget) tie on the best possible spread. Only the valid one survives.
    const { source, dests } = fixedSource({
      EVEN: {
        NRT: { cost: 1050, durationHours: 12 }, // burden 0.6
        GRU: { cost: 600, durationHours: 24 },  // burden 0.6
        LHR: { cost: 1400, durationHours: 12 }, // burden 0.6
      },
      OVERBUDGET: {
        NRT: { cost: 1275, durationHours: 30 }, // burden 1.05
        GRU: { cost: 3300, durationHours: 24 }, // burden 1.05, OVER 3000 budget
        LHR: { cost: 1700, durationHours: 30 }, // burden 1.05
      },
    });
    const result = planTrip(threePersonGroup(), dests, source, CTX);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const codes = result.proposals.map((p) => p.destinationCode);
    expect(codes).toContain('EVEN');
    expect(codes).not.toContain('OVERBUDGET');
  });

  it('ranks smallest burden spread first, even when total cost is higher', () => {
    // Assertion #3: A is cheaper overall but lopsided; B is pricier but even.
    const { source, dests } = fixedSource({
      A_CHEAP_LOPSIDED: {
        NRT: { cost: 200, durationHours: 6 },
        GRU: { cost: 1500, durationHours: 30 },
        LHR: { cost: 400, durationHours: 14 },
      },
      B_EVEN_PRICEY: {
        NRT: { cost: 1050, durationHours: 12 }, // burden 0.6
        GRU: { cost: 600, durationHours: 24 },  // burden 0.6
        LHR: { cost: 1400, durationHours: 12 }, // burden 0.6
      },
    });
    const result = planTrip(threePersonGroup(), dests, source, CTX);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.proposals[0].destinationCode).toBe('B_EVEN_PRICEY');
    const a = result.proposals.find((p) => p.destinationCode === 'A_CHEAP_LOPSIDED')!;
    const b = result.proposals.find((p) => p.destinationCode === 'B_EVEN_PRICEY')!;
    // B wins despite costing strictly more than A — fairness beats cheapness.
    expect(b.totalCost).toBeGreaterThan(a.totalCost);
    expect(b.burdenSpread).toBeLessThan(a.burdenSpread);
  });

  it('breaks ties on burden spread by choosing the lower total cost', () => {
    // Assertion #4: two destinations with IDENTICAL even burdens (spread 0); the
    // cheaper one must rank first.
    const { source, dests } = fixedSource({
      TIE_HI: {
        NRT: { cost: 1050, durationHours: 12 },
        GRU: { cost: 600, durationHours: 24 },
        LHR: { cost: 1400, durationHours: 12 },
      }, // total 3050, spread 0
      TIE_LO: {
        NRT: { cost: 600, durationHours: 12 },  // burden 0.45
        GRU: { cost: 1200, durationHours: 12 }, // burden 0.45
        LHR: { cost: 800, durationHours: 12 },  // burden 0.45
      }, // total 2600, spread 0 (same spread as TIE_HI)
    });
    const result = planTrip(threePersonGroup(), dests, source, CTX);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const lo = result.proposals.find((p) => p.destinationCode === 'TIE_LO')!;
    const hi = result.proposals.find((p) => p.destinationCode === 'TIE_HI')!;
    // Both have burden spread 0; the cheaper one (TIE_LO) must rank first.
    expect(lo.burdenSpread).toBeCloseTo(hi.burdenSpread, 9);
    expect(result.proposals[0].destinationCode).toBe('TIE_LO');
    expect(lo.totalCost).toBeLessThan(hi.totalCost);
  });
});

describe('rationale truthfulness', () => {
  it('the sentence numbers equal the recomputed budget% and hour-spread', () => {
    // Assertion #6: one destination, known costs/durations, hand-computed expectations.
    const { source, dests } = fixedSource({
      DAD: {
        NRT: { cost: 300, durationHours: 6 },   // costRatio 0.20
        GRU: { cost: 2550, durationHours: 30 }, // costRatio 0.85  <- max
        LHR: { cost: 800, durationHours: 14 },  // costRatio 0.40
      },
    });
    const result = planTrip(threePersonGroup(), dests, source, CTX);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const p = result.proposals[0];
    // maxCostRatio = 0.85 -> 85%; duration spread = 30 - 6 = 24h.
    expect(p.rationale).toContain('85% of their budget');
    expect(p.rationale).toContain('~24h');
    expect(p.rationale).toContain('DAD');
  });
});

describe('planTrip — friendly failures', () => {
  it('reports NO_DATE_OVERLAP when painted weeks do not intersect', () => {
    // Assertion #7.
    const members = threePersonGroup({
      tk: { availableWeeks: [0] },
      sp: { availableWeeks: [1] },
      eu: { availableWeeks: [2] },
    });
    const result = planTrip(members, destinations, mockFlightSource, CTX);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('NO_DATE_OVERLAP');
  });

  it('reports ALWAYS_OVER_BUDGET and names the member when a budget is too low', () => {
    // Assertion #8: Maria's budget at 100 is below every flight cost.
    const members = threePersonGroup({ sp: { budget: 100 } });
    const result = planTrip(members, destinations, mockFlightSource, CTX);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('ALWAYS_OVER_BUDGET');
    expect(result.reason).toContain('Maria');
  });

  it('reports MEMBER_NO_AVAILABILITY and names the member who painted nothing', () => {
    // Assertion #9.
    const members = threePersonGroup({ sp: { availableWeeks: [] } });
    const result = planTrip(members, destinations, mockFlightSource, CTX);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('MEMBER_NO_AVAILABILITY');
    expect(result.reason).toContain('Maria');
  });

  it('reports NO_MEMBERS for an empty group', () => {
    const result = planTrip([], destinations, mockFlightSource, CTX);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe('NO_MEMBERS');
  });
});
