#!/bin/bash
set -euo pipefail

SCRIPTS_DIR="$(cd "$(dirname "$0")/scripts" && pwd)"

install_apt() {
  echo "========================================"
  echo " Running: init-apt.sh"
  echo "========================================"
  bash "$SCRIPTS_DIR/init-apt.sh"
}

install_cuda() {
  echo "========================================"
  echo " Running: init-cuda.sh"
  echo "========================================"
  bash "$SCRIPTS_DIR/init-cuda.sh"
}

install_service() {
  echo "========================================"
  echo " Running: install-service.sh"
  echo "========================================"
  bash "$SCRIPTS_DIR/install-service.sh"
}

echo "============================================"
echo "  Betty Installation"
echo "============================================"
echo ""
echo "  1) Install APT packages (build tools, libraries)"
echo "  2) Install CUDA 13.2"
echo "  3) Install systemd user service"
echo "  4) Run all (APT -> CUDA -> Service)"
echo ""
echo -n "  Choose an option [1-4]: "
read -r choice

case "$choice" in
  1)
    install_apt
    ;;
  2)
    install_cuda
    ;;
  3)
    install_service
    ;;
  4)
    install_apt
    install_cuda
    install_service
    echo ""
    echo "==> All installations complete."
    ;;
  *)
    echo "Invalid option. Choose 1-4."
    exit 1
    ;;
esac
