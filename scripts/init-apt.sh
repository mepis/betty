#!/bin/bash
set -euo pipefail

# Install apt packages required by Betty

echo "==> Updating package lists..."
sudo apt update

echo "==> Upgrading installed packages..."
sudo apt upgrade -y

echo "==> Installing build tools and libraries..."
sudo apt install \
  git \
  build-essential \
  cmake \
  ccache \
  pkg-config \
  libssl-dev \
  libnccl-dev \
  libcurl4-openssl-dev \
  curl \
  libgomp1 \
  software-properties-common \
  clinfo \
  ninja-build \
  -y

echo "==> APT packages installed successfully."
