#!/bin/bash
# UEMS — local dev launcher (backend :4000 + frontend :3000)
# Runs both servers against local Postgres `uems_local`, with reCAPTCHA disabled
# so you can log in with just email + password. Ctrl+C stops both.

set -u
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_PORT=4000
FRONTEND_PORT=3000

echo "=== UEMS Local Dev Startup ==="

# --- 0. Free our ports (kill stale dev servers) ---
for PORT in $BACKEND_PORT $FRONTEND_PORT; do
  PID=$(lsof -ti :$PORT 2>/dev/null)
  if [ -n "$PID" ]; then
    echo "  port $PORT busy (PID $PID) — killing..."
    kill -9 $PID 2>/dev/null
    sleep 1
  fi
done
echo "  ports $BACKEND_PORT and $FRONTEND_PORT free"

# --- 1. Dependencies (install only if missing) ---
[ -d "$PROJECT_DIR/backend/node_modules" ]  || ( echo "  installing backend deps...";  cd "$PROJECT_DIR/backend"  && npm install )
[ -d "$PROJECT_DIR/frontend/node_modules" ] || ( echo "  installing frontend deps..."; cd "$PROJECT_DIR/frontend" && npm install )

# --- 1b. Clear the frontend build cache (prevents stale-chunk / "__webpack_modules__
# [moduleId] is not a function" errors that HMR leaves behind after many edits) ---
echo "  clearing frontend .next cache..."
rm -rf "$PROJECT_DIR/frontend/.next"

# --- 2. Prisma: ensure the client + local schema are current (adds tokenVersion etc.) ---
echo "  syncing Prisma client + schema..."
cd "$PROJECT_DIR/backend"
./node_modules/.bin/prisma generate >/dev/null 2>&1
./node_modules/.bin/prisma db push --skip-generate >/dev/null 2>&1 || echo "  (db push skipped — is Postgres running?)"

# --- 3. Start backend (reCAPTCHA disabled for frictionless local login) ---
echo "Starting backend on :$BACKEND_PORT ..."
cd "$PROJECT_DIR/backend"
RECAPTCHA_SECRET_KEY= BACKEND_PORT=$BACKEND_PORT npm run dev &
BACKEND_PID=$!

# --- 4. Wait for the backend to accept connections (first compile takes a few sec) ---
echo -n "  waiting for backend"
for _ in $(seq 1 40); do
  curl -s -o /dev/null "http://localhost:$BACKEND_PORT/api" 2>/dev/null && break
  echo -n "."; sleep 1
done
echo " up"

# --- 5. Start frontend (empty NEXT_PUBLIC_RECAPTCHA_SITE_KEY => captcha auto-skips) ---
echo "Starting frontend on :$FRONTEND_PORT ..."
cd "$PROJECT_DIR/frontend"
NEXT_PUBLIC_RECAPTCHA_SITE_KEY= PORT=$FRONTEND_PORT npm run dev &
FRONTEND_PID=$!

cat <<INFO

=== Running ===
  Frontend:  http://localhost:$FRONTEND_PORT   <-- open this in your browser
  Backend:   http://localhost:$BACKEND_PORT/api

  Login:     admin@kuk.ac.in      / admin123   (KUK University Admin)
             rajshtaya@gmail.com  / admin123   (Super Admin — sees all universities)

  To check the sunburst label-rotation:
    Dashboard -> scroll to a sunburst (radial) chart -> click a segment to drill in.
    Labels should flip from radial (top level) to tangential once drilled (depth >= 2).

  Press Ctrl+C to stop both servers.
INFO

# --- 6. Clean shutdown of both servers + their children ---
cleanup() {
  echo ""; echo "Stopping..."
  pkill -P "$BACKEND_PID" 2>/dev/null; pkill -P "$FRONTEND_PID" 2>/dev/null
  kill "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null
  exit 0
}
trap cleanup INT TERM
wait
