'use server';

import { revalidatePath } from 'next/cache';
import {
  findGroupById,
  findMembership,
  getGroupPaints,
  insertProposalRows,
  listMembers,
  newRunId,
} from '../db/queries';
import { currentUser } from '../lib/identity';
import { planTrip } from '../engine/fairness';
import { destinations, mockFlightSource } from '../engine/mockFlightSource';
import type { Member } from '../engine/types';
import { weekCountBetween } from '../lib/week';

/**
 * The "Find us a trip" trigger. The ONLY place the engine meets the DB:
 * load members → map to engine inputs → run the fairness engine → persist the
 * run (proposals or a friendly failure) so it survives refreshes.
 */
export async function findTripAction(
  inviteToken: string,
  groupId: string,
): Promise<{ error?: string }> {
  const me = await currentUser();
  if (!me) return { error: 'Please sign in first.' };
  if (!(await findMembership(groupId, me.id))) {
    return { error: 'You are not a member of this group.' };
  }

  const group = await findGroupById(groupId);
  if (!group) return { error: 'Group not found.' };

  const members = await listMembers(groupId);
  const runId = newRunId();
  const createdAt = Date.now();

  // Everyone must have set an airport + budget for the plan to be fair to all.
  const notReady = members.filter(
    (m) => !m.membership.homeAirport || m.membership.budget == null,
  );
  if (notReady.length > 0) {
    const names = notReady.map((m) => m.user.name).join(', ');
    const reason = `Not everyone is ready yet — ${names} still need to set their home airport and budget.`;
    await insertProposalRows([
      { id: runId, groupId, runId, rank: 0, failureCode: 'NOT_READY', failureReason: reason, createdAt },
    ]);
    revalidatePath(`/g/${inviteToken}`);
    return {};
  }

  const paints = await getGroupPaints(members.map((m) => m.membership.id));
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

  if (!result.ok) {
    await insertProposalRows([
      {
        id: runId,
        groupId,
        runId,
        rank: 0,
        failureCode: result.code,
        failureReason: result.reason,
        createdAt,
      },
    ]);
  } else {
    await insertProposalRows(
      result.proposals.map((p, i) => ({
        id: `${runId}-${i}`,
        groupId,
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
  }

  revalidatePath(`/g/${inviteToken}`);
  return {};
}
