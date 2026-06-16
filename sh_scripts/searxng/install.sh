#!/bin/bash

sudo git clone "https://github.com/searxng/searxng" "/usr/local/searxng/searxng-src"
cd /usr/local/searxng/searxng-src
git config --global --add safe.directory /usr/local/searxng
sudo -H ./utils/searxng.sh install all

SEARXNG_SECRET_KEY=$(openssl rand -base64 16)
sudo rm /etc/searxng/settings.yml 
sudo echo -e "
# SearXNG settings

use_default_settings: true

general:
  debug: false
  instance_name: "SearXNG"

search:
  safe_search: 2
  autocomplete: "duckduckgo"
  formats:
    - html
    - json
    - csv
    - rss

server:
  secret_key: $SEARXNG_SECRET_KEY
  limiter: true
  image_proxy: true

valkey:
  url: valkey://localhost:6379/0
" >> /etc/searxng/settings.yml 

systemctl restart uwsgi.service
systemctl restart nginx.service