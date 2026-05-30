/**
 * The single Drizzle client — Postgres via postgres-js (Supabase-friendly).
 *
 * Use Supabase's "Transaction pooler" connection string (port 6543 with
 * `?pgbouncer=true`). It's the right one for serverless because connections are
 * short-lived. We pass `prepare: false` to postgres-js because PgBouncer in
 * transaction mode does not support session-level prepared statements.
 *
 * The client is built lazily so module evaluation never requires the env var —
 * this matters because Next.js imports server modules at build-time to collect
 * page data, before any environment-provided runtime config exists.
 */
import 'server-only';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres, { type Sql } from 'postgres';
import * as schema from './schema';

type DB = ReturnType<typeof drizzle<typeof schema>>;

let _sql: Sql | undefined;
let _db: DB | undefined;

function getDb(): DB {
  if (_db) return _db;
  const connectionString = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
  if (!connectionString) {
    throw new Error(
      'DATABASE_URL is not set. Paste your Supabase Transaction pooler URL into .env.local',
    );
  }
  _sql = postgres(connectionString, { prepare: false });
  _db = drizzle(_sql, { schema });
  return _db;
}

// Proxy so call sites keep using `db.query.users.findFirst(...)` etc. The real
// client is created on the first property access, not on module import.
export const db = new Proxy({} as DB, {
  get(_target, prop) {
    const real = getDb() as unknown as Record<string | symbol, unknown>;
    const value = real[prop];
    return typeof value === 'function' ? value.bind(real) : value;
  },
});

export { schema };
