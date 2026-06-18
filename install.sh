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
  echo " Running: init-cuda13.3.sh"
  echo "========================================"
  bash "$SCRIPTS_DIR/init-cuda13.3.sh"
}

install_cuda12() {
  echo "========================================"
  echo " Running: init-cuda12.9.sh"
  echo "========================================"
  bash "$SCRIPTS_DIR/init-cuda12.9.sh"
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
echo "  2) Install CUDA 13.3"
echo "  3) Install CUDA 12.9  (for older GPUs)"
echo "  4) Install systemd user service"
echo ""
echo "  5) Run all (APT -> CUDA 13.3 -> Service)"
echo ""
echo "  NOTE: CUDA 12.9 is NOT included in 'Run all' because it"
echo "        conflicts with CUDA 13.3. Choose option 3 if you need"
echo "        CUDA 12.9 for an older GPU."
echo ""
echo -n "  Choose an option [1-5]: "
read -r choice

case "$choice" in
  1)
    install_apt
    ;;
  2)
    install_cuda
    ;;
  3)
    install_cuda12
    ;;
  4)
    install_service
    ;;
  5)
    install_apt
    install_cuda
    install_service
    echo ""
    echo "==> All installations complete."
    echo "    (CUDA 12.9 not included — it conflicts with CUDA 13.3.)"
    echo "    To install CUDA 12.9 separately, choose option 3."
    ;;
  *)
    echo "Invalid option. Choose 1-5."
    exit 1
    ;;
esac
