#!/bin/bash
set -euo pipefail

sudo apt remove --purge cuda-*
sudo apt autoremove --purge

echo "==> Downloading CUDA 13.3..."
cd /tmp
wget https://developer.download.nvidia.com/compute/cuda/repos/ubuntu2604/x86_64/cuda-keyring_1.1-1_all.deb
sudo dpkg -i cuda-keyring_1.1-1_all.deb
sudo apt-get update
sudo apt-get -y install cuda-toolkit-13-3

echo "==> CUDA 13.3 installed successfully."
