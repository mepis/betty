#!/bin/bash

# Install pre-reqs
sudo apt update 
sudo apt upgrade -y 

sudo apt install git build-essential cmake ccache pkg-config libssl-dev libnccl-dev libcurl4-openssl-dev curl libgomp1 software-properties-common clinfo ninja-build -y 

# Install Intel OneAPI
# https://www.intel.com/content/www/us/en/docs/oneapi/installation-guide-linux/2025-2/base-online-offline.html#BASE-ONLINE-OFFLINE
wget https://registrationcenter-download.intel.com/akdlm/IRC_NAS/bd1d0273-a931-4f7e-ab76-6a2a67d646c7/intel-oneapi-base-toolkit-2025.2.0.592_offline.sh
sudo sh ./intel-oneapi-base-toolkit-2025.2.0.592_offline.sh -a --silent --eula accept

# Install cuda 13.2
# https://developer.nvidia.com/cuda-downloads?target_os=Linux&target_arch=x86_64&Distribution=Ubuntu&target_version=24.04&target_type=deb_local
cd /tmp
wget https://developer.download.nvidia.com/compute/cuda/repos/ubuntu2404/x86_64/cuda-ubuntu2404.pin
sudo mv cuda-ubuntu2404.pin /etc/apt/preferences.d/cuda-repository-pin-600
wget https://developer.download.nvidia.com/compute/cuda/13.2.1/local_installers/cuda-repo-ubuntu2404-13-2-local_13.2.1-595.58.03-1_amd64.deb
sudo dpkg -i cuda-repo-ubuntu2404-13-2-local_13.2.1-595.58.03-1_amd64.deb
sudo cp /var/cuda-repo-ubuntu2404-13-2-local/cuda-*-keyring.gpg /usr/share/keyrings/
sudo apt-get update
sudo apt-get -y install cuda-toolkit-13-2