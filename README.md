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
- **Drizzle ORM + libSQL/Turso** for persistence — the same code runs against a
  local SQLite file in dev and hosted Turso in production.
- **Vitest** for the engine unit tests.

## Run it locally

```bash
npm install
cp .env.example .env.local      # defaults to a local SQLite file (file:./dev.db)
npm run db:push                 # create the tables
npm run dev                     # http://localhost:3000
```

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

## Deploy (Vercel + Turso)

A local SQLite/JSON file does **not** persist or share across requests on Vercel's
serverless filesystem, which would break the "two browsers see the same state"
requirement. Use hosted **Turso** (still libSQL/SQLite) — same code, just env vars.

```bash
# 1. Create a free Turso DB (https://turso.tech)
turso db create convergence
turso db show convergence --url        # -> TURSO_DATABASE_URL
turso db tokens create convergence     # -> TURSO_AUTH_TOKEN

# 2. Push the schema to it
TURSO_DATABASE_URL=libsql://... TURSO_AUTH_TOKEN=... npm run db:push

# 3. Deploy to Vercel and set the two env vars in the project settings:
#    TURSO_DATABASE_URL, TURSO_AUTH_TOKEN
#    (optionally NEXT_PUBLIC_BASE_URL for nicer absolute invite links)
vercel
```

### Share today without deploying

To test with friends in one session from your laptop, expose the local dev server
with a tunnel:

```bash
npx localtunnel --port 3000      # or: ngrok http 3000
```

Share the tunnel URL. (The tunnel dies when your laptop sleeps; use the Turso +
Vercel deploy for an always-on link.)

## Known v0 limitations (intentional)

- **Identity is a bearer token in the URL** — zero security; fine for trusted
  testers, not beyond. Anyone with your personal link is you.
- **No realtime** — the surface is fresh on each refresh, not live-updating.
- Fixed 1-week trip length; mock flight data; no booking, payments, email/push,
  scheduler, or chat. These are deliberately out of scope (`// TODO: post-v0`).
