#!/bin/bash
git stash
git pull
systemctl --user stop betty.service
npm install
cd src/frontend/
npm install


# systemctl --user stop betty.service
# systemctl --user start betty.service