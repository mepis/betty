#!/bin/bash
git pull
systemctl --user stop llama-benchmark.service
systemctl --user start llama-benchmark.service