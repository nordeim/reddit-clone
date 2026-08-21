#!/bin/bash
set -euo pipefail

# embers — production startup script
# Starts a single Fastify process that serves BOTH the REST API and the
# built SPA (`apps/web/dist`) from one origin (Round 15).
#
# Usage:
#   ./start_production.sh          # build + start
#   ./start_production.sh stop     # stop
#
# Do NOT use `python -m http.server` for the SPA in production — it cannot
# handle POST (LIVE-CRIT-4) and emits no security headers (LIVE-CRIT-3).

# cd /Home1/project/reddit-clone && pkill -f "node dist/index.js" 2>/dev/null; pkill -f "http.server 5173" 2>/dev/null; sleep 1; echo "Cleaned up old processes" && echo "=== Syntax check ===" && bash -n start_production.sh && echo "Syntax OK"
# cd /Home1/project/reddit-clone && echo "=== Port check ===" && (curl -sf http://localhost:5000/health > /dev/null 2>&1 && echo "Backend STILL responding") || echo "Port 5000 free ✓" && (curl -sf http://localhost:5173 > /dev/null 2>&1 && echo "Frontend STILL responding") || echo "Port 5173 free ✓" 

LOG_DIR="/tmp"
SERVER_LOG="$LOG_DIR/embers-server.log"
SERVER_PID="$LOG_DIR/embers-server.pid"
WEB_LOG="$LOG_DIR/embers-web.log"
# Legacy path kept so `stop` still reaps a previous python http.server
# started by older versions of this script.
WEB_PID="$LOG_DIR/embers-web.pid"

# ---------------------------------------------------------------------------
# Stop function — kills backend + frontend and all their children
# ---------------------------------------------------------------------------
stop_embers() {
  local pid retval=0

  # Stop backend: kill tracked PID and all its descendants
  if [ -f "$SERVER_PID" ]; then
    pid=$(cat "$SERVER_PID")
    if kill -0 "$pid" 2>/dev/null; then
      echo "Stopping backend (PID $pid)..."
      # Kill the process group (npm spawns children in the same group)
      kill -- -"$pid" 2>/dev/null || kill "$pid" 2>/dev/null || true
      # Kill any surviving children (grandchildren of npm)
      pkill -P "$pid" 2>/dev/null || true
      # Fallback: kill by process name
      pkill -f "node dist/index.js" 2>/dev/null || true
    fi
    rm -f "$SERVER_PID"
  fi

  # Stop frontend
  if [ -f "$WEB_PID" ]; then
    pid=$(cat "$WEB_PID")
    if kill -0 "$pid" 2>/dev/null; then
      echo "Stopping frontend (PID $pid)..."
      kill "$pid" 2>/dev/null || true
    fi
    rm -f "$WEB_PID"
  fi

  echo "embers stopped."
  return 0
}

# Handle `stop` subcommand
if [ "${1:-}" = "stop" ] || [ "${1:-}" = "--stop" ]; then
  stop_embers
  exit 0
fi

echo "=== embers production startup ---"

# ---------------------------------------------------------------------------
# 1. Ensure .env exists (required for production secrets)
# ---------------------------------------------------------------------------
if [ ! -f .env ]; then
  if [ -f .env.example ]; then
    cp .env.example .env
    echo "[WARN] Created .env from .env.example — EDIT IT with real secrets before starting."
    echo "       Generate secrets: openssl rand -hex 32"
  else
    echo "[FATAL] .env.example not found. Cannot create .env." >&2
    exit 1
  fi
fi

# ---------------------------------------------------------------------------
# 2. Install dependencies
# ---------------------------------------------------------------------------
echo "[1/4] Installing dependencies..."
npm install --no-audit --no-fund

# ---------------------------------------------------------------------------
# 3. Initialize the database (if not already seeded)
# ---------------------------------------------------------------------------
echo "[2/4] Checking database..."
[ -f packages/db/dev.db ] || npm run db:setup

# ---------------------------------------------------------------------------
# 4. Build all workspaces (topological: shared → db → server → web)
# ---------------------------------------------------------------------------
echo "[3/4] Building all workspaces..."
npm run build

# ---------------------------------------------------------------------------
# 5. Start Fastify in production mode, serving the SPA from the same origin
# ---------------------------------------------------------------------------
echo "[4/4] Starting Fastify (port 5000, NODE_ENV=production, STATIC_DIR=apps/web/dist)..."
export STATIC_DIR="${STATIC_DIR:-$PWD/apps/web/dist}"
nohup npm run server:start-prod > "$SERVER_LOG" 2>&1 &
echo "$!" > "$SERVER_PID"
echo "       PID: $(cat "$SERVER_PID")  |  log: $SERVER_LOG"
echo "       STATIC_DIR=$STATIC_DIR"

# ---------------------------------------------------------------------------
# 7. Health check — poll /health for up to 10 seconds
# ---------------------------------------------------------------------------
echo ""
echo "Waiting for backend to respond to /health..."
for i in $(seq 1 10); do
  if curl -sf http://localhost:5000/health > /dev/null 2>&1; then
    echo "✓ Backend is healthy."
    break
  fi
  if [ "$i" -eq 10 ]; then
    echo "[WARN] Backend did not respond to /health within 10 seconds." >&2
    echo "       Check logs: tail -f $SERVER_LOG" >&2
  fi
  sleep 1
done

# ---------------------------------------------------------------------------
# 8. Summary
# ---------------------------------------------------------------------------
echo ""
echo "=== embers is running ==="
echo ""
echo "  Origin:  http://localhost:5000  (Fastify serves /api/* + /health + the SPA)"
echo "  SPA:     http://localhost:5000/          (HashRouter, #/login etc.)"
echo "  Health:  http://localhost:5000/health"
echo ""
echo "  PID:  $(cat "$SERVER_PID")  |  log: $SERVER_LOG"
echo ""
echo "  Stop:  $0 stop"
echo "  Logs:  tail -f $SERVER_LOG"
echo ""
echo "  NOTE: If you created .env from .env.example, edit it with real secrets:"
echo "        JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, CORS_ORIGIN"
echo "  Live cutover: point the public origin at this process. Do not put"
echo "        python -m http.server in front of it (POST → 501, no headers)."
