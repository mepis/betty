# Bugs Found During Testing

## Critical Bugs

### Bug 1: App.vue - Invalid regex lookbehind in `formatMessage()` [FIXED]
- **File**: `src/frontend/src/App.vue`
- **Function**: `formatMessage()`
- **Severity**: Critical
- **Description**: The regex `/(?<!<pre[^>]*>)(\n)/g` used a variable-width negative lookbehind (`[^>]*`), which is NOT supported in JavaScript. This threw a `SyntaxError` at runtime when `formatMessage()` was first called.
- **Fix**: Replaced with alternation regex `/(<pre>.*?<\/pre>)|(\n)/gs` that uses a capture group to preserve newlines inside `<pre>` blocks while replacing newlines outside them.
- **Fixed**: [x]

### Bug 2: pi-session.js - `stop()` doesn't clear startup timers [FIXED]
- **File**: `src/backend/pi-session.js`
- **Function**: `stop()`
- **Severity**: Critical
- **Description**: The `start()` method creates two timers (`_readyCheckTimer` and 60s timeout) but `stop()` never clears them. Timer callbacks could fire after stop(), calling `this.process.kill()` on null.
- **Fix**: Added timer clearing in `stop()`, `exit` handler, and `error` handler. Stored timeout ID in `_startTimeout` for proper cleanup.
- **Fixed**: [x]

## Major Bugs

### Bug 3: server.js - Auto-creates Pi session on every WebSocket connection [FIXED]
- **File**: `src/backend/server.js`
- **Function**: `wss.on("connection")` handler
- **Severity**: Major
- **Description**: Every WebSocket connection automatically spawned a Pi subprocess immediately. Transient connections wasted resources.
- **Fix**: Added 1-second grace period before spawning Pi session. If client sends a message before the grace period, session is created immediately. If client disconnects during grace period, no subprocess is spawned. Grace timers are cleared on close/error.
- **Fixed**: [x]

### Bug 4: useWebSocket.js - `currentStreamContent` not reset on new session [FIXED]
- **File**: `src/frontend/src/composables/useWebSocket.js`
- **Function**: `newSession()`
- **Severity**: Major
- **Description**: `currentStreamContent` accumulated during a session was not reset when starting a new session, potentially leaking content.
- **Fix**: Added `currentStreamContent = ""` at the start of `newSession()`.
- **Fixed**: [x]

### Bug 5: App.vue - `sendPrompt()` sets streaming state before confirming send [FIXED]
- **File**: `src/frontend/src/App.vue`
- **Function**: `sendPrompt()`
- **Severity**: Major
- **Description**: Streaming state was set before confirming the WebSocket send succeeded, causing UI to show streaming with no activity if the connection was down.
- **Fix**: Now only sets `isStreaming` and `streamingContent` after `wsSendPrompt()` returns true. Updated composable's `sendPrompt()` to return a boolean.
- **Fixed**: [x]

### Bug 6: server.js - `sendTo()` silently ignores write failures [FIXED]
- **File**: `src/backend/server.js`
- **Function**: `sendTo()`
- **Severity**: Major
- **Description**: WebSocket send failures were caught and silently ignored with no logging.
- **Fix**: Added `console.error()` logging for send failures.
- **Fixed**: [x]

## Minor Bugs

### Bug 7: pi-session.js - `prompt()`, `steer()`, `followUp()` return values ignored [FIXED]
- **File**: `src/backend/server.js` / `pi-session.js`
- **Function**: `handleWsMessage()` → "prompt" and "stop" cases
- **Severity**: Minor
- **Description**: Return values of session methods (indicating write success/failure) were not checked.
- **Fix**: Added return value checks for `session.prompt()` and `session.abort()` in server.js, with error messages sent to client on failure.
- **Fixed**: [x]

### Bug 8: server.js - Prompt echo before Pi send creates race condition [NOT FIXED - by design]
- **File**: `src/backend/server.js`
- **Function**: `handleWsMessage()` → "prompt" case
- **Severity**: Minor
- **Description**: User message is echoed to client before sending to Pi. If Pi fails, client sees user message but no response.
- **Reason**: This is intentional optimistic UI behavior. The error handling in Bug 7 fix addresses the failure case.
- **Fixed**: [ ] Not Fixed - by design

### Bug 9: pi-session.js - `_handleEvent()` doesn't validate event shape thoroughly [FIXED]
- **File**: `src/backend/pi-session.js`
- **Function**: `_handleEvent()` → "message_update" case
- **Severity**: Minor
- **Description**: `event.assistantMessageEvent` was checked for truthiness but not for proper object structure before accessing properties.
- **Fix**: Added `typeof event.assistantMessageEvent === "object"` check and `evt.delta !== undefined && evt.delta !== null` validation.
- **Fixed**: [x]

### Bug 10: server.js - `handleWsMessage` doesn't validate message size [FIXED]
- **File**: `src/backend/server.js`
- **Function**: `ws.on("message")` handler
- **Severity**: Minor
- **Description**: No limit on message size could allow large messages to consume memory.
- **Fix**: Added `MAX_MESSAGE_SIZE` constant (1MB) and enforcement in the message handler.
- **Fixed**: [x]

### Bug 11: App.vue - `formatMessage()` code block regex doesn't handle escaped backticks [NOT FIXED - by design]
- **File**: `src/frontend/src/App.vue`
- **Function**: `formatMessage()`
- **Severity**: Minor
- **Description**: Code block regex doesn't handle nested backticks or escaped backticks inside code blocks.
- **Reason**: Proper handling would require a full markdown parser. This is a known limitation of the lightweight formatter.
- **Fixed**: [ ] Not Fixed - by design

### Bug 12: pi-session.js - `start()` timer references `this` in setTimeout callbacks [FIXED]
- **File**: `src/backend/pi-session.js`
- **Function**: `start()`
- **Severity**: Minor
- **Description**: Timer callbacks could fire after stop(), modifying state after the session was stopped.
- **Fix**: Addressed by Bug 2 fix — timers are now properly cleared in `stop()`, `exit`, and `error` handlers.
- **Fixed**: [x] (superseded by Bug 2 fix)

### Bug 13: server.js - No rate limiting on WebSocket messages [FIXED]
- **File**: `src/backend/server.js`
- **Function**: `ws.on("message")` handler
- **Severity**: Minor
- **Description**: No rate limiting allowed clients to flood the server with messages.
- **Fix**: Added rate limiting (60 messages per 60-second window per client) with `checkRateLimit()` function. Rate limiter state is cleaned up on disconnect.
- **Fixed**: [x]

## Summary
- Total bugs found: 13
- Fixed: 11
- Not fixed (by design): 2 (Bug 8, Bug 11)
