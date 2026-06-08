import { defineConfig } from 'drizzle-kit';

// `npm run db:push` / `db:generate` against Postgres (Supabase).
// For migrations, use the DIRECT connection (port 5432) rather than the
// transaction pooler — pgbouncer can't run DDL safely.
export default defineConfig({
  schema: './src/db/schema.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url:
      process.env.DATABASE_URL_DIRECT ??
      process.env.DATABASE_URL ??
      process.env.POSTGRES_URL ??
      '',
  },
});
