import type { NextConfig } from "next";

/**
 * Server Actions are guarded by a same-origin (CSRF) check: Next.js compares the
 * request's `origin` header against the server's host and rejects the action with
 * "Invalid Server Actions request." when they differ. That mismatch is expected
 * when the app is reached through a proxy or preview URL (e.g. a cloud dev
 * environment), where the public hostname isn't the one the server sees.
 *
 * Set SERVER_ACTIONS_ALLOWED_ORIGINS to a comma-separated list of the host(s)
 * you reach the app from — host only, no protocol — to allow them through, e.g.
 *   SERVER_ACTIONS_ALLOWED_ORIGINS="my-app.preview.example.com,*.preview.example.com"
 * Subdomain wildcards (`*.example.com`) are supported. Same-origin requests are
 * always allowed, so this can stay unset for plain `localhost` development.
 */
const allowedOrigins = process.env.SERVER_ACTIONS_ALLOWED_ORIGINS
  ?.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
  ...(allowedOrigins?.length
    ? { experimental: { serverActions: { allowedOrigins } } }
    : {}),
};

export default nextConfig;
