#!/bin/sh
# Capture a screenshot from the connected Android device straight into the repo.
#
#   ./scripts/shot.sh 01-login
#   ./scripts/shot.sh 03-dashboard
#
# Saves full-resolution PNGs to docs/capstone/screenshots/ — no gallery round-trip,
# no compression, no cropping needed.

set -e

if [ -z "$1" ]; then
  echo "usage: ./scripts/shot.sh <name>      e.g. ./scripts/shot.sh 03-dashboard"
  echo
  echo "Suggested names for the report (issue #1):"
  echo "  01-login              07-new-appointment"
  echo "  02-register           08-recurring-setup"
  echo "  03-dashboard          09-conflict-error"
  echo "  04-client-list        10-swipe-action"
  echo "  05-client-detail      11-analytics"
  echo "  06-service-catalog    12-inactive-clients"
  exit 1
fi

ROOT=$(git rev-parse --show-toplevel)
DIR="$ROOT/docs/capstone/screenshots"
mkdir -p "$DIR"

if ! adb get-state >/dev/null 2>&1; then
  echo "No device. Check the USB cable and that debugging is authorised on the phone."
  exit 1
fi

OUT="$DIR/$1.png"
adb exec-out screencap -p > "$OUT"

SIZE=$(wc -c < "$OUT" | tr -d ' ')
if [ "$SIZE" -lt 10000 ]; then
  echo "Capture looks empty (${SIZE} bytes) — is the screen on?"
  rm -f "$OUT"
  exit 1
fi

echo "saved docs/capstone/screenshots/$1.png ($(du -h "$OUT" | cut -f1))"
echo "captured so far: $(ls -1 "$DIR"/*.png 2>/dev/null | wc -l | tr -d ' ')/12"
