#!/bin/bash
set -euo pipefail

APP_NAME=llama-benchmark
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
NPM_PATH="$(command -v npm)"
NPM_DIR="$(dirname "$NPM_PATH")"

echo "==> Creating systemd user service directory..."
mkdir -p "$HOME/.config/systemd/user"

echo "==> Creating Betty data directory..."
mkdir -p "$HOME/.betty"

echo "==> Creating model directory..."
mkdir -p "$HOME/.betty/models"

echo "==> Creating profiles directory..."
mkdir -p "$HOME/.betty/profiles"

echo "==> Creating profiles directory..."
mkdir -p "$HOME/.betty/reports"


echo "==> Writing service file..."
cat > "$HOME/.config/systemd/user/$APP_NAME.service" <<EOF
[Unit]
Description=$APP_NAME
After=network.target

[Service]
Type=simple
WorkingDirectory=$PROJECT_DIR
ExecStart=$NPM_PATH run start
Restart=on-failure
RestartSec=5
Environment=HOME=$HOME
Environment=PATH=$NPM_DIR:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin

[Install]
WantedBy=default.target
EOF

echo "==> Enabling linger (keeps user services running after logout)..."
loginctl enable-linger "$USER"

echo "==> Reloading systemd user daemon..."
systemctl --user daemon-reload

echo "==> Enabling service..."
systemctl --user enable "$APP_NAME.service"

echo "==> Starting service..."
systemctl --user start "$APP_NAME.service"

echo "==> Service is running. Check status with:"
echo "    systemctl --user status $APP_NAME.service"
