#!/bin/bash

sudo pkill -f "llama" && echo "Killed all llama.cpp instances" || echo "No llama.cpp instances found"