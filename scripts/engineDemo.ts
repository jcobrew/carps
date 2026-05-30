/**
 * Sanity-check harness for the fairness engine (brief build-order step 2).
 *
 * Run with `npm run engine:demo`. Prints proposals for a hardcoded 3-person
 * group (Tokyo, São Paulo, Europe) against the real mock destinations, plus a
 * couple of failure cases — no UI or DB involved.
 */
import { planTrip } from '../src/engine/fairness';
import { mockFlightSource, destinations } from '../src/engine/mockFlightSource';
import type { Member, WindowContext } from '../src/engine/types';

const ctx: WindowContext = { windowStartMs: Date.UTC(2026, 2, 2), weekCount: 26 };

const group: Member[] = [
  { userId: 'tk', name: 'Yuki (Tokyo)', homeAirport: 'NRT', budget: 1500, availableWeeks: [2, 3, 4, 5] },
  { userId: 'sp', name: 'Maria (São Paulo)', homeAirport: 'GRU', budget: 3000, availableWeeks: [3, 4, 5, 6] },
  { userId: 'eu', name: 'Liam (London)', homeAirport: 'LHR', budget: 2000, availableWeeks: [1, 2, 3, 4, 5] },
];

function run(label: string, members: Member[]) {
  console.log(`\n=== ${label} ===`);
  const result = planTrip(members, destinations, mockFlightSource, ctx);
  if (!result.ok) {
    console.log(`  ✗ ${result.code}: ${result.reason}`);
    return;
  }
  result.proposals.forEach((p, i) => {
    console.log(`\n  #${i + 1}  ${p.destinationName} (${p.startDate} → ${p.endDate})`);
    console.log(`      ${p.rationale}`);
    console.log(
      `      spread=${p.burdenSpread.toFixed(3)}  total=$${p.totalCost}  ` +
        `costs=${JSON.stringify(p.perMemberCost)}`,
    );
  });
}

run('Fair trip for Yuki / Maria / Liam', group);
run('Maria has an impossible budget ($100)', group.map((m) => (m.userId === 'sp' ? { ...m, budget: 100 } : m)));
run('No overlapping weeks', [
  { ...group[0], availableWeeks: [0] },
  { ...group[1], availableWeeks: [1] },
  { ...group[2], availableWeeks: [2] },
]);
