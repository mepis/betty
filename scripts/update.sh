#!/bin/bash
git stash
git pull
npm install
cd src/frontend/
npm install
systemctl --user restart betty.service


# systemctl --user stop betty.service
# systemctl --user start betty.service