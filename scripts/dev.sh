#!/usr/bin/env bash
#
# Run the Adaptive SAT backend and/or frontend dev servers locally.
#
# Usage:
#   ./scripts/dev.sh [backend|frontend|all|stop]
#
#   backend   Start only the FastAPI backend on http://localhost:8000
#   frontend  Start only the Vite frontend on http://localhost:5173
#   all       Start both together (default). Both run in the background with
#             their combined logs streamed to this terminal; Ctrl+C stops both.
#   stop      Kill anything already listening on ports 8000/5173
#
set -uo pipefail
set -m # each backgrounded job gets its own process group, so cleanup() can
       # kill a job's whole subprocess tree (e.g. poetry -> uvicorn, or
       # npm -> turbo -> vite), not just the immediate wrapper process.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"
LOG_DIR="$ROOT_DIR/.dev-logs"
BACKEND_LOG="$LOG_DIR/backend.log"
FRONTEND_LOG="$LOG_DIR/frontend.log"

BACKEND_PID=""
FRONTEND_PID=""
TAIL_PID=""

cleanup() {
  if [ -n "$TAIL_PID" ] && kill -0 "$TAIL_PID" 2>/dev/null; then
    kill "$TAIL_PID" 2>/dev/null || true
  fi

  local pid
  for pid in "$FRONTEND_PID" "$BACKEND_PID"; do
    if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
      # Negative pid = whole process group, so this reaches the real
      # uvicorn/vite process, not just the subshell that launched it.
      kill -TERM -- "-$pid" 2>/dev/null || true
    fi
  done
}
trap cleanup EXIT INT TERM

node_is_compatible() {
  command -v node >/dev/null 2>&1 \
    && node -e "process.exit(require('node:util').styleText ? 0 : 1)" 2>/dev/null
}

# The frontend's build tooling (Vite/rolldown) needs Node 20.17+/22.9+, newer
# than macOS often defaults to. An interactive `nvm use 22` only patches the
# PATH of that one shell session — it does not carry into a script invoked
# from a different shell/tab, or one whose nvm default alias is older. So
# don't just warn: actively try to switch to a working version via nvm here,
# the same way the interactive `nvm use` would, before giving up.
ensure_compatible_node() {
  if node_is_compatible; then
    return 0
  fi

  local nvm_dir="${NVM_DIR:-$HOME/.nvm}"
  if [ -s "$nvm_dir/nvm.sh" ]; then
    set +u # nvm.sh itself isn't written to be `set -u`-safe
    # shellcheck disable=SC1090,SC1091
    \. "$nvm_dir/nvm.sh"
    local candidate
    for candidate in 22 20.19 lts/* default; do
      if nvm use "$candidate" >/dev/null 2>&1 && node_is_compatible; then
        echo "[frontend] switched to Node $(node -v) via nvm (nvm use $candidate)"
        set -u
        return 0
      fi
    done
    set -u
  fi

  echo "[frontend] error: Node $(node -v 2>/dev/null || echo 'not found') is too old for this frontend's build tooling (needs 20.17+ or 22.9+)." >&2
  echo "[frontend]        Install a newer version, then make it the default: nvm install 22 && nvm alias default 22" >&2
  return 1
}

ensure_frontend_deps() {
  if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
    echo "[frontend] installing dependencies..."
    (cd "$FRONTEND_DIR" && npm install)
  fi
}

# Returns 0 (and requires poetry) when backend/.env is present, meaning the
# user has set up a local non-Docker backend. Returns 1 otherwise, so the
# caller falls back to the Docker-based backend/scripts/start_backend.sh.
backend_prereqs_ok() {
  if [ ! -f "$BACKEND_DIR/.env" ]; then
    return 1
  fi
  if ! command -v poetry >/dev/null 2>&1; then
    echo "[backend] poetry not found. Install it: https://python-poetry.org/docs/#installation" >&2
    exit 1
  fi
  return 0
}

backend_via_docker() {
  if ! command -v docker >/dev/null 2>&1; then
    echo "[backend] backend/.env not found and Docker isn't available." >&2
    echo "          Run: cp backend/.env.example backend/.env   (then edit it with your local Postgres credentials)" >&2
    exit 1
  fi
  echo "[backend] backend/.env not found — starting via Docker (backend/scripts/start_backend.sh)"
  "$BACKEND_DIR/scripts/start_backend.sh"
}

# --- solo, foreground (direct terminal output, Ctrl+C stops it directly) ---

start_backend_foreground() {
  if backend_prereqs_ok; then
    echo "[backend] starting on http://localhost:8000 (poetry run uvicorn --reload)"
    (cd "$BACKEND_DIR" && poetry run uvicorn app.main:app --reload --port 8000)
  else
    backend_via_docker
  fi
}

start_frontend_foreground() {
  ensure_compatible_node || exit 1
  ensure_frontend_deps
  echo "[frontend] starting on http://localhost:5173"
  (cd "$FRONTEND_DIR" && npm run dev)
}

# --- combined mode: both backgrounded, logs streamed, one shared trap ---

start_backend_background() {
  if backend_prereqs_ok; then
    mkdir -p "$LOG_DIR"
    echo "[backend] starting on http://localhost:8000 (logs: $BACKEND_LOG)"
    (cd "$BACKEND_DIR" && poetry run uvicorn app.main:app --reload --port 8000) > "$BACKEND_LOG" 2>&1 &
    BACKEND_PID=$!
  else
    backend_via_docker
  fi
}

start_frontend_background() {
  ensure_compatible_node || exit 1
  ensure_frontend_deps
  mkdir -p "$LOG_DIR"
  echo "[frontend] starting on http://localhost:5173 (logs: $FRONTEND_LOG)"
  (cd "$FRONTEND_DIR" && npm run dev) > "$FRONTEND_LOG" 2>&1 &
  FRONTEND_PID=$!
}

run_all() {
  mkdir -p "$LOG_DIR"
  start_backend_background
  start_frontend_background

  echo ""
  echo "Both running. Press Ctrl+C to stop."
  echo ""

  # Stream both logs to this terminal. `wait` (below) is interrupted
  # immediately by Ctrl+C/SIGTERM, unlike blocking on a foreground command,
  # so the trap always gets a chance to clean up both background processes.
  tail -n +1 -f "$BACKEND_LOG" "$FRONTEND_LOG" &
  TAIL_PID=$!

  wait "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null
}

stop_all() {
  local found=false
  for port in 8000 5173; do
    pids="$(lsof -ti tcp:"$port" 2>/dev/null || true)"
    if [ -n "$pids" ]; then
      echo "Stopping process(es) on port $port: $pids"
      kill $pids 2>/dev/null || true
      found=true
    fi
  done
  if [ "$found" = false ]; then
    echo "Nothing running on ports 8000 or 5173."
  fi
}

case "${1:-all}" in
  backend)
    start_backend_foreground
    ;;
  frontend)
    start_frontend_foreground
    ;;
  all)
    run_all
    ;;
  stop)
    stop_all
    ;;
  -h|--help|help)
    sed -n '2,12p' "$0" | sed 's/^# \{0,1\}//'
    ;;
  *)
    echo "Unknown command: $1"
    echo "Usage: $0 [backend|frontend|all|stop]"
    exit 1
    ;;
esac
