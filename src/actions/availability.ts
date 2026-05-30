'use server';

import { revalidatePath } from 'next/cache';
import { findMembership, setPaintedWeek } from '../db/queries';
import { currentUser } from '../lib/identity';

/** Toggle one painted week for the current user in a group. */
export async function paintWeekAction(
  inviteToken: string,
  groupId: string,
  weekIndex: number,
  available: boolean,
): Promise<{ error?: string }> {
  const me = await currentUser();
  if (!me) return { error: 'Please sign in first.' };

  const membership = await findMembership(groupId, me.id);
  if (!membership) return { error: 'You are not a member of this group.' };

  await setPaintedWeek(membership.id, weekIndex, available);
  revalidatePath(`/g/${inviteToken}`);
  return {};
}
