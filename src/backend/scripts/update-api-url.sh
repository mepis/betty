#!/usr/bin/env bash
# Update VITE_API_URL in frontend/.env.production
#
# Cross-platform compatible: works on Linux, macOS, and WSL.
# Detects the machine's IP address and sets VITE_API_URL explicitly.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
FRONTEND_DIR="$PROJECT_ROOT/src/frontend"
ENV_FILE="$FRONTEND_DIR/.env.production"

if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: $ENV_FILE not found"
  exit 1
fi

# Read the network interface from root .env (default: auto-detect)
ROOT_ENV="$PROJECT_ROOT/.env"
NET_INTERFACE=""
if [ -f "$ROOT_ENV" ]; then
  NET_INTERFACE=$(grep '^NET_INTERFACE=' "$ROOT_ENV" 2>/dev/null | head -1 | cut -d= -f2 | tr -d '[:space:]' || true)
fi

# Cross-platform IP detection
detect_ip() {
  local iface="$1"
  local ip=""

  if command -v ip &>/dev/null; then
    # Linux: ip command
    if [ -n "$iface" ]; then
      ip=$(ip -4 addr show "$iface" 2>/dev/null | awk '/inet / {print $2}' | cut -d/ -f1 || true)
    fi
    if [ -z "$ip" ]; then
      # Fallback: first non-loopback IPv4
      ip=$(ip -4 addr show 2>/dev/null | awk '/inet / && !/127\.0\.0\.1/ {print $2; exit}' | cut -d/ -f1 || true)
    fi
  elif command -v ifconfig &>/dev/null; then
    # macOS / BSD: ifconfig command
    if [ -n "$iface" ]; then
      ip=$(ifconfig "$iface" 2>/dev/null | awk '/inet / && !/127\.0\.0\.1/ {print $2; exit}' | tr -d 'addr:' || true)
    fi
    if [ -z "$ip" ]; then
      # Fallback: first non-loopback IPv4 from any interface
      ip=$(ifconfig 2>/dev/null | awk '/inet / && !/127\.0\.0\.1/ {print $2; exit}' | tr -d 'addr:' || true)
    fi
  fi

  echo "$ip"
}

# Cross-platform in-place sed (works on both GNU sed and BSD/macOS sed)
sed_inplace() {
  # $1 = sed expression, $2 = file
  local expr="$1" file="$2"
  local tmp
  tmp=$(mktemp)
  sed "$expr" "$file" > "$tmp"
  mv "$tmp" "$file"
}

# Detect the machine's IP address and set it explicitly
MY_IP=$(detect_ip "$NET_INTERFACE")
if [ -n "$MY_IP" ] && [ "$MY_IP" != "127.0.0.1" ]; then
  sed_inplace "s|^VITE_API_URL=.*|VITE_API_URL=http://$MY_IP:3456|" "$ENV_FILE"
  echo "Updated VITE_API_URL in $ENV_FILE to http://$MY_IP:3456"
else
  echo "WARNING: Could not detect machine IP. Leaving VITE_API_URL as-is."
fi
