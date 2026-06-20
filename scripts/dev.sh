#!/bin/bash
# Start Claw on a phone plugged in over USB.
#
#   ./scripts/dev.sh              start everything
#   ./scripts/dev.sh --clear      same, but wipe the Metro cache first
#                                 (use this if the app talks to the wrong server)
#
# Starts the backend, points your phone at it over the USB cable, and opens the
# app in Expo Go. Press Ctrl-C to stop everything.

set -e
cd "$(git rev-parse --show-toplevel)"

GREEN=$'\033[32m'; RED=$'\033[31m'; YELLOW=$'\033[33m'; DIM=$'\033[2m'; OFF=$'\033[0m'
ok()   { echo "  ${GREEN}✓${OFF} $1"; }
bad()  { echo "  ${RED}✗${OFF} $1"; }
warn() { echo "  ${YELLOW}!${OFF} $1"; }
step() { echo; echo "${DIM}$1${OFF}"; }

BACKEND_LOG=/tmp/claw-backend.log

cleanup() {
  echo
  echo "${DIM}stopping…${OFF}"
  [ -n "$BACKEND_PID" ] && kill "$BACKEND_PID" 2>/dev/null || true
  exit 0
}
trap cleanup INT TERM

echo
echo "  Claw — starting up"

# ---------------------------------------------------------------- prerequisites
step "Checking what's installed"

command -v node >/dev/null || { bad "Node.js is not installed — get it from nodejs.org"; exit 1; }
ok "node $(node --version)"

if ! command -v adb >/dev/null; then
  bad "adb is not installed. On a Mac:  brew install android-platform-tools"
  exit 1
fi
ok "adb found"

# ---------------------------------------------------------------- phone
step "Looking for your phone"

if ! adb devices | grep -qw "device"; then
  bad "No phone detected."
  echo
  echo "     1. Plug the phone in with a USB cable"
  echo "     2. On the phone: Settings → Developer options → USB debugging  (turn ON)"
  echo "     3. Unlock the phone — a popup asks you to allow this computer. Tap Allow."
  echo
  echo "     Then run this again."
  exit 1
fi

MODEL=$(adb shell getprop ro.product.model 2>/dev/null | tr -d '\r')
ok "connected: ${MODEL:-Android device}"

if ! adb shell pm list packages 2>/dev/null | grep -q host.exp.exponent; then
  bad "Expo Go is not installed on the phone."
  echo "     Install 'Expo Go' from the Play Store, then run this again."
  exit 1
fi
ok "Expo Go installed"

# ---------------------------------------------------------------- dependencies
step "Checking dependencies"

if [ ! -d node_modules ]; then
  warn "installing app dependencies (first run — this takes a few minutes)"
  npm install
fi
ok "app dependencies"

if [ ! -d backend/node_modules ]; then
  warn "installing backend dependencies"
  (cd backend && npm install)
fi
ok "backend dependencies"

if [ ! -f backend/.env ]; then
  bad "backend/.env is missing — the server can't reach the database without it."
  echo "     Copy backend/.env.example to backend/.env and fill in the Supabase details."
  echo "     Ask Om if you don't have them."
  exit 1
fi
ok "backend/.env present"

# ------------------------------------------------------- server address sanity
# The phone reaches this computer through the USB cable, so the app must call
# localhost — NOT a wifi IP address, which changes every time you move network.
API_LINE=$(grep -h '^EXPO_PUBLIC_API_URL=' .env.local .env 2>/dev/null | head -1 || true)
if [ -n "$API_LINE" ] && ! echo "$API_LINE" | grep -q 'localhost'; then
  warn "your .env points the app at a fixed IP address, which usually breaks."
  echo "     Fixing it for this machine by writing .env.local …"
  echo 'EXPO_PUBLIC_API_URL=http://localhost:3000/api' > .env.local
  ok "wrote .env.local (local only, not committed)"
  CLEAR_CACHE=1
fi

# ---------------------------------------------------------------- usb tunnels
step "Connecting phone to this computer over USB"

adb reverse tcp:3000 tcp:3000 >/dev/null
adb reverse tcp:8081 tcp:8081 >/dev/null
ok "phone can now reach this computer (no wifi needed)"

# ---------------------------------------------------------------- backend
step "Starting the backend server"

if lsof -nP -iTCP:3000 -sTCP:LISTEN >/dev/null 2>&1; then
  ok "already running on port 3000"
else
  (cd backend && npm run dev > "$BACKEND_LOG" 2>&1) &
  BACKEND_PID=$!
  for _ in $(seq 1 30); do
    lsof -nP -iTCP:3000 -sTCP:LISTEN >/dev/null 2>&1 && break
    sleep 1
  done
  if lsof -nP -iTCP:3000 -sTCP:LISTEN >/dev/null 2>&1; then
    ok "backend running on port 3000"
  else
    bad "backend failed to start. Last lines of the log:"
    tail -15 "$BACKEND_LOG" | sed 's/^/       /'
    exit 1
  fi
fi

# quick database reachability check — this is the failure people hit most
DB_ERR=$(grep -c 'ENOTFOUND\|fetch failed' "$BACKEND_LOG" 2>/dev/null || true)
if [ "${DB_ERR:-0}" -gt 0 ] 2>/dev/null; then
  warn "the backend can't reach the database."
  echo "     The Supabase project is probably PAUSED. Open supabase.com, sign in,"
  echo "     open the Claw project — that wakes it up — then run this again."
fi

# ---------------------------------------------------------------- app
step "Building the app and opening it on your phone"
echo "  ${DIM}first build takes ~30 seconds. Ctrl-C here stops everything.${OFF}"
echo

if [ "$1" = "--clear" ] || [ -n "$CLEAR_CACHE" ]; then
  rm -rf node_modules/.cache 2>/dev/null || true
  npx expo start --android --localhost --clear
else
  npx expo start --android --localhost
fi
