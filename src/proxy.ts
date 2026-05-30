import { NextResponse, type NextRequest } from 'next/server';

// Kept in sync with TOKEN_COOKIE in lib/identity.ts. Inlined so this edge
// middleware doesn't pull the server-only DB module graph into its bundle.
const TOKEN_COOKIE = 'cv_token';

/**
 * Visiting your personal link (/me/<token>) establishes identity by mirroring
 * the URL token into the cookie. Cookies can't be written during a Server
 * Component render, so this is the right place to do it.
 */
export function proxy(req: NextRequest) {
  const match = req.nextUrl.pathname.match(/^\/me\/([^/]+)\/?$/);
  if (!match) return NextResponse.next();

  const res = NextResponse.next();
  res.cookies.set(TOKEN_COOKIE, match[1], {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  });
  return res;
}

export const config = { matcher: '/me/:path*' };
