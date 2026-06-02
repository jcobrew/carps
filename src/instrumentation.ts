/**
 * Runs once when a server instance starts (Next.js `register` hook).
 *
 * Bootstraps the database schema so a fresh deployment works without a separate
 * migration step — this is what makes a zero-terminal (e.g. phone-only) deploy
 * to Vercel + a brand-new Turso database usable immediately. The Edge runtime
 * can't open a DB connection, so we only run on Node.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { ensureSchema } = await import('./db/bootstrap');
    await ensureSchema();
  }
}
