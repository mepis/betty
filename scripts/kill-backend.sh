#!/bin/bash
# Kill the backend server (port 3001)

echo "Killing backend server on port 3001..."

# Kill processes using port 3001
fuser -k 3001/tcp 2>/dev/null

# Kill node processes running server.js
pkill -f "node.*server\.js" 2>/dev/null

sleep 1

# Verify
if fuser 3001/tcp 2>/dev/null; then
  echo "Port 3001 still in use. Force killing..."
  kill -9 $(lsof -ti:3001) 2>/dev/null
  sleep 1
fi

echo "Backend server killed."
