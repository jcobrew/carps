import type { NextConfig } from "next";

/**
 * Reaching the app through a proxy, preview URL, or dev tunnel (ngrok,
 * cloudflared, …) trips two separate same-origin guards in Next.js, because the
 * public hostname isn't the one the server sees:
 *
 *  1. Server Actions CSRF check — compares the request `origin` against the host
 *     and otherwise rejects the action with "Invalid Server Actions request."
 *  2. The dev-server cross-origin block — refuses `/_next/*` dev assets from a
 *     foreign origin (configured via `allowedDevOrigins`).
 *
 * Set ALLOWED_ORIGINS to a comma-separated list of the host(s) you reach the app
 * from — host only, no protocol — and both guards are opened together, e.g.
 *   ALLOWED_ORIGINS="my-app.ngrok-free.app"
 *   ALLOWED_ORIGINS="*.ngrok-free.app,*.trycloudflare.com"
 * Subdomain wildcards (`*.example.com`) are supported, which is handy for tunnels
 * whose subdomain changes every run. Same-origin requests (including plain
 * `localhost`) are always allowed, so this can stay unset for local dev.
 *
 * SERVER_ACTIONS_ALLOWED_ORIGINS is still honoured as an alias for the Server
 * Actions list alone, for back-compat.
 */
function parseOrigins(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

const allowedOrigins = parseOrigins(process.env.ALLOWED_ORIGINS);
const serverActionOrigins = [
  ...allowedOrigins,
  ...parseOrigins(process.env.SERVER_ACTIONS_ALLOWED_ORIGINS),
];

const nextConfig: NextConfig = {
  ...(allowedOrigins.length ? { allowedDevOrigins: allowedOrigins } : {}),
  ...(serverActionOrigins.length
    ? { experimental: { serverActions: { allowedOrigins: serverActionOrigins } } }
    : {}),
};

export default nextConfig;
