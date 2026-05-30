'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { findOrCreateUserByEmail } from '../db/queries';
import { setTokenCookie } from '../lib/identity';

const signUpSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(80),
  email: z.string().trim().email('A valid email is required').max(200),
});

/**
 * Sign up (or re-identify by email) and drop the user at their personal page.
 * No password — the returned URL token IS the identity.
 */
export async function signUpAction(formData: FormData): Promise<void> {
  const parsed = signUpSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
  });
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? 'Invalid input';
    redirect(`/?error=${encodeURIComponent(msg)}`);
  }
  const { user } = await findOrCreateUserByEmail(parsed.data.name, parsed.data.email);
  await setTokenCookie(user.token);
  redirect(`/me/${user.token}`);
}
