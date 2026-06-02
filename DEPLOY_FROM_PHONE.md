# Deploy Convergence from your phone (no computer needed)

This gets Convergence onto a real public URL you can open and share from your
phone — your Mac is not involved at all. Everything below is done in your
phone's browser. ~10 minutes, mostly tapping buttons.

You'll use two free services:

- **Turso** — the hosted database (the app's data lives here).
- **Vercel** — hosts and runs the app.

> The app creates its own database tables on first launch, so there's **no
> command-line migration step**. That's what makes this doable from a phone.

---

## Step 1 — Create the database (Turso)

1. Go to **https://turso.tech** and sign up (use "Continue with GitHub" — fastest).
2. Create a database (any name, e.g. `convergence`). Pick the default/nearest region.
3. Open the database and find its **connection details**. You need two values:
   - **Database URL** — looks like `libsql://convergence-yourname.turso.io`
   - **Auth token** — create/"Generate" one; it's a long string. Copy it now
     (you usually can't see it again).
4. Keep both somewhere you can paste from in Step 2.

> Turso's exact button labels move around; you're looking for the database's
> URL and an auth/access token. If you only see a `turso db show` / CLI hint,
> look for a "Connect", "Quickstart", or "Tokens" tab in the database view.

---

## Step 2 — Deploy the app (Vercel)

1. Go to **https://vercel.com** and sign up with **GitHub** (same account that
   has the `jcobrew/carps` repo).
2. Tap **Add New… → Project**, then **Import** the **`carps`** repository.
3. Before deploying, expand **Environment Variables** and add these three:

   | Name | Value |
   |------|-------|
   | `TURSO_DATABASE_URL` | the `libsql://…` URL from Step 1 |
   | `TURSO_AUTH_TOKEN` | the auth token from Step 1 |
   | `ALLOWED_ORIGINS` | `*.vercel.app` |

   (`ALLOWED_ORIGINS=*.vercel.app` lets Server Actions work on the Vercel
   preview/production domain. You can tighten it to your exact domain later.)

4. **Important — pick the branch:** in the project/import settings, set the
   **Production Branch** to **`claude/hopeful-hawking-YncK1`** (this is the
   branch with all the fixes). If Vercel only offers `main` at import time,
   deploy once, then go to **Settings → Git → Production Branch**, switch it to
   `claude/hopeful-hawking-YncK1`, and **Redeploy**.
5. Tap **Deploy** and wait for the build to finish (~1–2 min).

When it's done, Vercel gives you a URL like
`https://carps-yourname.vercel.app`.

---

## Step 3 — Use it on your phone

Open the Vercel URL on your phone:

1. Sign up (name + email) → you get your private personal link. **Bookmark it.**
2. Create a group → copy the invite link.
3. Send the invite link to a friend (or open it in another browser) to join as a
   second person.
4. Each person sets home airport + budget and paints the weeks they're free.
5. Tap **Find us a trip** → fairness-ranked proposals with plain-language reasons.
6. **Accept** or **Suggest a change**.

Because it's a real hosted URL backed by a hosted database, it works from
anywhere and is shareable — no Mac, no tunnel, no laptop staying on.

---

### Troubleshooting

- **Build fails on Vercel** → double-check you deployed the
  `claude/hopeful-hawking-YncK1` branch, and that all three env vars are set.
  After changing env vars or branch, trigger a **Redeploy**.
- **"Invalid Server Actions request."** → `ALLOWED_ORIGINS` is missing or wrong.
  It should include `*.vercel.app` (or your exact domain). Update it in
  **Settings → Environment Variables** and redeploy.
- **App loads but data doesn't save / 500 on sign-up** → the `TURSO_*` values
  are wrong or the token expired. Re-copy them from Turso and redeploy. (Tables
  are created automatically on the first request after a good connection.)
- **Want a nicer URL** → add a custom domain in Vercel's project settings, then
  set `ALLOWED_ORIGINS` to that domain.
