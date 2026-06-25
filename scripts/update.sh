#!/bin/bash
git stash
git pull
systemctl --user restart betty.service

# systemctl --user stop betty.service
# systemctl --user start betty.service