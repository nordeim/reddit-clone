#!/bin/bash
set -euo pipefail

# embers — production startup script
# Starts both the Fastify backend (apps/server) and a static frontend server (apps/web/dist).
#
# Usage:
#   ./start_production.sh          # start both servers
#   ./start_production.sh stop     # stop both servers
#
# The backend runs via `npm run server:start-prod` which spawns a child `node`
# process. The stop command kills the entire process tree, not just the npm wrapper.

# cd /Home1/project/reddit-clone && pkill -f "node dist/index.js" 2>/dev/null; pkill -f "http.server 5173" 2>/dev/null; sleep 1; echo "Cleaned up old processes" && echo "=== Syntax check ===" && bash -n start_production.sh && echo "Syntax OK"
# cd /Home1/project/reddit-clone && echo "=== Port check ===" && (curl -sf http://localhost:5000/health > /dev/null 2>&1 && echo "Backend STILL responding") || echo "Port 5000 free ✓" && (curl -sf http://localhost:5173 > /dev/null 2>&1 && echo "Frontend STILL responding") || echo "Port 5173 free ✓" 

LOG_DIR="/tmp"
SERVER_LOG="$LOG_DIR/embers-server.log"
WEB_LOG="$LOG_DIR/embers-web.log"
SERVER_PID="$LOG_DIR/embers-server.pid"
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
echo "[1/5] Installing dependencies..."
npm install --no-audit --no-fund

# ---------------------------------------------------------------------------
# 3. Initialize the database (if not already seeded)
# ---------------------------------------------------------------------------
echo "[2/5] Checking database..."
[ -f packages/db/dev.db ] || npm run db:setup

# ---------------------------------------------------------------------------
# 4. Build all workspaces (topological: shared → db → server → web)
# ---------------------------------------------------------------------------
echo "[3/5] Building all workspaces..."
npm run build

# ---------------------------------------------------------------------------
# 5. Start the backend (Fastify, production mode, port 5000)
# ---------------------------------------------------------------------------
echo "[4/5] Starting backend (Fastify, port 5000, NODE_ENV=production)..."
nohup npm run server:start-prod > "$SERVER_LOG" 2>&1 &
echo "$!" > "$SERVER_PID"
echo "       PID: $(cat "$SERVER_PID")  |  log: $SERVER_LOG"

# ---------------------------------------------------------------------------
# 6. Start the frontend (static file server, port 5173)
# ---------------------------------------------------------------------------
echo "[5/5] Starting frontend (static server, port 5173)..."
nohup python3 -m http.server 5173 --directory apps/web/dist > "$WEB_LOG" 2>&1 &
echo "$!" > "$WEB_PID"
echo "       PID: $(cat "$WEB_PID")  |  log: $WEB_LOG"

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
echo "  Backend:   http://localhost:5000  (Fastify, NODE_ENV=production)"
echo "  Frontend:  http://localhost:5173  (static files from apps/web/dist)"
echo ""
echo "  Backend PID:  $(cat "$SERVER_PID")  |  log: $SERVER_LOG"
echo "  Frontend PID: $(cat "$WEB_PID")  |  log: $WEB_LOG"
echo ""
echo "  Stop:  $0 stop"
echo "  Logs:  tail -f $SERVER_LOG $WEB_LOG"
echo ""
echo "  NOTE: If you created .env from .env.example, edit it with real secrets:"
echo "        JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, CORS_ORIGIN"
