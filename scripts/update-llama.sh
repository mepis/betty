#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
LLAMA_DIR="$PROJECT_DIR/llama.cpp"

echo -e "${GREEN}=== llama.cpp Update Script ===${NC}"
echo ""

# Delete existing folder if it exists to ensure a clean clone
if [ -d "$LLAMA_DIR" ]; then
    echo "Removing existing llama.cpp directory..."
    rm -rf "$LLAMA_DIR"
fi

echo "Cloning llama.cpp repository..."
git clone https://github.com/ggml-org/llama.cpp.git "$LLAMA_DIR"

cd "$LLAMA_DIR"

# Get current commit before update
CURRENT_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
echo -e "${YELLOW}Current commit: $CURRENT_COMMIT${NC}"

# Pull latest changes
echo ""
echo -e "${GREEN}Pulling latest changes from origin...${NC}"
git fetch origin
git pull origin master || git pull origin main

# Get new commit after update
NEW_COMMIT=$(git rev-parse --short HEAD)
echo -e "${GREEN}Updated to commit: $NEW_COMMIT${NC}"

if [ "$CURRENT_COMMIT" = "$NEW_COMMIT" ]; then
    echo -e "${YELLOW}Already up to date. Rebuilding anyway...${NC}"
fi

# Clean previous build
echo ""
echo -e "${GREEN}Cleaning previous build...${NC}"
if [ -d "build" ]; then
    rm -rf build/bin/*
fi

# Configure with CMake (CUDA enabled)
echo ""
echo -e "${GREEN}Configuring build with CUDA support...${NC}"
cmake -B build -DGGML_CUDA=ON -DCMAKE_CUDA_ARCHITECTURES=86

# Build
echo ""
echo -e "${GREEN}Building llama.cpp (this may take a while)...${NC}"
NPROC=$(nproc 2>/dev/null || sysctl -n hw.ncpu 2>/dev/null || echo 4)
cmake --build build --config Release -j "$NPROC"

# Verify build
echo ""
if [ -f "build/bin/llama-server" ]; then
    echo -e "${GREEN}✓ Build successful!${NC}"
    echo -e "${GREEN}✓ llama-server binary: $LLAMA_DIR/build/bin/llama-server${NC}"

    # Show version info if available
    if ./build/bin/llama-server --version 2>/dev/null; then
        :
    fi
else
    echo -e "${RED}✗ Build failed: llama-server binary not found${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}=== Update complete ===${NC}"
