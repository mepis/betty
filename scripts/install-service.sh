#!/bin/bash
set -euo pipefail

APP_NAME=llama-benchmark
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "==> Creating systemd user service directory..."
mkdir -p "$HOME/.config/systemd/user"

echo "==> Writing service file..."
cat > "$HOME/.config/systemd/user/$APP_NAME.service" <<EOF
[Unit]
Description=$APP_NAME
After=network.target

[Service]
Type=simple
WorkingDirectory=$PROJECT_DIR
ExecStart=npm run start
Restart=on-failure
RestartSec=5
Environment=HOME=$HOME

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
