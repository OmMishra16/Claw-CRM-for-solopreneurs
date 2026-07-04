#!/usr/bin/env bash
# Render the capstone report to PDF in the required submission format:
# Times-metric serif, 12 pt body, 1.5 spacing, 1 inch margins, A4,
# page numbers bottom-centre, each chapter starting on a fresh page.
#
#   ./scripts/build-pdf.sh            # review copy (no TODOs)  -> Claw_Capstone_Report.pdf
#   ./scripts/build-pdf.sh --draft    # working draft (with TODOs)
#
# Requires: pandoc, xelatex, TeX Gyre Termes, DejaVu Sans Mono, FreeSerif.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT/docs/capstone"

if [[ "${1:-}" == "--draft" ]]; then
  SRC="Capstone_Final_Submission.md"; OUT="Claw_Capstone_Report_draft.pdf"
else
  node "$ROOT/scripts/review-copy.mjs"
  SRC="Capstone_Final_Submission_for_review.md"; OUT="Claw_Capstone_Report.pdf"
fi

pandoc "$SRC" -o "$OUT" \
  --pdf-engine=xelatex \
  --resource-path=.:figures:screenshots \
  --lua-filter="$ROOT/scripts/pdf/keepfig.lua" \
  --include-in-header="$ROOT/scripts/pdf/header.tex" \
  -V mainfont="TeX Gyre Termes" \
  -V monofont="DejaVu Sans Mono" -V monofontoptions="Scale=0.85" \
  -V fontsize=12pt -V papersize=a4 -V geometry:margin=1in -V linestretch=1.5 \
  -V colorlinks=true -V linkcolor=black -V urlcolor=black \
  --highlight-style=tango --wrap=preserve

echo "wrote docs/capstone/$OUT ($(pdfinfo "$OUT" | awk '/Pages/{print $2}') pages)"
