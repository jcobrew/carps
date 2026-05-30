/**
 * The single Drizzle client. Swapping local <-> Turso is just the env vars:
 *   - Local dev:  TURSO_DATABASE_URL=file:./dev.db   (no auth token needed)
 *   - Production: TURSO_DATABASE_URL=libsql://<db>.turso.io  + TURSO_AUTH_TOKEN
 *
 * Keeping DB access behind this one module means a future move to a different
 * persistence layer touches only this file.
 */
import 'server-only';
import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './schema';

const url = process.env.TURSO_DATABASE_URL ?? 'file:./dev.db';
const authToken = process.env.TURSO_AUTH_TOKEN;

const client = createClient(authToken ? { url, authToken } : { url });

export const db = drizzle(client, { schema });
export { schema };
