#!/usr/bin/env bash
set -euo pipefail

QDRANT_DIR="$(cd "$(dirname "$0")" && pwd)"
BIN_PATH="$QDRANT_DIR/qdrant/qdrant"
DATA_DIR="$QDRANT_DIR/data"
LOG_FILE="$DATA_DIR/qdrant.log"

# Load .env from repo root if present
REPO_ROOT="$(cd "$QDRANT_DIR/.." && pwd)"
if [[ -f "$REPO_ROOT/.env" ]]; then
  set -a
  source "$REPO_ROOT/.env"
  set +a
fi

HTTP_PORT="${QDRANT_HTTP_PORT:-6333}"
SERVICE_NAME="qdrant-local.service"

wait_ready() {
  echo "Waiting for Qdrant to be ready..."
  TIMEOUT=30
  ELAPSED=0
  while (( ELAPSED < TIMEOUT )); do
    if curl -sf "http://localhost:$HTTP_PORT/healthz" >/dev/null 2>&1; then
      echo "Qdrant is ready! (took ${ELAPSED}s)"
      echo ""
      echo "Health check:"
      curl -sf "http://localhost:$HTTP_PORT/healthz" 2>/dev/null || true
      echo ""
      exit 0
    fi
    sleep 1
    ELAPSED=$(( ELAPSED + 1 ))
  done

  echo "ERROR: Qdrant did not become ready within ${TIMEOUT}s"
  echo "Check logs: $LOG_FILE"
  exit 1
}

# Check if systemd user service is available
HAS_SYSTEMD=false
if [[ -f "$HOME/.config/systemd/user/$SERVICE_NAME" ]]; then
  if systemctl --user daemon-reload >/dev/null 2>&1; then
    HAS_SYSTEMD=true
  fi
fi

if $HAS_SYSTEMD; then
  # --- Systemd mode ---
  if systemctl --user is-active --quiet "$SERVICE_NAME" 2>/dev/null; then
    echo "Qdrant is already running via systemd (PID: $(systemctl --user show -p MainPID "$SERVICE_NAME" | cut -d= -f2))"
    echo "  gRPC port: ${QDRANT_GRPC_PORT:-6334}"
    echo "  HTTP port: $HTTP_PORT"
    exit 0
  fi

  echo "Starting Qdrant via systemd..."
  systemctl --user start "$SERVICE_NAME"
  wait_ready
else
  # --- Manual mode (fallback) ---
  if [[ ! -x "$BIN_PATH" ]]; then
    echo "Qdrant binary not found at $BIN_PATH"
    echo "Run: npm run qdrant:install"
    exit 1
  fi

  # Check if already running via port
  if fuser "${QDRANT_GRPC_PORT:-6334}/tcp" >/dev/null 2>&1; then
    echo "Qdrant is already running on port ${QDRANT_GRPC_PORT:-6334}"
    exit 0
  fi

  mkdir -p "$DATA_DIR/storage"

  echo "Starting Qdrant server..."
  echo "  Binary:    $BIN_PATH"
  echo "  gRPC port: ${QDRANT_GRPC_PORT:-6334}"
  echo "  HTTP port: $HTTP_PORT"
  echo "  Storage:   $DATA_DIR/storage"
  echo "  Logs:      $LOG_FILE"

  nohup bash -c "cd '$DATA_DIR' && exec '$BIN_PATH' --disable-telemetry" >> "$LOG_FILE" 2>&1 &
  SERVER_PID=$!
  echo "$SERVER_PID" > "$DATA_DIR/.qdrant.pid"

  echo "Started with PID: $SERVER_PID"
  echo ""
  wait_ready
fi
