#!/usr/bin/env bash
set -euo pipefail

QDRANT_VERSION="1.12.0"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BIN_DIR="$SCRIPT_DIR/qdrant"
BINARY_NAME="qdrant"
BINARY_PATH="${BIN_DIR}/${BINARY_NAME}"
DATA_DIR="$SCRIPT_DIR/data"

SKIP_INSTALL="${QDRANT_SKIP_INSTALL:-0}"

# Detect OS/arch early (needed for systemd check later)
ARCH="$(uname -m)"
OS="$(uname -s)"

case "${ARCH}" in
  x86_64|amd64)  ARCH_SUFFIX="x86_64" ;;
  aarch64|arm64) ARCH_SUFFIX="aarch64" ;;
  *) echo "Unsupported architecture: $ARCH"; exit 1 ;;
esac

case "${OS}" in
  Linux)  OS_SUFFIX="unknown-linux-gnu" ;;
  Darwin) OS_SUFFIX="apple-darwin" ;;
  *) echo "Unsupported OS: $OS"; exit 1 ;;
esac

if [[ -x "$BINARY_PATH" ]]; then
  echo "Qdrant binary already exists at $BINARY_PATH"
  echo "To reinstall, remove it first: rm $BINARY_PATH (or set QDRANT_SKIP_INSTALL=1 to skip)"
fi

if [[ "$SKIP_INSTALL" != "1" ]]; then
  mkdir -p "$BIN_DIR"

  PACKAGE="qdrant-${ARCH_SUFFIX}-${OS_SUFFIX}"
  URL="https://github.com/qdrant/qdrant/releases/download/v${QDRANT_VERSION}/${PACKAGE}.tar.gz"

  echo "Downloading Qdrant v${QDRANT_VERSION} (${ARCH_SUFFIX}-${OS_SUFFIX})..."
  echo "  From: $URL"

  TMP_FILE="$(mktemp)"
  curl -fsSL -o "$TMP_FILE" "$URL"

  echo "Extracting..."
  TMP_DIR="$(mktemp -d)"
  tar -xzf "$TMP_FILE" -C "$TMP_DIR"

  FOUND_BIN="$(find "$TMP_DIR" -name "qdrant" -type f | head -1)"
  if [[ -z "$FOUND_BIN" ]]; then
    echo "Error: Could not find qdrant binary in archive"
    rm -rf "$TMP_FILE" "$TMP_DIR"
    exit 1
  fi

  cp "$FOUND_BIN" "$BINARY_PATH"
  chmod +x "$BINARY_PATH"
  rm -rf "$TMP_FILE" "$TMP_DIR"
fi

# Create data directory for storage, logs, and PID file
mkdir -p "$DATA_DIR/storage"

echo ""
echo "Qdrant v${QDRANT_VERSION} installed successfully!"
echo "  Binary:  $BINARY_PATH"
echo "  Data:    $DATA_DIR"

# --- Install systemd user service ---
if [[ "$OS_SUFFIX" != "unknown-linux-gnu" ]]; then
  echo ""
  echo "Systemd service installation skipped (not Linux)."
  echo "To start Qdrant manually:"
  echo "  cd $DATA_DIR && exec $BINARY_PATH --disable-telemetry"
  exit 0
fi

USER_NAME="$(whoami)"
SERVICE_FILE="$HOME/.config/systemd/user/qdrant-local.service"
mkdir -p "$(dirname "$SERVICE_FILE")"

cat > "$SERVICE_FILE" <<EOF
[Unit]
Description=Qdrant Local Vector Database
After=network.target

[Service]
Type=simple
ExecStart=${BINARY_PATH} --disable-telemetry
WorkingDirectory=${DATA_DIR}
Restart=on-failure
RestartSec=5
StandardOutput=append:${DATA_DIR}/qdrant.log
StandardError=append:${DATA_DIR}/qdrant.log

# Hardening
NoNewPrivileges=true
ProtectSystem=strict
ReadWritePaths=${DATA_DIR}

[Install]
WantedBy=default.target
EOF

echo ""
echo "=== Systemd user service installed ==="
echo "  Unit:  qdrant-local.service"
echo "  File:  $SERVICE_FILE"
echo ""
echo "Commands:"
echo "  systemctl --user daemon-reload"
echo "  systemctl --user start qdrant-local"
echo "  systemctl --user status qdrant-local"
echo "  systemctl --user enable qdrant-local    # auto-start on login"
echo "  systemctl --user stop qdrant-local"
