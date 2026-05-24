# WebSocket Usage Examples

**Tags:** `qa`, `websocket`, `real-time`, `streaming`, `examples`, `chat`, `protocol`

## Overview

The WebSocket endpoint at `ws://localhost:3001/ws` provides real-time communication with the Pi coding agent. Messages are JSON-encoded.

## Connecting

### Without Authentication

```js
const ws = new WebSocket("ws://localhost:3001/ws");

ws.onopen = () => console.log("Connected");
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log(data.type, data);
};
```

### With Authentication

```js
const token = "eyJhbGciOiJIUzI1NiIs...";
const ws = new WebSocket(`ws://localhost:3001/ws?token=${token}`);
```

## Message Protocol

### Sending a Prompt

```js
ws.send(JSON.stringify({
  type: "prompt",
  content: "Write a Fibonacci function in Python"
}));
```

**Server response flow:**
1. `message` — User message echo: `{ role: "user", content: "..." }`
2. `stream` — Text chunks: `{ content: "Here" }`, `{ content: " is" }`, ...
3. `message` — Complete assistant message: `{ role: "assistant", content: "..." }`

### Stopping a Response

```js
ws.send(JSON.stringify({ type: "stop" }));
```

Aborts the current Pi generation.

### Deleting a Message

```js
ws.send(JSON.stringify({
  type: "delete-message",
  role: "user",
  content: "Write a Fibonacci function in Python"
}));
```

Removes the message from Pi's context window.

### Starting a New Session

```js
ws.send(JSON.stringify({ type: "new-session" }));
```

Stops the current Pi session and starts a fresh one.

## Receiving Events

```js
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);

  switch (data.type) {
    case "session-started":
      console.log("Session ID:", data.sessionId);
      break;

    case "auth-ok":
      console.log("Logged in as:", data.user.username, "(", data.user.role, ")");
      break;

    case "status":
      console.log("Status:", data.status); // "starting" | "ready" | "error"
      break;

    case "message":
      console.log(`${data.role}:`, data.content);
      break;

    case "stream":
      process.stdout.write(data.content); // Incremental text
      break;

    case "tool-call":
      console.log("Tool:", data.toolName, data.toolCallId);
      break;

    case "tool-result":
      console.log("Tool result:", data.toolName, data.isError ? "ERROR" : "OK");
      break;

    case "error":
      console.error("Error:", data.message);
      break;
  }
};
```

## Complete Example

```js
const token = process.env.BETTY_TOKEN;
const ws = new WebSocket(`ws://localhost:3001/ws?token=${token}`);

ws.onopen = () => {
  console.log("Connected to Pi Chat");
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);

  if (data.type === "status" && data.status === "ready") {
    // Pi is ready, send a prompt
    ws.send(JSON.stringify({
      type: "prompt",
      content: "What is the capital of France?"
    }));
  }

  if (data.type === "stream") {
    process.stdout.write(data.content);
  }

  if (data.type === "message" && data.role === "assistant") {
    console.log("\n\n[Response complete]");
    ws.close();
  }
};

ws.onerror = (err) => {
  console.error("WebSocket error:", err);
};
```

## Using with `wscat`

```bash
# Install wscat
npm install -g wscat

# Connect
wscat -c ws://localhost:3001/ws

# Send a message (after session starts)
{"type": "prompt", "content": "Hello!"}
```

## Rate Limiting

- Maximum 60 messages per 60-second window per connection
- Exceeding the limit returns an `error` message
- Connection is not terminated

## Message Size Limit

- Maximum 1MB per message
- Larger messages return an `error` message

## Related

- [[Server]] — WebSocket server implementation
- [[PiSession]] — Backend session management
- [[WebSocket Composable]] — Frontend WebSocket client
- [[WebSocket Auth]] — Token extraction and validation
