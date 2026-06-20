#!/usr/bin/env node
/**
 * Regenerates docs/capstone/TRIAGE.md from the live GitHub issues.
 *
 *   node scripts/triage.mjs
 *
 * Pulls open + closed issues labelled `capstone`, groups them by priority, and
 * writes a board you can read locally or on GitHub. Draft line numbers are
 * recomputed from the current report on every run by searching for each TODO
 * marker, so the "context" links never go stale as the report is edited.
 *
 * Requires the GitHub CLI, authenticated:  gh auth status
 */

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const REPO = "OmMishra16/Claw-CRM-for-solopreneurs";
const DRAFT_PATH = "docs/capstone/Capstone_Final_Submission.md";
const OUT_PATH = resolve(ROOT, "docs/capstone/TRIAGE.md");
const BLOB = `https://github.com/${REPO}/blob/main/${DRAFT_PATH}?plain=1`;

/**
 * Checklist item -> a distinctive phrase inside its TODO block in the report.
 * Matching on text rather than line numbers is what keeps the links correct
 * after the report is edited.
 */
const MARKERS = {
  1: "This section is empty and carries significant marks",
  2: "The weekly log stops at 3 March 2026",
  3: "Phase 3, Section 11 was submitted with the advisor feedback",
  4: "This section requires completion",
  5: "Write the end-user manual",
  6: "The commit history needs attention",
  7: "Insert the commit history screenshot",
  8: "Generate the table of contents at render time",
  9: "insert submission date",
  10: "Add an automated test suite",
  11: "Redraw Figure 2.1 as a proper diagram",
  12: 'Phase 3 stated "22 REST API endpoints"',
  13: "This video was recorded for the Phase 2 proof of concept",
  14: "Select three or four short code listings",
  15: "Include the complete `CREATE TABLE` schema",
  16: "Deploy the Express backend to a free host",
  17: "The `ratings` module (2 endpoints",
  18: "Optionally re-run the performance measurements",
  19: "Confirm the repository is accessible to the evaluator",
  20: "Send the completed report to the supervisor for review and signature",
  21: "The viva deck is unwritten",
};

const TIERS = [
  ["blocking", "Blocking", "The report is incomplete without these"],
  ["important", "Important", "Materially affects marks"],
  ["optional", "Optional", "Strengthens the submission"],
];

function gh(args) {
  try {
    return execFileSync("gh", args, { encoding: "utf8", maxBuffer: 1 << 24 });
  } catch (err) {
    const msg = (err.stderr || err.message || "").toString().trim();
    console.error("\n  gh failed: " + msg.split("\n")[0]);
    console.error("  Check you are authenticated:  gh auth status\n");
    process.exit(1);
  }
}

/** Locate each TODO block in the current draft and return its line range. */
function draftAnchors() {
  const lines = readFileSync(resolve(ROOT, DRAFT_PATH), "utf8").split("\n");
  const anchors = {};
  for (const [item, marker] of Object.entries(MARKERS)) {
    const start = lines.findIndex(
      (l) => l.includes(marker) && (l.trimStart().startsWith(">") || l.includes("|"))
    );
    if (start === -1) continue;
    let end = start;
    while (end + 1 < lines.length && lines[end + 1].startsWith(">")) end++;
    anchors[item] = { a: start + 1, b: end + 1 };
  }
  return anchors;
}

/** Checklist item number, read back out of the issue body footer. */
function itemNumber(body) {
  const m = /Checklist item (\d+)/.exec(body || "");
  return m ? m[1] : null;
}

function tierOf(labels) {
  const names = labels.map((l) => l.name);
  for (const [key] of TIERS) if (names.includes(key)) return key;
  return "optional";
}

function rubricOf(labels) {
  const l = labels.map((x) => x.name).find((n) => n.startsWith("rubric:"));
  if (!l) return "";
  const map = {
    "rubric:continuous": "Continuous",
    "rubric:documentation": "Documentation",
    "rubric:testing": "Testing",
    "rubric:presentation": "Presentation",
  };
  return map[l] || "";
}

const issues = JSON.parse(
  gh([
    "issue", "list",
    "--repo", REPO,
    "--label", "capstone",
    "--state", "all",
    "--limit", "100",
    "--json", "number,title,state,assignees,labels,body,url",
  ])
);

const anchors = draftAnchors();
const missingAnchors = [];

const rows = issues.map((i) => {
  const item = itemNumber(i.body);
  const anc = item && anchors[item];
  if (item && !anc) missingAnchors.push(`#${i.number} (item ${item})`);
  return {
    number: i.number,
    url: i.url,
    title: i.title.replace(/^\[(BLOC|IMPO|OPTI)\]\s*/, ""),
    done: i.state === "CLOSED",
    who: (i.assignees || []).map((a) => a.login).join(", ") || "—",
    tier: tierOf(i.labels || []),
    rubric: rubricOf(i.labels || []),
    context: anc
      ? `[§ context](${BLOB}#L${anc.a}${anc.a === anc.b ? "" : `-L${anc.b}`})`
      : "—",
  };
});
rows.sort((x, y) => x.number - y.number);

const done = rows.filter((r) => r.done).length;
const open = rows.length - done;

const out = [];
out.push("# Claw Capstone — Triage Board");
out.push("");
out.push(
  "<!-- GENERATED FILE — do not edit by hand. Refresh with: node scripts/triage.mjs -->"
);
out.push("");
out.push(
  `**${done} of ${rows.length} done** · ${open} still open · ` +
    `[all issues](https://github.com/${REPO}/issues?q=is%3Aissue+label%3Acapstone)`
);
out.push("");
out.push(
  "Each row links to its GitHub issue and to the matching TODO in " +
    `[the report](${BLOB}). Line numbers are recomputed on every run, so the ` +
    "context links stay correct as the report changes."
);
out.push("");

for (const [key, name, blurb] of TIERS) {
  const group = rows.filter((r) => r.tier === key);
  if (!group.length) continue;
  const gdone = group.filter((r) => r.done).length;
  out.push(`## ${name} — ${gdone}/${group.length}`);
  out.push("");
  out.push(`_${blurb}_`);
  out.push("");
  out.push("| Done | # | Item | Owner | Rubric block | Context |");
  out.push("|:--|:--|:--|:--|:--|:--|");
  for (const r of group) {
    out.push(
      `| ${r.done ? "☑" : "☐"} | [${r.number}](${r.url}) | ${
        r.done ? `~~${r.title}~~` : r.title
      } | ${r.who} | ${r.rubric || "—"} | ${r.context} |`
    );
  }
  out.push("");
}

out.push("---");
out.push("");
out.push("### Submission sequence");
out.push("");
out.push(
  "These run in order: **finish the report** → **get it signed** (issue 20) → " +
    "**build the viva deck** (issue 21). Issue 21 cannot start until 20 is done."
);
out.push("");
out.push("<sub>Refresh this file with `node scripts/triage.mjs`.</sub>");
out.push("");

writeFileSync(OUT_PATH, out.join("\n"));

console.log(`\n  Claw capstone triage — ${done}/${rows.length} done, ${open} open`);
for (const [key, name] of TIERS) {
  const g = rows.filter((r) => r.tier === key);
  if (g.length) {
    console.log(`    ${name.padEnd(10)} ${g.filter((r) => r.done).length}/${g.length}`);
  }
}
if (missingAnchors.length) {
  console.log(
    `\n  note: no TODO found in the report for ${missingAnchors.join(", ")}` +
      ` — probably resolved and removed. Context shows "—" for those.`
  );
}
console.log(`\n  wrote docs/capstone/TRIAGE.md\n`);
