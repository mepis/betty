#!/usr/bin/env bash
set -euo pipefail

QDRANT_DIR="$(cd "$(dirname "$0")" && pwd)"
DATA_DIR="$QDRANT_DIR/data"
PID_FILE="$DATA_DIR/.qdrant.pid"
LOG_FILE="$DATA_DIR/qdrant.log"

# Load .env if present
REPO_ROOT="$(cd "$QDRANT_DIR/.." && pwd)"
if [[ -f "$REPO_ROOT/.env" ]]; then
  set -a
  source "$REPO_ROOT/.env"
  set +a
fi

GRPC_PORT="${QDRANT_GRPC_PORT:-6334}"
HTTP_PORT="${QDRANT_HTTP_PORT:-6333}"
SERVICE_NAME="qdrant-local.service"

echo "=== Qdrant Status ==="
echo ""

# Check systemd service first
SYSTEMD_ACTIVE=false
if systemctl --user is-active --quiet "$SERVICE_NAME" 2>/dev/null; then
  SYSTEMD_ACTIVE=true
fi

if $SYSTEMD_ACTIVE; then
  MAIN_PID=$(systemctl --user show -p MainPID "$SERVICE_NAME" | cut -d= -f2)
  echo "Status:  RUNNING (systemd)"
  echo "Service: $SERVICE_NAME"
  echo "PID:     $MAIN_PID"
  echo "gRPC:    localhost:$GRPC_PORT"
  echo "HTTP:    localhost:$HTTP_PORT"
  echo ""

  # Show systemd uptime
  UPTIME=$(systemctl --user show -p ActiveEnterTimestamp "$SERVICE_NAME" | cut -d= -f2-)
  if [[ -n "$UPTIME" ]]; then
    echo "Started: $UPTIME"
  fi

else
  # Fallback: manual PID check
  RUNNING=false
  PID=""
  if [[ -f "$PID_FILE" ]]; then
    PID=$(cat "$PID_FILE")
    if kill -0 "$PID" 2>/dev/null; then
      RUNNING=true
    fi
  fi

  if $RUNNING; then
    echo "Status:  RUNNING (manual)"
    echo "PID:     $PID"
    echo "gRPC:    localhost:$GRPC_PORT"
    echo "HTTP:    localhost:$HTTP_PORT"
  else
    echo "Status:  STOPPED"
    if [[ -f "$PID_FILE" ]]; then
      echo "(stale PID file: $PID)"
    fi
    if systemctl --user list-unit-files "$SERVICE_NAME" &>/dev/null; then
      echo ""
      echo "Systemd service unit exists but is not active."
      echo "Start with: systemctl --user start $SERVICE_NAME"
    fi
  fi
fi

echo ""

# Health endpoint details when running
if curl -sf "http://localhost:$HTTP_PORT/healthz" >/dev/null 2>&1; then
  echo "Health:  OK"
  INFO=$(curl -sf "http://localhost:$HTTP_PORT/" 2>/dev/null || echo "")
  if [[ -n "$INFO" ]]; then
    VERSION=$(echo "$INFO" | grep -o '"version":"[^"]*"' | cut -d'"' -f4 || true)
    if [[ -n "$VERSION" ]]; then
      echo "Version: $VERSION"
    fi
  fi
  echo ""
fi

# Port occupancy check
echo "Port check:"
if fuser "$GRPC_PORT/tcp" >/dev/null 2>&1; then
  echo "  gRPC ($GRPC_PORT): in use"
else
  echo "  gRPC ($GRPC_PORT): free"
fi

if fuser "$HTTP_PORT/tcp" >/dev/null 2>&1; then
  echo "  HTTP ($HTTP_PORT): in use"
else
  echo "  HTTP ($HTTP_PORT): free"
fi

echo ""

# Log file info
if [[ -f "$LOG_FILE" ]]; then
  LINES=$(wc -l < "$LOG_FILE")
  SIZE=$(du -h "$LOG_FILE" | cut -f1)
  echo "Log:     $LOG_FILE ($SIZE, $LINES lines)"
else
  echo "Log:     $LOG_FILE (not found)"
fi

echo ""

# Systemd service info
if [[ -f "$HOME/.config/systemd/user/$SERVICE_NAME" ]]; then
  ENABLED=$(systemctl --user is-enabled "$SERVICE_NAME" 2>/dev/null || echo "unknown")
  echo "Systemd: $SERVICE_NAME (enabled: $ENABLED)"
fi
