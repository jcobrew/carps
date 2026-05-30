'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createGroup } from '../db/queries';
import { currentUser } from '../lib/identity';
import { makeWindow } from '../lib/window';

const createGroupSchema = z.object({
  name: z.string().trim().min(1, 'Group name is required').max(80),
  // yyyy-mm-dd from a date input; the window starts the Monday on/after it.
  startDate: z.string().trim().min(1, 'A start date is required'),
});

/** Create a group owned by the current user and go to its shared surface. */
export async function createGroupAction(formData: FormData): Promise<void> {
  const me = await currentUser();
  if (!me) redirect('/');

  const parsed = createGroupSchema.safeParse({
    name: formData.get('name'),
    startDate: formData.get('startDate'),
  });
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? 'Invalid input';
    redirect(`/groups/new?error=${encodeURIComponent(msg)}`);
  }

  const startMs = Date.parse(parsed.data.startDate + 'T00:00:00Z');
  const { windowStart, windowEnd } = makeWindow(
    Number.isNaN(startMs) ? Date.now() : startMs,
  );

  const group = await createGroup(me.id, parsed.data.name, windowStart, windowEnd);
  redirect(`/g/${group.inviteToken}`);
}
