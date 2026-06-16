#!/usr/bin/env bash
set -euo pipefail

QDRANT_DIR="$(cd "$(dirname "$0")" && pwd)"
DATA_DIR="$QDRANT_DIR/data"
PID_FILE="$DATA_DIR/.qdrant.pid"

# Load .env if present
REPO_ROOT="$(cd "$QDRANT_DIR/.." && pwd)"
if [[ -f "$REPO_ROOT/.env" ]]; then
  set -a
  source "$REPO_ROOT/.env"
  set +a
fi

GRPC_PORT="${QDRANT_GRPC_PORT:-6334}"
SERVICE_NAME="qdrant-local.service"

# Stop via systemd if service is active
if systemctl --user is-active --quiet "$SERVICE_NAME" 2>/dev/null; then
  echo "Stopping Qdrant via systemd..."
  systemctl --user stop "$SERVICE_NAME"
  echo "Qdrant stopped."
  exit 0
fi

# Fallback: manual PID-based stop
if [[ ! -f "$PID_FILE" ]]; then
  echo "No PID file found at $PID_FILE"
  echo "Attempting fallback: killing process on port $GRPC_PORT..."

  if fuser "$GRPC_PORT/tcp" >/dev/null 2>&1; then
    fuser -k "$GRPC_PORT/tcp" 2>/dev/null || true
    sleep 2
    echo "Process on port $GRPC_PORT killed."
  else
    echo "No process found on port $GRPC_PORT either."
    echo "Qdrant is not running."
  fi
  exit 0
fi

PID=$(cat "$PID_FILE")

if ! kill -0 "$PID" 2>/dev/null; then
  echo "Stale PID file (PID $PID not running). Cleaning up."
  rm -f "$PID_FILE"
  exit 0
fi

echo "Stopping Qdrant (PID: $PID)..."
kill "$PID" 2>/dev/null || true

TIMEOUT=10
ELAPSED=0
while (( ELAPSED < TIMEOUT )); do
  if ! kill -0 "$PID" 2>/dev/null; then
    echo "Qdrant stopped gracefully."
    rm -f "$PID_FILE"
    exit 0
  fi
  sleep 1
  ELAPSED=$(( ELAPSED + 1 ))
done

echo "Qdrant did not stop within ${TIMEOUT}s. Force killing..."
kill -9 "$PID" 2>/dev/null || true
sleep 1
rm -f "$PID_FILE"
echo "Qdrant force killed."
