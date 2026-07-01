#!/bin/bash
set -euo pipefail

APP_NAME=betty
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
NPM_PATH="$(command -v npm)"
NPM_DIR="$(dirname "$NPM_PATH")"

echo "==> Creating Betty data directory..."
mkdir -p "$HOME/.betty"

echo "==> Creating model directory..."
mkdir -p "$HOME/.betty/models"

echo "==> Creating profiles directory..."
mkdir -p "$HOME/.betty/profiles"

echo "==> Creating reports directory..."
mkdir -p "$HOME/.betty/reports"

echo "==> Creating library directory..."
mkdir -p "$HOME/.betty/library"

echo "==> Creating users directory..."
mkdir -p "$HOME/.betty/users"

echo "==> Creating chat templates directory..."
mkdir -p "$HOME/.betty/chat_templates"

echo "==> Writing service file..."
cat > "/etc/systemd/system/$APP_NAME.service" <<EOF
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
systemctl  daemon-reload

echo "==> Enabling service..."
systemctl  enable "$APP_NAME.service"

echo "==> Starting service..."
systemctl  start "$APP_NAME.service"

echo "==> Service is running. Check status with:"
echo "    systemctl  status $APP_NAME.service"
