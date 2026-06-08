'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import {
  ensureMembership,
  findGroupByInvite,
  findMembership,
  findOrCreateUserByEmail,
  setMemberInputs,
} from '../db/queries';
import { currentUser, setTokenCookie } from '../lib/identity';
import { AIRPORT_LABELS } from '../lib/airports';

const joinSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(80),
  email: z.string().trim().email('A valid email is required').max(200),
});

/** Join a group via its invite token (find-or-create the user by email). */
export async function joinGroupAction(
  inviteToken: string,
  formData: FormData,
): Promise<void> {
  const group = await findGroupByInvite(inviteToken);
  if (!group) redirect('/');

  const parsed = joinSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
  });
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? 'Invalid input';
    redirect(`/g/${inviteToken}/join?error=${encodeURIComponent(msg)}`);
  }

  const { user } = await findOrCreateUserByEmail(parsed.data.name, parsed.data.email);
  await setTokenCookie(user.token);
  await ensureMembership(group.id, user.id);
  redirect(`/g/${inviteToken}`);
}

/** Join a group as an already-signed-in user (no name/email re-entry). */
export async function joinExistingAction(inviteToken: string): Promise<void> {
  const me = await currentUser();
  if (!me) redirect(`/g/${inviteToken}/join`);
  const group = await findGroupByInvite(inviteToken);
  if (!group) redirect('/');
  await ensureMembership(group.id, me.id);
  revalidatePath(`/g/${inviteToken}`);
  redirect(`/g/${inviteToken}`);
}

const inputsSchema = z.object({
  homeAirport: z.string().trim().refine((c) => c in AIRPORT_LABELS, 'Pick an airport'),
  budget: z.coerce.number().int().positive('Budget must be a positive number'),
});

/** Set the current user's airport + budget for a group. */
export async function setInputsAction(
  inviteToken: string,
  groupId: string,
  formData: FormData,
): Promise<{ error?: string }> {
  const me = await currentUser();
  if (!me) return { error: 'Please sign in first.' };

  const membership = await findMembership(groupId, me.id);
  if (!membership) return { error: 'You are not a member of this group.' };

  const parsed = inputsSchema.safeParse({
    homeAirport: formData.get('homeAirport'),
    budget: formData.get('budget'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }

  await setMemberInputs(membership.id, parsed.data.homeAirport, parsed.data.budget);
  revalidatePath(`/g/${inviteToken}`);
  return {};
}
