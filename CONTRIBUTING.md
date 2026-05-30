# Working on Claw

Everything you need to get the app running and make changes. Group 82 — Om, Yash, Divyanshu.

---

## Getting set up

**You need:** Node.js 18+, an Android phone, and a USB cable.

1. **Install Expo Go** on your phone from the Play Store.
2. **Turn on USB debugging** — Settings → About phone → tap *Build number* seven times, then
   Settings → Developer options → USB debugging.
3. **Install `adb`** — on a Mac: `brew install android-platform-tools`.
4. **Get `backend/.env`** from Om. It holds the database credentials and is deliberately not in
   the repository.
5. **Plug the phone in**, unlock it, and tap **Allow** on the popup that appears.

Then, from the project folder:

```bash
./scripts/dev.sh
```

That installs dependencies if needed, starts the backend, connects your phone over the cable, and
opens the app. Press Ctrl-C to stop everything.

**Sign in with the demo account:** `demo.claw.capstone@gmail.com` / `claw2026`. It already has
clients, services and appointments in it, so the dashboard and analytics look real.

---

## When something goes wrong

**"Network request failed" when logging in.**
The app is calling the wrong address. It must call `http://localhost:3000/api` — over the USB
cable, your phone's "localhost" is your laptop. If `.env` has an IP address like `10.51.4.187`,
that is a leftover from someone else's wifi and will never work on your machine.

```bash
echo 'EXPO_PUBLIC_API_URL=http://localhost:3000/api' > .env.local
./scripts/dev.sh --clear
```

If it still fails after that, the cache is holding the old value:

```bash
rm -rf node_modules/.cache
./scripts/dev.sh --clear
```

**Backend prints `ENOTFOUND ...supabase.co`.**
The database is asleep, not gone. Supabase pauses free projects that go unused. Open
[supabase.com](https://supabase.com), sign in, open the **Claw** project — that wakes it — then
start again. It looks alarming because DNS stops resolving entirely, but nothing is lost.

**No phone detected.** USB debugging is off, or you did not tap Allow on the phone. Unplug,
replug, unlock, and look for the popup.

**Warnings about `expo-notifications` or "keep awake".** Normal in Expo Go. Not bugs.

---

## Where things live

| Path | What it is |
|:--|:--|
| `app/` | The screens. Expo Router — the file's path *is* the URL, so `app/(tabs)/clients/index.tsx` is the clients tab. |
| `lib/api.ts` | Every call to the backend goes through here. |
| `context/AuthContext.tsx` | Who is logged in, and the stored token. |
| `backend/src/routes/` | The API — one file per resource. |
| `backend/src/lib/scheduling.js` | Recurring dates and overlap detection. Unit tested. |
| `backend/schema.sql` | The database structure. Run it in Supabase's SQL editor to build a fresh one. |
| `docs/capstone/` | The report we are graded on, plus screenshots and diagrams. |
| `scripts/` | The helper commands below. |

---

## Commands

```bash
./scripts/dev.sh                 # run the app on your phone
./scripts/dev.sh --clear         # same, clearing the cache (use when it misbehaves)
./scripts/shot.sh 03-dashboard   # screenshot the phone into docs/capstone/screenshots/
node scripts/seed-demo.mjs       # fill the demo account with realistic data
node scripts/triage.mjs          # refresh the to-do list from GitHub issues
node scripts/review-copy.mjs     # regenerate the supervisor's copy of the report
python3 scripts/build_deck.py    # rebuild the viva deck from its content spec
cd backend && npm test           # run the automated tests
```

## The viva deck

`docs/capstone/Claw_Capstone_Viva.pptx` is **generated**. Edit the content in
`scripts/build_deck.py` — the `SLIDES` dict near the top — then rebuild. Editing the .pptx by
hand means the next rebuild throws your changes away.

`docs/capstone/presentation.pptx` is the blank BITS template and must never be modified.

Illustrative images come from `python3 scripts/imagen.py` (Gemini). It needs `GEMINI_API_KEY` in
`.env`, and you should pass `--model gemini-3.1-flash-image`. Screenshots and architecture
diagrams are real assets, never generated.

There is no pptx renderer on this machine, so after rebuilding, open the deck and look at every
slide — text overflow is the failure the script cannot catch.

---

## Before you change code

**Read `backend/src/lib/__tests__/scheduling.test.js` before touching scheduling.** The tests
describe how it is supposed to behave, including two things that look wrong but are not:

- Back-to-back appointments do not clash. One ending at 11:00 and the next starting at 11:00 is
  fine and must stay fine.
- A monthly series starting on the 31st skips to the 3rd of the following month in short months.
  That is JavaScript's date behaviour and is recorded on purpose.

**Rules that must not be broken.** Each of these is explained and defended in the report, so
breaking one quietly makes the report untrue:

- Every database query filters by `user_id`. That is the entire security model.
- Bookings are checked for clashes first — and a recurring series is all-or-nothing. If one date
  clashes, none are created.
- `end_time` is saved with each appointment, not worked out later. That is what stops an edited
  service price from rewriting last month's earnings.
- Deleting a service keeps its past appointments. Deleting a client removes theirs.
- Never commit `.env`. If you need the values, ask.

---

## The report

The report in `docs/capstone/Capstone_Final_Submission.md` is graded. It contains `TODO` markers
for work still outstanding, and must have **none left** when we submit.

Remaining work is tracked as [GitHub issues](https://github.com/OmMishra16/Claw-CRM-for-solopreneurs/issues).
Each issue links to the exact part of the report it belongs to.

When you finish something:

1. Make the change in the report and delete that `TODO` block.
2. Close the issue, saying what you did.
3. Run `node scripts/review-copy.mjs` so the supervisor's copy stays current.

**Do not hand-edit `Capstone_Final_Submission_for_review.md` or `TRIAGE.md`** — both are generated.

---

## Order of the final steps

These cannot be done in parallel:

**Finish the report** → **send it to the supervisor and get it signed** (issue #20) → **build the
viva deck** (issue #21).

The deck presents what the signed report says, so building it earlier risks presenting content the
supervisor asks you to change.
