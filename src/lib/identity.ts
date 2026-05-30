/**
 * Coat-check identity: a user is whoever holds a valid token.
 *
 * The token lives in the user's personal URL (/me/[token]); we also mirror it to
 * a cookie so the group surface can identify "me" without the token in every
 * link. This is identity, NOT security — fine for ~5 trusted testers.
 * // TODO: post-v0 — real auth/sessions.
 */
import 'server-only';
import { cookies } from 'next/headers';
import { findUserByToken } from '../db/queries';
import type { User } from '../db/schema';

export const TOKEN_COOKIE = 'cv_token';

/** Persist the active user's token in a cookie (mirrors the URL token). */
export async function setTokenCookie(token: string): Promise<void> {
  const jar = await cookies();
  jar.set(TOKEN_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  });
}

export async function clearTokenCookie(): Promise<void> {
  (await cookies()).delete(TOKEN_COOKIE);
}

/** The current user from the cookie token, or null if not signed in. */
export async function currentUser(): Promise<User | null> {
  const token = (await cookies()).get(TOKEN_COOKIE)?.value;
  if (!token) return null;
  return (await findUserByToken(token)) ?? null;
}

/** Resolve a user by an explicit token (e.g. from a /me/[token] URL). */
export async function userFromToken(token: string): Promise<User | null> {
  return (await findUserByToken(token)) ?? null;
}
