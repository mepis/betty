#!/bin/bash
set -euo pipefail

# Install CUDA 13.2
# https://developer.nvidia.com/cuda-downloads?target_os=Linux&target_arch=x86_64&Distribution=Ubuntu&target_version=24.04&target_type=deb_local

echo "==> Downloading CUDA repository pin file..."
cd /tmp
wget https://developer.download.nvidia.com/compute/cuda/repos/ubuntu2404/x86_64/cuda-ubuntu2404.pin
sudo mv cuda-ubuntu2404.pin /etc/apt/preferences.d/cuda-repository-pin-600

echo "==> Downloading CUDA repository package..."
wget https://developer.download.nvidia.com/compute/cuda/13.2.1/local_installers/cuda-repo-ubuntu2404-13-2-local_13.2.1-595.58.03-1_amd64.deb

echo "==> Installing CUDA repository..."
sudo dpkg -i cuda-repo-ubuntu2404-13-2-local_13.2.1-595.58.03-1_amd64.deb
sudo cp /var/cuda-repo-ubuntu2404-13-2-local/cuda-*-keyring.gpg /usr/share/keyrings/

echo "==> Updating package lists for CUDA..."
sudo apt-get update

echo "==> Installing CUDA toolkit 13.2..."
sudo apt-get -y install cuda-toolkit-13-2

echo "==> CUDA 13.2 installed successfully."
