---
name: claw-dev
description: Run, test, debug or change the Claw codebase — the React Native app and Express backend. Use when someone asks to start or run the app, get it onto their phone, seed demo data, take screenshots, run tests, or work on the frontend/backend/database. Also use for setup problems ("app won't connect", "network request failed", "login not working", "database error") and before making code changes, since it explains where things live and the rules that must hold.
---

# Working on Claw

Claw is a mobile operations hub for solo service providers: React Native (Expo) client, Express
backend, PostgreSQL on Supabase. It is a BSc capstone project — the report in `docs/capstone/`
describes the system and is graded alongside the code, so **code changes may need matching report
changes**.

## Running it

One command, phone plugged in over USB:

```bash
./scripts/dev.sh              # start everything
./scripts/dev.sh --clear      # same, but wipe the Metro cache first
```

It checks prerequisites, finds the phone, opens the USB tunnel, starts the backend, and launches
the app in Expo Go. Ctrl-C stops it. Prefer this over running `expo start` by hand — it handles
the failure modes below.

**Demo account** (already seeded): `demo.claw.capstone@gmail.com` / `claw2026`.
Reseed a clean one with `node scripts/seed-demo.mjs`.

**Screenshots**: `./scripts/shot.sh <name>` captures the phone straight into
`docs/capstone/screenshots/`.

## When it breaks

Work through these before anything else — they account for nearly every failure seen so far.

| Symptom | Cause | Fix |
|:--|:--|:--|
| "Network request failed" on login | `EXPO_PUBLIC_API_URL` in `.env` points at a stale LAN IP | It must be `http://localhost:3000/api`. Over USB, the phone's localhost is the laptop. |
| Fixed `.env` but still failing | Metro cached the old inlined value | `rm -rf node_modules/.cache` then `./scripts/dev.sh --clear`. `--clear` alone is not always enough. |
| Backend logs `ENOTFOUND ...supabase.co` | The Supabase project is **paused**, not deleted | Open supabase.com and open the Claw project. That wakes it. DNS returns NXDOMAIN while paused, which looks like deletion but is not. |
| No device found | USB debugging off, or the authorise prompt not accepted | Enable it in Developer options, unlock the phone, tap Allow. |
| Notifications warning in the log | Expo Go limitation, documented in report §6.3 | Not a bug. Ignore. |
| "Unable to activate keep awake" | Expo Go quirk | Harmless. Dismiss the toast before screenshotting. |

`EXPO_PUBLIC_*` variables are **inlined at bundle time**, not read at runtime. Changing one always
requires a Metro restart, usually a cache clear too.

## Layout

```
app/                      Expo Router screens — the file path is the route
  (auth)/                 login, register, forgot/reset password
  (tabs)/                 home, clients, services, analytics, settings
lib/api.ts                every backend call goes through here
context/AuthContext.tsx   session, token storage (Expo Secure Store)
backend/src/
  routes/                 auth, clients, services, appointments, analytics, ratings
  lib/scheduling.js       pure scheduling logic — unit tested
  middleware/auth.js      JWT verification
  schema.sql              database schema; run in the Supabase SQL editor
docs/capstone/            the graded report, screenshots, figures
scripts/                  dev.sh, shot.sh, seed-demo.mjs, triage.mjs, review-copy.mjs
```

## Tests

```bash
cd backend && npm test              # 27 tests, ~0.3s
cd backend && npm run test:coverage
```

Covers `src/lib/scheduling.js` at 100%. Tests live in `src/lib/__tests__/`.

**If you change scheduling logic, the tests are the specification** — read them before editing.
They encode two behaviours that look like bugs but are deliberate:

- Back-to-back appointments do **not** conflict. The predicate is strict (`<` and `>`), so one
  ending exactly as the next begins is allowed. Changing this to `<=`/`>=` would break normal use.
- A monthly series from the 31st overflows short months (31 Jan → 3 Mar), following JavaScript
  `Date` semantics. Asserted so a change is deliberate.

Known off-by-one: the 52-appointment cap refuses a weekly series running a full calendar year,
which needs 53. Recorded in report §3.1.4 and §6.4.

## Rules that must hold

These encode decisions argued for in the report. Breaking one silently makes the report wrong.

- **Every query filters by `user_id`.** There is no cross-user access anywhere. This is the whole
  authorisation model.
- **Conflict detection runs before every booking**, single or recurring, and recurring is
  **all-or-nothing**: if any generated date clashes, none are created.
- **`end_time` is stored, never derived at read time.** It is what keeps historical prices and
  durations correct after a service is edited.
- **Deleting a service sets `service_id` to NULL**, it does not cascade. Appointments survive.
  Deleting a client *does* cascade.
- **Passwords are bcrypt-hashed, never logged.** Reset codes expire in 15 minutes.
- **Never commit `.env`.** Ask a teammate for values. `backend/.env.example` lists the keys.

## Changing the report

The report lives in `docs/capstone/Capstone_Final_Submission.md` and carries inline `TODO`
markers for outstanding work. It must contain **zero** TODO markers when submitted.

The copy sent to the supervisor is generated, never hand-edited:

```bash
node scripts/review-copy.mjs
```

Outstanding work is tracked as GitHub issues — see the `capstone-triage` skill, or run
`node scripts/triage.mjs`. When you finish an item, delete its TODO block from the report in the
same change as closing the issue.
