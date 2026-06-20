#!/bin/bash
git stash
git pull
systemctl --user restart llama-benchmark.service

# systemctl --user stop llama-benchmark.service
# systemctl --user start llama-benchmark.service