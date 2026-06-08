/**
 * End-to-end data-journey test (no browser): exercises the SAME query functions
 * the server actions call, proving the multi-user shared-state path + engine
 * integration work against a real libSQL database.
 *
 * Run with: npm run journey   (uses a throwaway file DB)
 */
import {
  createUser,
  createGroup,
  findOrCreateUserByEmail,
  ensureMembership,
  setMemberInputs,
  setPaintedWeek,
  listMembers,
  getGroupPaints,
  insertProposalRows,
  getLatestRun,
  upsertReaction,
  listReactions,
  newRunId,
} from '../src/db/queries';
import { planTrip } from '../src/engine/fairness';
import { destinations, mockFlightSource } from '../src/engine/mockFlightSource';
import type { Member } from '../src/engine/types';
import { makeWindow } from '../src/lib/window';
import { weekCountBetween } from '../src/lib/week';

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error('ASSERT FAILED: ' + msg);
  console.log('  ✓ ' + msg);
}

async function main() {
  // 1. Organizer signs up and creates a group (becomes a member automatically).
  const yuki = await createUser('Yuki', `yuki+${Date.now()}@x.com`);
  const { windowStart, windowEnd } = makeWindow(Date.now());
  const group = await createGroup(yuki.id, 'Reunion 2027', windowStart, windowEnd);
  assert(group.inviteToken.length > 0, 'group created with invite token');

  // 2. Two friends open the invite link in "other browsers" and join.
  const { user: maria } = await findOrCreateUserByEmail('Maria', `maria+${Date.now()}@x.com`);
  const { user: liam } = await findOrCreateUserByEmail('Liam', `liam+${Date.now()}@x.com`);
  await ensureMembership(group.id, maria.id);
  await ensureMembership(group.id, liam.id);

  let members = await listMembers(group.id);
  assert(members.length === 3, 'three members are visible to everyone (shared state)');

  // Idempotent join: joining twice does not duplicate membership.
  await ensureMembership(group.id, maria.id);
  members = await listMembers(group.id);
  assert(members.length === 3, 'joining again does not fork membership');

  // 3. Each member sets airport + budget.
  const byEmailPrefix = (p: string) =>
    members.find((m) => m.user.email.startsWith(p))!;
  await setMemberInputs(byEmailPrefix('yuki').membership.id, 'NRT', 1500);
  await setMemberInputs(byEmailPrefix('maria').membership.id, 'GRU', 3000);
  await setMemberInputs(byEmailPrefix('liam').membership.id, 'LHR', 2000);

  // 4. Each paints overlapping availability (weeks 3,4,5).
  for (const m of members) {
    for (const w of [3, 4, 5]) await setPaintedWeek(m.membership.id, w, true);
  }
  members = await listMembers(group.id);
  const paints = await getGroupPaints(members.map((m) => m.membership.id));
  assert(
    members.every((m) => (paints[m.membership.id] ?? []).length === 3),
    'every member has 3 painted weeks persisted',
  );

  // 5. "Find us a trip": map DB members -> engine -> persist the run.
  const engineMembers: Member[] = members.map((m) => ({
    userId: m.user.id,
    name: m.user.name,
    homeAirport: m.membership.homeAirport!,
    budget: m.membership.budget!,
    availableWeeks: paints[m.membership.id] ?? [],
  }));
  const ctx = {
    windowStartMs: group.windowStart,
    weekCount: weekCountBetween(group.windowStart, group.windowEnd),
  };
  const result = planTrip(engineMembers, destinations, mockFlightSource, ctx);
  assert(result.ok, 'engine produced valid proposals');
  if (!result.ok) return;

  const runId = newRunId();
  const createdAt = Date.now();
  await insertProposalRows(
    result.proposals.map((p, i) => ({
      id: `${runId}-${i}`,
      groupId: group.id,
      runId,
      rank: i + 1,
      destinationCode: p.destinationCode,
      destinationName: p.destinationName,
      startWeekIndex: p.startWeekIndex,
      endWeekIndex: p.endWeekIndex,
      startDate: p.startDate,
      endDate: p.endDate,
      perMemberCost: JSON.stringify(p.perMemberCost),
      burdenSpread: p.burdenSpread,
      totalCost: p.totalCost,
      rationale: p.rationale,
      createdAt,
    })),
  );

  // 6. Another member refreshes and sees the persisted proposals + rationale.
  const latest = await getLatestRun(group.id);
  assert(latest.length >= 1 && latest.length <= 3, 'latest run has 1–3 proposals');
  assert(
    latest.every((r) => (r.rationale ?? '').includes('budget')),
    'every proposal has a rationale sentence',
  );
  console.log('    →', latest[0].rationale);

  // 7. Reactions: Maria accepts, Liam suggests a change — visible to all.
  await upsertReaction(latest[0].id, maria.id, 'accept', null);
  await upsertReaction(latest[0].id, liam.id, 'suggest', 'Can we find somewhere cheaper for me?');
  let reactions = await listReactions(latest.map((r) => r.id));
  assert(reactions.length === 2, 'two reactions recorded and visible');

  // Re-reacting updates rather than duplicates.
  await upsertReaction(latest[0].id, maria.id, 'suggest', 'changed my mind');
  reactions = await listReactions(latest.map((r) => r.id));
  assert(reactions.length === 2, 're-reacting updates in place (no duplicate)');
  assert(
    reactions.find((r) => r.user.id === maria.id)!.reaction.kind === 'suggest',
    "Maria's reaction updated to suggest",
  );

  console.log('\n✅ Full journey passed end-to-end.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
