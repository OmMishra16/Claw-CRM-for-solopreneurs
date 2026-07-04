#!/usr/bin/env node
/**
 * Regenerates the front-matter lists in the capstone report.
 *
 *   node scripts/frontmatter.mjs
 *
 * Rewrites, in place, the three generated blocks in
 * docs/capstone/Capstone_Final_Submission.md:
 *
 *   Table of Contents   from the document headings
 *   List of Tables      from the `**Table N.M** — caption.` lines in the body
 *
 * and checks the hand-curated List of Figures against the `**Figure N.M**`
 * captions actually present, reporting any figure that appears in one but not
 * the other. The List of Figures keeps its short editorial titles, so it is
 * validated rather than overwritten.
 *
 * Page numbers are deliberately absent: markdown has no pagination. They are
 * added when the document is rendered to Word or PDF at final formatting.
 *
 * Re-run this after adding, removing or renumbering any heading, table or
 * figure. Never hand-edit between the BEGIN/END GENERATED markers.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = resolve(ROOT, "docs/capstone/Capstone_Final_Submission.md");

/** Headings that are front matter or internal, and so never listed in the ToC. */
const SKIP_HEADINGS = new Set([
  "Table of Contents",
  "SUBMISSION CHECKLIST",
]);

/** The checklist is stripped from the review copy, so its subsections stay out too. */
const SKIP_SECTION_FROM = "SUBMISSION CHECKLIST";

/**
 * Back matter is written with `##` so it does not restart chapter numbering, but it
 * sits alongside the chapters rather than inside Chapter 6. Promote it a level.
 */
const BACK_MATTER = new Set(["REFERENCES", "APPENDIX"]);

const raw = readFileSync(SRC, "utf8");
const eol = raw.includes("\r\n") ? "\r\n" : "\n";
const lines = raw.split(eol);

// ---------------------------------------------------------------- parse
const headings = [];
const tables = [];
const figures = [];

let fence = false;
let suppressed = false;
let seenTitle = false; // the document title is not itself a contents entry
let inChapters = false; // front matter sits at top level, not nested under the title
let backMatter = false; // references and appendix sit alongside the chapters

for (const line of lines) {
  if (/^```/.test(line)) {
    fence = !fence;
    continue;
  }
  if (fence) continue; // '#' inside a fence is a shell comment, not a heading

  const h = line.match(/^(#{1,3})\s+(.+?)\s*$/);
  if (h) {
    const title = h[2];
    if (title === SKIP_SECTION_FROM) suppressed = true;
    else if (h[1].length === 1) suppressed = false;

    if (h[1].length === 1) {
      if (!seenTitle) {
        seenTitle = true; // the report's own title line
        continue;
      }
      inChapters = true;
    }

    if (BACK_MATTER.has(title)) backMatter = true;

    if (!suppressed && !SKIP_HEADINGS.has(title)) {
      // Front-matter sections precede Chapter 1 and belong at the top level.
      const level = !inChapters ? 1 : backMatter ? h[1].length - 1 : h[1].length;
      headings.push({ level, title, front: !inChapters });
    }
    continue;
  }

  const t = line.match(/^\*\*Table ([A-Z0-9]+\.[0-9]+)\*\*\s*—\s*(.+?)\.?\s*$/);
  if (t) tables.push({ number: t[1], title: t[2] });

  for (const f of line.matchAll(/\*\*Figure ([0-9]+\.[0-9]+)\*\*/g)) {
    if (!figures.includes(f[1])) figures.push(f[1]);
  }
}

// ---------------------------------------------------------------- render
const toc = headings.map(({ level, title, front }) => {
  const indent = "  ".repeat(level - 1);
  return level === 1 && !front ? `${indent}- **${title}**` : `${indent}- ${title}`;
});

const lot = [
  "| Table | Title |",
  "|:--|:--|",
  ...tables.map((t) => `| ${t.number} | ${t.title} |`),
];

// ---------------------------------------------------------------- splice
function replaceBlock(all, name, body) {
  const begin = `<!-- BEGIN GENERATED: ${name} -->`;
  const end = `<!-- END GENERATED: ${name} -->`;
  const from = all.indexOf(begin);
  const to = all.indexOf(end);
  if (from === -1 || to === -1) {
    throw new Error(`markers for "${name}" not found in the report`);
  }
  return [...all.slice(0, from + 1), ...body, ...all.slice(to)];
}

let out = lines;
out = replaceBlock(out, "toc", toc);
out = replaceBlock(out, "lot", lot);
writeFileSync(SRC, out.join(eol), "utf8");

// ---------------------------------------------------------------- report
const listed = [...raw.matchAll(/^\| (\d+\.\d+) \| [^|]+ \|$/gm)].map((m) => m[1]);
const inLof = listed.filter((n) => figures.includes(n));
const missingFromLof = figures.filter((n) => !inLof.includes(n));
const missingFromBody = inLof.filter((n) => !figures.includes(n));

console.log(`  headings     ${headings.length}`);
console.log(`  tables       ${tables.length}`);
console.log(`  figures      ${figures.length}`);
if (missingFromLof.length) {
  console.log(`  ! captioned in the body but absent from the List of Figures: ${missingFromLof.join(", ")}`);
}
if (missingFromBody.length) {
  console.log(`  ! listed in the List of Figures but not captioned in the body: ${missingFromBody.join(", ")}`);
}
if (!missingFromLof.length && !missingFromBody.length) {
  console.log("  figures list agrees with the body");
}
console.log("\n  Page numbers are added when the document is paginated at final formatting.");
