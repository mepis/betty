#!/usr/bin/env bash
# Update VITE_API_URL in frontend/.env.production to the machine's IP address

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$PROJECT_ROOT/frontend/.env.production"

if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: $ENV_FILE not found"
  exit 1
fi

# Read the network interface from .env (default: eth0)
ROOT_ENV="$PROJECT_ROOT/.env"
NET_INTERFACE="eth0"
if [ -f "$ROOT_ENV" ]; then
  NET_INTERFACE=$(grep '^NET_INTERFACE=' "$ROOT_ENV" | head -1 | cut -d= -f2 | tr -d '[:space:]')
fi

# Detect the machine's IP address on the configured interface
MY_IP=$(ip -4 addr show "$NET_INTERFACE" 2>/dev/null | awk '/inet / {print $2}' | cut -d/ -f1)
if [ -z "$MY_IP" ]; then
  echo "ERROR: Could not detect machine IP address"
  exit 1
fi

# Also update API_HOST in root .env
if [ -f "$ROOT_ENV" ]; then
  sed -i "s|^API_HOST=.*|API_HOST=$MY_IP|" "$ROOT_ENV"
  echo "Updated API_HOST in $ROOT_ENV to $MY_IP"
fi

sed -i "s|^VITE_API_URL=.*|VITE_API_URL=http://$MY_IP|" "$ENV_FILE"
echo "Updated VITE_API_URL in $ENV_FILE to http://$MY_IP"
