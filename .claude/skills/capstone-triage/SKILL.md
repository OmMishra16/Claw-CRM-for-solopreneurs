---
name: capstone-triage
description: Open, read, or update the Claw capstone triage board — the GitHub issues tracking everything left before submission. Use whenever someone asks to see the triage board, what's left, what they're assigned, what's blocking submission, or wants to claim, update, comment on, or close a capstone task. Also use for "open the triage", "show the board", "what's on my plate", "what's left for the capstone".
---

# Capstone triage

The Claw capstone has 21 tracked items, one GitHub issue each, in
`OmMishra16/Claw-CRM-for-solopreneurs`. **Issue number == checklist item number** (item 10 is
issue #10). All carry the `capstone` label.

Team: Om (`OmMishra16`), Yash (`Yash020405`), Divyanshu.

## First, refresh

Always regenerate before showing anything — the checked-in file may be stale:

```bash
node scripts/triage.mjs
```

This rewrites `docs/capstone/TRIAGE.md` from the live issues and recomputes the links into the
report. If `gh` is missing or unauthenticated the script says so; tell the user to run
`gh auth status` rather than guessing at the board's contents.

Then read `docs/capstone/TRIAGE.md` and summarise. Lead with what's **blocking** and what the
person asking actually owns — not all 21 rows unless they ask for everything.

## Reading it

Three priority tiers:

- **Blocking** (11) — the report is incomplete without these.
- **Important** (6) — materially affects marks.
- **Optional** (4) — strengthens the submission.

Rubric labels mark where the marks are: `rubric:continuous` (20), `rubric:documentation` (20),
`rubric:testing` (15), `rubric:presentation` (15). Implementation (30) is already earned — the
app is built and all 49 functional tests pass.

Every issue body contains the verbatim TODO from the report plus a line-anchored link to it. When
someone asks what an item *means*, read the issue body rather than re-deriving it:

```bash
gh issue view <n> --repo OmMishra16/Claw-CRM-for-solopreneurs
```

## Common operations

```bash
# what someone owns
gh issue list --repo OmMishra16/Claw-CRM-for-solopreneurs --assignee Yash020405 --state open

# only the blocking work
gh issue list --repo OmMishra16/Claw-CRM-for-solopreneurs --label blocking --state open

# where the marks are
gh issue list --repo OmMishra16/Claw-CRM-for-solopreneurs --label rubric:continuous

# claim, note progress, finish
gh issue edit <n>    --repo OmMishra16/Claw-CRM-for-solopreneurs --add-assignee <login>
gh issue comment <n> --repo OmMishra16/Claw-CRM-for-solopreneurs --body "<what changed>"
gh issue close <n>   --repo OmMishra16/Claw-CRM-for-solopreneurs -c "<how it was resolved>"
```

After any change, re-run `node scripts/triage.mjs` so the local board matches.

The project board is at https://github.com/users/OmMishra16/projects/3 — open it if someone wants
the kanban view rather than the file.

## Order of work

The last three steps are strictly sequential and people forget this:

**finish the report** → **send it for signature (#20)** → **build the viva deck (#21)**

Issue 21 cannot start until 20 is done, and 20 cannot start until the blocking items are closed.
If someone asks to start the deck while the report is unsigned, say so.

## Rules

- **Never edit `docs/capstone/TRIAGE.md` by hand.** It is generated. Change the issue, re-run the
  script.
- **Closing an issue means the work is done in the report**, not that it was discussed. Item 1 is
  closed when screenshots are actually in `Capstone_Final_Submission.md`.
- When an item is finished, the matching `> **TODO —**` block in the report should be deleted in
  the same change. The report is submitted with no TODO markers left —
  `grep -n "TODO" docs/capstone/Capstone_Final_Submission.md` must come back empty.
- Divyanshu is not yet a repo collaborator, so he cannot be assigned. If someone asks to assign
  him, say he needs an invite first rather than silently assigning someone else.
- Do not invent progress. If the board says an item is open, it is open.
