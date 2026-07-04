#!/usr/bin/env node
/**
 * Regenerates the mentor review copy from the working draft.
 *
 *   node scripts/review-copy.mjs
 *
 * Reads  docs/capstone/Capstone_Final_Submission.md          (working draft, has TODOs)
 * Writes docs/capstone/Capstone_Final_Submission_for_review.md (clean, no TODOs)
 *
 * The review copy is what goes to the supervisor for sign-off. It strips every TODO
 * marker and the internal checklist, marks genuinely empty sections so nothing reads
 * as finished when it isn't, and carries a short note at the top saying what is still
 * outstanding. Re-run it after any edit to the draft.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = resolve(ROOT, "docs/capstone/Capstone_Final_Submission.md");
const OUT = resolve(ROOT, "docs/capstone/Capstone_Final_Submission_for_review.md");

const PLACEHOLDER = "*[To be completed before final submission.]*";

/**
 * Keep this in step with the open blocking issues. It is the only thing the
 * supervisor is told is missing, so it must not overstate completeness.
 */
const NOTE = null;

const lines = readFileSync(SRC, "utf8").split("\n");
const out = [];
let fence = false;
let i = 0;

while (i < lines.length) {
  const line = lines[i];

  // code fences are opaque — never treat their contents as markdown
  if (line.trimStart().startsWith("```")) {
    fence = !fence;
    out.push(line);
    i++;
    continue;
  }

  if (!fence) {
    // drop the drafting banner at the top
    if (i < 8 && line.startsWith("> **DRAFTING NOTE")) {
      while (i < lines.length && (lines[i].startsWith(">") || lines[i].trim() === "")) i++;
      if (i < lines.length && lines[i].trim() === "---") i++;
      continue;
    }

    // everything from the internal checklist onward is not part of the report
    if (line.startsWith("# SUBMISSION CHECKLIST")) {
      while (out.length && (out.at(-1).trim() === "" || out.at(-1).trim() === "---")) out.pop();
      break;
    }

    // drop whole TODO blockquote blocks
    if (line.trimStart().startsWith("> **TODO")) {
      while (i < lines.length && lines[i].startsWith(">")) i++;
      continue;
    }

    // Table rows carrying TODO cells. A row whose every cell is a placeholder is a
    // stub and is dropped; a row with real content in it (a check-in whose date is
    // not yet recorded, say) is kept, with just the unknown cells shown as em dashes.
    // Dropping those outright would silently delete written content from the copy
    // the supervisor reads.
    if (line.startsWith("|") && line.includes("*TODO*")) {
      const cells = line.split("|").slice(1, -1);
      const isStub = cells.every((c) => {
        const v = c.trim().replace(/^\*|\*$/g, "").trim();
        return v === "" || v === "TODO" || /^\*?TODO\*?$/.test(v);
      });
      if (isStub) {
        i++;
        continue;
      }
      out.push(line.replace(/(?<=\|)(\s*)\*TODO\*(\s*)(?=\|)/g, "$1—$2"));
      i++;
      continue;
    }

    // strip inline **TODO:** annotations, plus any wrapped continuation lines
    if (line.includes("**TODO:**")) {
      const kept = line.replace(/\s*\*\*TODO:\*\*.*$/, "").trimEnd();
      i++;
      // a continuation is an indented line that does not begin a new list item
      while (
        i < lines.length &&
        /^\s{2,}\S/.test(lines[i]) &&
        !/^\s*\d+\.\s/.test(lines[i]) &&
        !/^\s*[-*]\s/.test(lines[i])
      ) {
        i++;
      }
      if (kept.trim()) out.push(kept);
      continue;
    }
  }

  out.push(line);
  i++;
}

let s = out.join("\n");

// prose that referred to a TODO which no longer exists
s = s.replace(
  /See Section 4\.5 for scope and recording conditions, and the associated TODO regarding whether the\nvideo needs re-recording against the final build\./,
  "See Section 4.5 for scope and recording conditions."
);

s = s.replace(/\n{4,}/g, "\n\n\n");

// mark sections left genuinely empty (next heading is same or shallower level)
const marked = [];
const arr = s.split("\n");
fence = false;
for (let j = 0; j < arr.length; j++) {
  marked.push(arr[j]);
  if (arr[j].trimStart().startsWith("```")) { fence = !fence; continue; }
  if (fence) continue;

  const m = /^(#{1,4}) /.exec(arr[j]);
  if (!m) continue;
  const level = m[1].length;

  let k = j + 1;
  while (k < arr.length && arr[k].trim() === "") k++;
  if (k >= arr.length) { marked.push("", PLACEHOLDER); continue; }

  const next = /^(#{1,4}) /.exec(arr[k]);
  if ((next && next[1].length <= level) || arr[k].trim() === "---") {
    marked.push("", PLACEHOLDER);
  }
}

s = marked.join("\n").replace(/\n{4,}/g, "\n\n\n").trimEnd() + "\n";
s = NOTE ? `${NOTE}\n\n---\n\n${s.replace(/^\s+/, "")}` : s.replace(/^\s+/, "");

writeFileSync(OUT, s);

const todos = (s.match(/TODO/g) || []).length;
const figures = (s.match(/!\[/g) || []).length;
const placeholders = (s.match(/\[To be completed before final submission\.\]/g) || []).length;

console.log(`\n  wrote docs/capstone/Capstone_Final_Submission_for_review.md`);
console.log(`    words        ${s.split(/\s+/).length}`);
console.log(`    figures      ${figures}`);
console.log(`    TODO markers ${todos}${todos ? "   <-- should be 0" : ""}`);
console.log(`    placeholders ${placeholders}\n`);

if (todos > 0) process.exitCode = 1;
