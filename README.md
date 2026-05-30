# Convergence

A trip-planning agent for geographically-scattered friends. Each member adds a
home airport, a budget, and the weeks they're free; a **fairness engine** proposes
a shared destination + dates where the burden lands as evenly as possible — and
shows you, in plain language, *why* it's fair.

> The agent proposes; humans dispose. Nothing is ever booked and no money moves.
> This is a v0 prototype for testing with a handful of real friends.

## The fairness engine (the differentiator)

The engine (`src/engine/`) is a pure, dependency-free module, unit-tested in
isolation. For each candidate `(destination, week)` that falls inside the
availability **overlap of every member**, it computes each member's **burden** — a
blend of cost-vs-their-own-budget and flight duration (weighted equally; weights
are named constants in `src/engine/constants.ts`):

```
costRatio    = cost / member.budget
durationNorm = durationHours / DURATION_NORM_HOURS
burden       = W_COST * costRatio + W_DURATION * durationNorm
```

A candidate is **valid** only if *every* member is at or under their own budget.
Among valid candidates it ranks by the **smallest burden spread** (the gap between
the most- and least-burdened member), breaking ties by lowest total cost, and
returns the top 1–3 — each with a generated rationale sentence whose numbers are
true to the computed values, e.g.:

> *"Da Nang, Mar 12–17 — everyone lands within ~2h of each other's flight time,
> and nobody spends more than 85% of their budget."*

When nothing converges it returns a clear, friendly reason (no date overlap, a
member is always over budget, someone painted no availability, …).

### Swappable flight data

Flight estimates come through a clean `FlightDataSource` interface
(`src/engine/flightSource.ts`). Today it's backed by a hand-curated
`data/destinations.json` (mock costs/durations for ~12 SE/East-Asia hubs from a
set of origin airports). A real flight API can implement the same interface later
without touching the engine.

## Stack

- **Next.js 16 (App Router) + TypeScript**, Server Actions for all mutations.
- **Tailwind CSS** for styling.
- **Drizzle ORM + Postgres (Supabase)** for persistence — same code in dev and
  production; you just point `DATABASE_URL` at your Supabase project.
- **Vitest** for the engine unit tests.

## Run it locally

You need a Postgres database — the fastest path is a free [Supabase](https://supabase.com)
project (the same one you'll use in production):

```bash
npm install
cp .env.example .env.local      # paste your Supabase connection strings into this
npm run db:push                 # create the tables (uses DATABASE_URL_DIRECT)
npm run dev                     # http://localhost:3000
```

In Supabase: **Project Settings → Database → Connection string**:
- Use the **Transaction pooler** URL (port 6543, with `?pgbouncer=true`) for `DATABASE_URL` — the app uses this at runtime.
- Use the **Direct** URL (port 5432) for `DATABASE_URL_DIRECT` — `db:push` needs it because pgbouncer can't run DDL.

Then walk the whole journey:

1. Sign up (name + email, no password) — you get a private personal link.
2. Create a group → copy the invite link.
3. Open the invite link in **another browser / incognito** and join as a 2nd person.
4. Both set home airport + budget, and paint the weeks you're free.
5. Watch the merged availability heatmap light up.
6. Click **Find us a trip** → see 1–3 fairness-ranked proposals with rationales.
7. **Accept** or **Suggest a change** on each; refresh the other browser to see reactions.

There are no notifications — the group link is the single living surface; everyone
revisits it to see the latest.

### Verify

```bash
npm test            # engine unit tests (fairness ranking, validity gate, rationale truthfulness, failures)
npm run engine:demo # prints proposals for a hardcoded 3-person group to the console
npm run journey     # end-to-end data journey (2–3 members, convergence, reactions) against the DB
```

## Deploy (Vercel + Supabase)

Vercel's serverless filesystem is ephemeral, so the database must be hosted.
**Supabase** (Postgres) is the path here.

```bash
# 1. Create a free Supabase project (https://supabase.com) and grab two URLs
#    from Project Settings → Database → Connection string:
#      - "Transaction pooler" (port 6543, with ?pgbouncer=true) → DATABASE_URL
#      - "Direct"             (port 5432)                       → DATABASE_URL_DIRECT

# 2. Create the tables. Either run the included SQL file:
psql "$DATABASE_URL_DIRECT" -f drizzle/0000_init.sql
# ...or use drizzle-kit:
DATABASE_URL_DIRECT=... npm run db:push

# 3. On Vercel: Import the GitHub repo, set Production Branch to `convergence`,
#    and add one env var in Project Settings:
#       DATABASE_URL = <your Supabase Transaction pooler URL>
#    Then Deploy. Next.js is auto-detected.
```

The Supabase **SQL Editor** also works for step 2 — paste the contents of
`drizzle/0000_init.sql` and run.

## Known v0 limitations (intentional)

- **Identity is a bearer token in the URL** — zero security; fine for trusted
  testers, not beyond. Anyone with your personal link is you.
- **No realtime** — the surface is fresh on each refresh, not live-updating.
- Fixed 1-week trip length; mock flight data; no booking, payments, email/push,
  scheduler, or chat. These are deliberately out of scope (`// TODO: post-v0`).
