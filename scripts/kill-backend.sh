#!/bin/bash
# Kill the backend server (port 3000)

echo "Killing backend server on port 3000..."

# Kill processes using port 3000
fuser -k 3000/tcp 2>/dev/null

# Kill node processes running server.js
pkill -f "node.*server\.js" 2>/dev/null

sleep 1

# Verify
if fuser 3000/tcp 2>/dev/null; then
  echo "Port 3000 still in use. Force killing..."
  kill -9 $(lsof -ti:3000) 2>/dev/null
  sleep 1
fi

echo "Backend server killed."
