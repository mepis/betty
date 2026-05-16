# Quick Start & QA

Practical examples for getting started with Betty.

## Prerequisites

- Node.js 20+
- pi installed globally (`npm install -g @earendil-works/pi-coding-agent`)
- API key for an LLM provider

## Setup

### 1. Install Dependencies

```bash
cd /root/git/betty
npm install
```

### 2. Set API Key

```bash
# Option A: Environment variable
export ANTHROPIC_API_KEY=sk-ant-...

# Option B: Interactive login
pi /login

# Option C: Custom models
# Edit ~/.pi/agent/models.json
```

### 3. Start the Application

```bash
# Development mode (both server + frontend with hot-reload)
npm run dev

# Or separately:
npm run dev:server   # Terminal 1 — Backend server on :3001
npm run dev:client   # Terminal 2 — Frontend on :5173
```

### 4. Open the UI

Navigate to `http://localhost:5173` in your browser.

## Usage Examples

### Send a Message

1. Type a message in the input area
2. Press Enter to send

Example message: *"List all TypeScript files in the current directory"*

### Switch Models

1. Click the model badge in the header (shows current model name)
2. Select a model from the dropdown list
3. The badge updates to show the new model

### Change Thinking Level

1. Click the thinking badge (💭) in the header to cycle through levels
2. Or open Settings → Thinking Level and pick a specific level

Levels: `off`, `minimal`, `low`, `medium`, `high`, `xhigh`

### Create a New Session

1. Click "New Session" in the sidebar
2. The message history is cleared and a fresh conversation starts

### Compact Context

1. Open Settings
2. Optionally enter custom compaction instructions
3. Click "Compact Context"

This compresses the conversation to reduce token usage while preserving key information.

### Fork a Conversation

1. Call `getForkMessages()` to retrieve available fork points
2. Call `fork(entryId)` with the desired entry ID
3. A new branch of the conversation is created

### Execute a Bash Command

Send a message like: *"Run `ls -la` and show me the output"*

The agent will execute the command via the bash tool and display the result in a tool call card.

## Troubleshooting

### "Disconnected from server"

- Check that the server is running (`npm run dev:server`)
- Verify the WebSocket port (`WS_PORT`, default 3001)
- Check browser console for connection errors
- The frontend auto-reconnects after 2 seconds

### "Not connected to server"

The WebSocket connection failed. Verify:
- Server is running on the correct port
- `VITE_WS_URL` in `.env` matches your server URL
- No firewall is blocking the WebSocket port

### Model selector shows no models

- Click "Refresh Models" in the sidebar or settings
- Verify pi is properly configured with an API key
- Check that pi can list available models

### Streaming stops unexpectedly

- Check the server console for errors
- Look for `error` events in the WebSocket protocol
- The `wsError` state will contain the error message

### High token usage

- Use `compact` to compress conversation context
- Set a lower `thinking_level` (e.g., `low` instead of `high`)
- Start a new session for fresh conversations

## WebSocket Testing with curl / wscat

You can test the WebSocket protocol directly:

```bash
# Connect with wscat
npx wscat -c ws://localhost:3001

# After connecting, try these commands:
# Get server state
{"type":"get_state"}

# List models
{"type":"get_available_models"}

# Send a prompt
{"type":"prompt","message":"Hello, what can you do?"}

# Abort a streaming response
{"type":"abort"}

# Switch model
{"type":"set_model","provider":"anthropic","modelId":"claude-sonnet-4-20250514"}
```

## API Health Check

```bash
curl http://localhost:3000/health
# Response: {"status":"ok","wsClients":1}
```

## Tags

- **category**: qa, quickstart
- **component**: setup, configuration, troubleshooting
- **pattern**: getting-started, examples
- **audience**: users, developers
