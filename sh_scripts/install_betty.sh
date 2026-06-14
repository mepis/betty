#!/bin/bash

CURRENT_DIR=$(pwd)
APP_NAME=betty

# Install pre-reqs
sudo apt update 
sudo apt upgrade -y 

sudo apt install git build-essential cmake ccache pkg-config libssl-dev libnccl-dev libcurl4-openssl-dev curl libgomp1 software-properties-common clinfo ninja-build -y 

# Install Intel OneAPI
# https://www.intel.com/content/www/us/en/docs/oneapi/installation-guide-linux/2025-2/base-online-offline.html#BASE-ONLINE-OFFLINE
wget https://registrationcenter-download.intel.com/akdlm/IRC_NAS/bd1d0273-a931-4f7e-ab76-6a2a67d646c7/intel-oneapi-base-toolkit-2025.2.0.592_offline.sh
sudo sh ./intel-oneapi-base-toolkit-2025.2.0.592_offline.sh -a --silent --eula accept

# Install cuda 13.3
# https://developer.nvidia.com/cuda-downloads?target_os=Linux&target_arch=x86_64&Distribution=Ubuntu&target_version=24.04&target_type=deb_local
cd /tmp
wget https://developer.download.nvidia.com/compute/cuda/repos/ubuntu2604/x86_64/cuda-keyring_1.1-1_all.deb
sudo dpkg -i cuda-keyring_1.1-1_all.deb
sudo apt update
sudo apt -y install cuda-toolkit-13-3

# Install Pi
curl -fsSL https://pi.dev/install.sh | sh

echo -e "
[Unit]
Description=$APP_NAME
After=network.target

[Service]
Type=simple
WorkingDirectory=$CURRENT_DIR
ExecStart=$CURRENT_DIR/run.sh
Restart=on-failure
RestartSec=5

[Install]
WantedBy=default.target
" >> $HOME/.config/systemd/user/$APP_NAME.service

loginctl enable-linger $USER
systemctl --user daemon-reload
systemctl --user enable $APP_NAME.service
systemctl --user start $APP_NAME.service
