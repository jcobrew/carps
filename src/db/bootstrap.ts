/**
 * Idempotent schema bootstrap.
 *
 * Creates the tables/indexes on first run if they don't already exist, so a
 * fresh deployment (e.g. a brand-new Turso database) is usable without a
 * separate `npm run db:push` migration step. Safe to run on every server start:
 * every statement uses `IF NOT EXISTS`.
 *
 * This mirrors `src/db/schema.ts` (and `drizzle/0000_*.sql`). When the schema
 * changes, update all three. For richer migrations later, prefer drizzle-kit;
 * this exists to make zero-terminal (phone-only) deploys work out of the box.
 */
import 'server-only';
import { createClient } from '@libsql/client';

const DDL = `
CREATE TABLE IF NOT EXISTS users (
  id text PRIMARY KEY NOT NULL,
  name text NOT NULL,
  email text NOT NULL,
  token text NOT NULL,
  created_at integer NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON users (email);
CREATE UNIQUE INDEX IF NOT EXISTS users_token_unique ON users (token);

CREATE TABLE IF NOT EXISTS groups (
  id text PRIMARY KEY NOT NULL,
  name text NOT NULL,
  invite_token text NOT NULL,
  created_by_id text NOT NULL REFERENCES users(id),
  window_start integer NOT NULL,
  window_end integer NOT NULL,
  created_at integer NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS groups_invite_token_unique ON groups (invite_token);

CREATE TABLE IF NOT EXISTS memberships (
  id text PRIMARY KEY NOT NULL,
  group_id text NOT NULL REFERENCES groups(id),
  user_id text NOT NULL REFERENCES users(id),
  home_airport text,
  budget integer,
  joined_at integer NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS memberships_group_id_user_id_unique ON memberships (group_id, user_id);

CREATE TABLE IF NOT EXISTS availability_paints (
  id text PRIMARY KEY NOT NULL,
  membership_id text NOT NULL REFERENCES memberships(id),
  week_index integer NOT NULL,
  available integer NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS availability_paints_membership_id_week_index_unique ON availability_paints (membership_id, week_index);

CREATE TABLE IF NOT EXISTS proposals (
  id text PRIMARY KEY NOT NULL,
  group_id text NOT NULL REFERENCES groups(id),
  run_id text NOT NULL,
  rank integer NOT NULL,
  destination_code text,
  destination_name text,
  start_week_index integer,
  end_week_index integer,
  start_date text,
  end_date text,
  per_member_cost text,
  burden_spread real,
  total_cost integer,
  rationale text,
  failure_code text,
  failure_reason text,
  created_at integer NOT NULL
);

CREATE TABLE IF NOT EXISTS reactions (
  id text PRIMARY KEY NOT NULL,
  proposal_id text NOT NULL REFERENCES proposals(id),
  user_id text NOT NULL REFERENCES users(id),
  kind text NOT NULL,
  comment text,
  created_at integer NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS reactions_proposal_id_user_id_unique ON reactions (proposal_id, user_id);
`;

let done: Promise<void> | undefined;

/**
 * Ensure the schema exists. Runs at most once per server instance; the DDL
 * itself is idempotent so concurrent/repeat runs are harmless.
 */
export function ensureSchema(): Promise<void> {
  if (!done) {
    const url = process.env.TURSO_DATABASE_URL ?? 'file:./dev.db';
    const authToken = process.env.TURSO_AUTH_TOKEN;
    const client = createClient(authToken ? { url, authToken } : { url });
    done = client.executeMultiple(DDL).catch((err) => {
      // Reset so a transient failure can be retried on the next call.
      done = undefined;
      throw err;
    });
  }
  return done;
}
