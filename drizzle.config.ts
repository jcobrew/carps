import { defineConfig } from 'drizzle-kit';

// `npm run db:push` creates/updates the tables. Uses the same env vars as the
// app: a local file by default, or Turso when TURSO_* are set.
export default defineConfig({
  schema: './src/db/schema.ts',
  dialect: 'turso',
  dbCredentials: {
    url: process.env.TURSO_DATABASE_URL ?? 'file:./dev.db',
    authToken: process.env.TURSO_AUTH_TOKEN,
  },
});
