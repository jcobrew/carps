/**
 * The single Drizzle client — Postgres everywhere.
 *
 * Two modes, decided by env at startup:
 *
 *   1. DATABASE_URL set → use postgres-js against that host (e.g. Supabase).
 *      Use Supabase's "Transaction pooler" URL (port 6543, ?pgbouncer=true);
 *      we pass `prepare: false` because PgBouncer in transaction mode does
 *      not support session-level prepared statements.
 *
 *   2. DATABASE_URL not set → use PGlite, a real Postgres compiled to WASM
 *      that runs in-process and persists to `./local-db/`. Zero setup for
 *      local development; the schema is auto-migrated on first start.
 *
 * The client is built lazily so module evaluation never requires the env var —
 * matters because Next.js imports server modules at build-time to collect page
 * data, before runtime config exists.
 *
 * Call sites: `const db = await getDb();` then use Drizzle as usual.
 */
import 'server-only';
import path from 'node:path';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from './schema';

type DB = PostgresJsDatabase<typeof schema>;

let _dbPromise: Promise<DB> | undefined;

async function build(): Promise<DB> {
  const cs = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;

  if (cs) {
    const { drizzle } = await import('drizzle-orm/postgres-js');
    const postgresMod = await import('postgres');
    const postgres = postgresMod.default;
    const sql = postgres(cs, { prepare: false });
    return drizzle(sql, { schema });
  }

  // Local zero-setup mode: an embedded Postgres (PGlite, WASM) that persists
  // to ./local-db and auto-runs the migration SQL on first start.
  const { drizzle } = await import('drizzle-orm/pglite');
  const { PGlite } = await import('@electric-sql/pglite');
  const fs = await import('node:fs/promises');

  const dir = path.resolve(process.cwd(), 'local-db');
  const client = new PGlite(dir);
  const db = drizzle(client, { schema });

  // Apply the migration once, idempotently. We avoid drizzle's migrator here
  // because under Next's bundler its filesystem calls hit a URL-vs-string
  // mismatch; reading the SQL ourselves sidesteps that and is simpler.
  const exists = await client.query<{ exists: boolean }>(
    `SELECT to_regclass('public.users') IS NOT NULL AS exists`,
  );
  if (!exists.rows[0]?.exists) {
    const sqlPath = path.resolve(process.cwd(), 'drizzle', '0000_init.sql');
    const initSql = await fs.readFile(sqlPath, 'utf8');
    for (const stmt of initSql.split('--> statement-breakpoint')) {
      const trimmed = stmt.trim();
      if (trimmed) await client.exec(trimmed);
    }
  }

  return db as unknown as DB;
}

/**
 * Returns the Drizzle client, building (and migrating, for PGlite) on first
 * call. Memoized so subsequent calls share one connection.
 */
export function getDb(): Promise<DB> {
  if (!_dbPromise) _dbPromise = build();
  return _dbPromise;
}

export { schema };
