#!/usr/bin/env bash
# Render the capstone report as a .docx suitable for upload to Google Docs.
#
#   ./scripts/build-docx.sh
#
# Google Docs imports .docx faithfully: images embed, tables convert, and the
# heading structure becomes a navigable outline. Styling comes from
# scripts/pdf/reference.docx (Times New Roman 12 pt, 1.5 spacing, black
# headings, A4 with 1 inch margins); regenerate it with
# scripts/pdf/make-reference-docx.py.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
node "$ROOT/scripts/review-copy.mjs" >/dev/null
cd "$ROOT/docs/capstone"
pandoc Capstone_Final_Submission_for_review.md \
  -o Claw_Capstone_Report.docx \
  --resource-path=.:figures:screenshots \
  --lua-filter="$ROOT/scripts/pdf/keepfig.lua" \
  --reference-doc="$ROOT/scripts/pdf/reference.docx" \
  --wrap=preserve
echo "wrote docs/capstone/Claw_Capstone_Report.docx"
