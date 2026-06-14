#!/usr/bin/env bash
# Update VITE_API_URL in frontend/.env.production to the target address

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$PROJECT_ROOT/frontend/.env.production"

if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: $ENV_FILE not found"
  exit 1
fi

sed -i 's|^VITE_API_URL=.*|VITE_API_URL=http://100.88.77.33|' "$ENV_FILE"
echo "Updated VITE_API_URL in $ENV_FILE to http://100.88.77.33"
