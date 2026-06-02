# Test Convergence on your phone (dev tunnel)

This exposes the app running on your Mac to a temporary public URL you can open
on your phone. Your Mac must stay on and keep the dev server running.

> Heads up: a tunnel points at **your Mac**, so the app has to be running there
> first. Get `npm run dev` working locally before tunneling.

## 0. One-time: get the code running on your Mac

```bash
git clone https://github.com/jcobrew/carps.git
cd carps
git checkout claude/hopeful-hawking-YncK1   # branch with the tunnel fixes
npm install
cp .env.example .env.local
npm run db:push                              # creates local dev.db
```

Confirm it works locally first — open http://localhost:3000 on the Mac:

```bash
npm run dev
```

## 1. Start the dev server with your tunnel host allowed

A tunnel URL is a *different* hostname than `localhost`, which trips two Next.js
origin guards (Server Actions CSRF + the dev-asset block). `ALLOWED_ORIGINS`
opens both. A wildcard covers the random subdomain you get each run, so you set
it **once**:

```bash
# Cloudflare Tunnel (recommended — no signup):
ALLOWED_ORIGINS="*.trycloudflare.com" npm run dev

# …or ngrok:
ALLOWED_ORIGINS="*.ngrok-free.app" npm run dev
```

Leave this running.

## 2. Open the tunnel (new terminal tab, Mac stays on)

### Option A — Cloudflare Tunnel (no account needed)

```bash
brew install cloudflared          # once
cloudflared tunnel --url http://localhost:3000
```

It prints a URL like `https://random-words-1234.trycloudflare.com`.

### Option B — ngrok

```bash
brew install ngrok                # once
# free ngrok needs a one-time token from https://dashboard.ngrok.com:
# ngrok config add-authtoken <YOUR_TOKEN>
ngrok http 3000
```

It prints a URL like `https://abcd-12-34.ngrok-free.app`.

## 3. Open that URL on your phone

Type/scan the printed `https://…` URL on your phone. Sign up, create a group,
copy the invite link, and you can even open the invite on a second device to
test the multi-person flow.

---

### If something doesn't load

- **"Invalid Server Actions request." / blocked `/_next` asset** → the tunnel
  host isn't in `ALLOWED_ORIGINS`. Make sure you started `npm run dev` with the
  wildcard above (`*.trycloudflare.com` or `*.ngrok-free.app`) and **restart**
  the dev server after changing it. If your tunnel uses a different domain, add
  it: `ALLOWED_ORIGINS="*.trycloudflare.com,*.some-other-tunnel.com"`.
- **Page never loads at all** → confirm `npm run dev` is up on the Mac and
  http://localhost:3000 works there; the tunnel only forwards to that.
- **Want a stable URL / share with friends for real** → a dev tunnel is
  throwaway and tied to your Mac. For lasting multi-person testing, deploy to
  Vercel + Turso instead (the DB layer already supports it — see
  `src/db/client.ts`).
