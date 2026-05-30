'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getProposalById, findMembership, upsertReaction } from '../db/queries';
import { currentUser } from '../lib/identity';

const reactSchema = z.object({
  kind: z.enum(['accept', 'suggest']),
  comment: z.string().trim().max(500).optional(),
});

/** Record (or update) the current user's Accept / Suggest-change reaction. */
export async function reactAction(
  inviteToken: string,
  proposalId: string,
  kind: 'accept' | 'suggest',
  comment?: string,
): Promise<{ error?: string }> {
  const me = await currentUser();
  if (!me) return { error: 'Please sign in first.' };

  const proposal = await getProposalById(proposalId);
  if (!proposal) return { error: 'Proposal not found.' };
  if (!(await findMembership(proposal.groupId, me.id))) {
    return { error: 'You are not a member of this group.' };
  }

  const parsed = reactSchema.safeParse({ kind, comment });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid reaction' };
  }

  await upsertReaction(
    proposalId,
    me.id,
    parsed.data.kind,
    parsed.data.comment?.length ? parsed.data.comment : null,
  );
  revalidatePath(`/g/${inviteToken}`);
  return {};
}
