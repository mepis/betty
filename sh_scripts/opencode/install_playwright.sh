#!/bin/bash
sudo npm install -g @playwright/cli@latest
sudo npx playwright install-deps
sudo npx playwright install

sudo mkdir -p /opt/google/chrome
sudo ln -sf /home/jon/.cache/ms-playwright/chromium-1223/chrome-linux64/chrome /opt/google/chrome/chrome


## If using ubuntu 26 and playwright isn't working, run these commands below. Then rerun the ones above. 
# echo 'export PLAYWRIGHT_HOST_PLATFORM_OVERRIDE=ubuntu24.04-x64' >> ~/.bashrc
# source ~/.bashrc
# sudo apt update
# sudo apt install -y \
#   libnss3 libnspr4 \
#   libatk1.0-0t64 libatk-bridge2.0-0t64 libatspi2.0-0t64 \
#   libcups2t64 \
#   libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 \
#   libgbm1 libdrm2 \
#   libpango-1.0-0 libcairo2 \
#   libasound2t64 libwayland-client0