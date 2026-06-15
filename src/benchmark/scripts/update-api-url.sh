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
MY_IP=$(ip -4 addr show "$NET_INTERFACE" 2>/dev/null | awk '/inet / {print $2}' | cut -d/ -f1 || true)
if [ -z "$MY_IP" ]; then
  echo "WARNING: Interface '$NET_INTERFACE' not found or has no IPv4 address. Falling back to first usable interface..."
  # Fall back to the first non-loopback IP address
  MY_IP=$(ip -4 addr show | awk '/inet / && !/127\.0\.0\.1/ {print $2; exit}' | cut -d/ -f1 || true)
  if [ -z "$MY_IP" ]; then
    echo "ERROR: Could not detect machine IP address"
    exit 1
  fi
  echo "Using fallback IP: $MY_IP"
fi

# Note: API_HOST is intentionally not set here so it defaults to 0.0.0.0
# (all interfaces) in api-server.js, making the server accessible from
# both localhost and remote machines.

sed -i "s|^VITE_API_URL=.*|VITE_API_URL=http://$MY_IP:3456|" "$ENV_FILE"
echo "Updated VITE_API_URL in $ENV_FILE to http://$MY_IP:3456"
