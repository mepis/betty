# Milestone 2: pi SDK Integration

**Design Doc Reference:** Phase 2 (Tasks 2.1 – 2.4)
**Status:** Not Started
**Estimated Effort:** 4–5 days

---

## Goal

Embed the pi SDK directly in the Node.js backend process, relay agent events over WebSocket in real-time, handle all client commands (prompt, abort, session management, model switching), and expose REST endpoints for models, commands, and session stats.

---

## Dependencies

- **Milestone 1** must be complete:
  - Express server running on port 3001
  - WebSocket infrastructure with first-message auth
  - Project structure with `src/backend/src/` directories
  - `@earendil-works/pi-coding-agent` package installed

---

## Task 2.1: AgentSessionRuntime Creation and Lifecycle

### Description

Create the `AgentSessionRuntime` on WebSocket connection, subscribe to session events, bind extensions, handle session replacement, and dispose on connection close.

### Todo

- [ ] **2.1.1** Create `src/backend/src/agent/runtime.ts`:
  - Import all required SDK types and factories:
    ```typescript
    import {
      createAgentSessionRuntime,
      createAgentSessionFromServices,
      createAgentSessionServices,
      getAgentDir,
      SessionManager,
      AuthStorage,
      ModelRegistry,
      DefaultResourceLoader,
      SettingsManager,
    } from '@earendil-works/pi-coding-agent';
    ```
  - Define the `CreateAgentSessionRuntimeFactory` function that closes over `AuthStorage` and `ModelRegistry`
  - Export a `createRuntime` factory function

- [ ] **2.1.2** Implement runtime creation on WebSocket connect:
  ```typescript
  async function createRuntime({ cwd, sessionManager, sessionStartEvent }) {
    const services = await createAgentSessionServices({ cwd });
    return {
      ...(await createAgentSessionFromServices({
        services,
        sessionManager,
        sessionStartEvent,
      })),
      services,
      diagnostics: services.diagnostics,
    };
  }

  const runtime = await createAgentSessionRuntime(createRuntime, {
    cwd: process.env.CWD || process.cwd(),
    agentDir: getAgentDir(),
    sessionManager: SessionManager.create(process.cwd()),
  });
  ```

- [ ] **2.1.3** Configure `DefaultResourceLoader`:
  - Set `cwd` from `CWD` env var (default `process.cwd()`)
  - Set `agentDir` from `getAgentDir()`
  - This enables discovery of:
    - Extensions from `.pi/extensions/`
    - Skills from `.pi/skills/`
    - Prompts from `.pi/prompts/`
    - Context files (AGENTS.md)

- [ ] **2.1.4** Configure `SettingsManager`:
  - Set up compaction, retry, and other agent behaviors
  - Call `settingsManager.flush()` at durability boundaries
  - Set up periodic `settingsManager.drainErrors()` call (see 2.1.7)

- [ ] **2.1.5** Implement `bindExtensions()` after runtime creation:
  ```typescript
  // Create ExtensionUIContext that relays all 9 extension UI methods to the client
  const uiContext: ExtensionUIContext = {
    select: async (id, title, options, message, timeout) => { ... },
    confirm: async (id, title, message, timeout) => { ... },
    input: async (id, title, message, placeholder, timeout) => { ... },
    editor: async (id, title, message, prefill, timeout) => { ... },
    notify: (id, notifyType, message) => { ... },
    setStatus: (id, statusKey, statusText) => { ... },
    setWidget: (id, widgetKey, widgetLines, widgetPlacement) => { ... },
    setTitle: (id, title) => { ... },
    set_editor_text: (id, text) => { ... },
    setWorkingMessage: (id, message) => { ... },
    setWorkingVisible: (id, visible) => { ... },
    setWorkingIndicator: (id, indicator) => { ... },
    setHiddenThinkingLabel: (id, label) => { ... },
    pasteToEditor: (id, text) => { ... },
    getEditorText: async (id) => { ... },
  };

  // Create onError listener
  const onError = (error: ExtensionError) => {
    ws.send(JSON.stringify({
      type: 'extension_error',
      data: {
        extensionPath: error.extensionPath,
        event: error.event,
        error: error.error,
        stack: error.stack,
      },
    }));
  };

  // Create command context actions
  const commandContextActions = {
    sendCommand: (command: WSCommand) => ws.send(JSON.stringify(command)),
  };

  runtime.session.bindExtensions({ uiContext, onError, commandContextActions });
  ```

- [ ] **2.1.6** Implement runtime disposal on WebSocket close:
  ```typescript
  ws.on('close', async () => {
    if (runtime) {
      await runtime.dispose(); // async — handles abort + session teardown
      runtime = null;
    }
    clearInterval(heartbeatInterval);
    clearInterval(ws.settingsErrorInterval); // Fix for Issue #16: clean up settings drainErrors interval
  });
  ```

- [ ] **2.1.7** Handle session creation errors:
  - Check `modelFallbackMessage` (getter on runtime) — display as warning toast
  - Check `extensionsResult.errors` (from `createAgentSessionFromServices`) — log and display
  - Relay errors to client as `{ type: 'error', data: { message, code } }`

- [ ] **2.1.8** Read and relay runtime diagnostics:
  ```typescript
  for (const diag of runtime.diagnostics) {
    ws.send(JSON.stringify({
      type: 'diagnostic',
      data: {
        level: diag.level, // 'warning' | 'error'
        message: diag.message,
        code: diag.code,
      },
    }));
  }
  ```

- [ ] **2.1.9** Set up periodic `settingsManager.drainErrors()` call:
  ```typescript
  // Store interval ID on ws object for cleanup in close handler (Fix for Issue #16)
  ws.settingsErrorInterval = setInterval(() => {
    const errors = settingsManager.drainErrors();
    for (const err of errors) {
      ws.send(JSON.stringify({
        type: 'settings_error',
        data: { message: err.message, code: err.code },
      }));
    }
  }, 5000); // every 5 seconds
  ```

- [ ] **2.1.10** Integrate runtime lifecycle into WebSocket handler:
  - On WebSocket `authenticated` event: create runtime
  - On WebSocket `close`: dispose runtime
  - Store runtime reference on the `ws` object: `ws.runtime = runtime`

### Additional Info

- **`createAgentSessionRuntime()` factory pattern** (from design doc §2):
  ```typescript
  const createRuntime: CreateAgentSessionRuntimeFactory = async ({
    cwd,
    sessionManager,
    sessionStartEvent,
  }) => {
    const services = await createAgentSessionServices({ cwd });
    return {
      ...(await createAgentSessionFromServices({
        services,
        sessionManager,
        sessionStartEvent,
      })),
      services,
      diagnostics: services.diagnostics,
    };
  };
  ```

- **Why `AgentSessionRuntime` over `createAgentSession()`:** The runtime provides `newSession()`, `switchSession()`, `fork()`, and `clone()` — methods essential for session management. `createAgentSession()` alone does NOT support session replacement.

- **Extension UI protocol** (9 methods):
  - **Dialog methods** (block until response): `select`, `confirm`, `input`, `editor`
  - **Fire-and-forget methods**: `notify`, `setStatus`, `setWidget`, `setTitle`, `set_editor_text`, `setWorkingMessage`, `setWorkingVisible`, `setWorkingIndicator`, `setHiddenThinkingLabel`, `pasteToEditor`, `getEditorText`

- **`modelFallbackMessage`**: When resuming a session whose model can't be restored, this getter contains the fallback message. Display as a warning toast to the user.

- **`extensionsResult.errors`**: Array of `{ path, error }` from `createAgentSessionFromServices()`. Log these and optionally display in the UI.

- **`SettingsManager.drainErrors()`**: The SDK docs explicitly state: "SettingsManager does not print settings I/O errors. Use drainErrors() and report them in your app layer." Call this periodically (every 5s is reasonable).

### Acceptance Criteria

- `AgentSessionRuntime` is created successfully on WebSocket authentication
- `runtime.session` is subscribed to events (placeholder handler — full relay in 2.2)
- Extensions are bound via `runtime.session.bindExtensions()` with UI context and error listener
- `runtime.dispose()` is called on WebSocket close (handles abort + teardown)
- Errors during session creation are sent to client as error events
- `modelFallbackMessage` is displayed as a warning toast on session resume
- Extension load errors are logged and relayed
- Extensions, skills, prompts, and context files are discovered from project and global paths
- Runtime diagnostics are read after creation and relayed as startup warnings
- `settingsManager.drainErrors()` is called periodically and errors are relayed

---

## Task 2.2: Event Relay (Server to Client)

### Description

Subscribe to `runtime.session.subscribe()` and map all SDK `AgentSessionEvent` types to WebSocket messages. Re-subscribe after every session replacement.

### Todo

- [ ] **2.2.1** Create `src/backend/src/agent/event-relay.ts`:
  - Define the `EventRelay` class
  - Constructor receives: `AgentSession`, `WebSocket` reference, `setRebindSession` callback
  - Implement `subscribe()` method that calls `session.subscribe(eventHandler)`
  - Implement `unsubscribe()` method for cleanup

- [ ] **2.2.2** Implement event handler mapping:
  ```typescript
  // Fix for Issue #1: import ExtensionUIRequest event type
  import { AgentSessionEvent, ExtensionUIRequest } from '@earendil-works/pi-coding-agent';

  const eventHandler = (event: AgentSessionEvent) => {
    switch (event.type) {
      case 'agent_start':
        ws.send(JSON.stringify({ type: 'agent_start', data: {} }));
        break;
      case 'agent_end':
        ws.send(JSON.stringify({
          type: 'agent_end',
          data: { messages: event.messages, willRetry: event.willRetry },
        }));
        break;
      case 'turn_start':
        ws.send(JSON.stringify({
          type: 'turn_start',
          data: { turnIndex: event.turnIndex, timestamp: event.timestamp },
        }));
        break;
      case 'turn_end':
        ws.send(JSON.stringify({
          type: 'turn_end',
          data: { turnIndex: event.turnIndex, message: event.message, toolResults: event.toolResults },
        }));
        break;
      case 'message_start':
        ws.send(JSON.stringify({ type: 'message_start', data: { message: event.message } }));
        break;
      case 'message_update':
        ws.send(JSON.stringify({
          type: 'message_update',
          data: {
            message: event.message,
            assistantMessageEvent: event.assistantMessageEvent,
          },
        }));
        break;
      case 'message_end':
        ws.send(JSON.stringify({ type: 'message_end', data: { message: event.message } }));
        break;
      case 'tool_execution_start':
        ws.send(JSON.stringify({
          type: 'tool_execution_start',
          data: { toolCallId: event.toolCallId, toolName: event.toolName, args: event.args },
        }));
        break;
      case 'tool_execution_update':
        ws.send(JSON.stringify({
          type: 'tool_execution_update',
          data: { toolCallId: event.toolCallId, toolName: event.toolName, partialResult: event.partialResult },
        }));
        break;
      case 'tool_execution_end':
        ws.send(JSON.stringify({
          type: 'tool_execution_end',
          data: { toolCallId: event.toolCallId, toolName: event.toolName, result: event.result, isError: event.isError },
        }));
        break;
      case 'queue_update':
        ws.send(JSON.stringify({
          type: 'queue_update',
          data: { steering: event.steering, followUp: event.followUp },
        }));
        break;
      case 'compaction_start':
        ws.send(JSON.stringify({ type: 'compaction_start', data: { reason: event.reason } }));
        break;
      case 'compaction_end':
        ws.send(JSON.stringify({
          type: 'compaction_end',
          data: {
            reason: event.reason,
            result: event.result,
            aborted: event.aborted,
            willRetry: event.willRetry,
            errorMessage: event.errorMessage,
          },
        }));
        break;
      case 'auto_retry_start':
        ws.send(JSON.stringify({
          type: 'auto_retry_start',
          data: { attempt: event.attempt, maxAttempts: event.maxAttempts, delayMs: event.delayMs, errorMessage: event.errorMessage },
        }));
        break;
      case 'auto_retry_end':
        ws.send(JSON.stringify({
          type: 'auto_retry_end',
          data: { success: event.success, attempt: event.attempt, finalError: event.finalError },
        }));
        break;
      case 'extension_error':
        ws.send(JSON.stringify({
          type: 'extension_error',
          data: { extensionPath: event.extensionPath, event: event.event, error: event.error, stack: event.stack },
        }));
        break;
      case 'session_info_changed':
        ws.send(JSON.stringify({ type: 'session_info_changed', data: { name: event.name } }));
        break;
      case 'thinking_level_changed':
        // Fix for Issue #4 & #17: Include available levels in the event
        const availableLevels = runtime.session.getAvailableThinkingLevels();
        ws.send(JSON.stringify({
          type: 'thinking_level_changed',
          data: {
            level: event.level,
            availableLevels: availableLevels,
          },
        }));
        break;
      case 'extension_ui_request':
        // Fix for Issue #1: Relay extension UI requests to frontend
        ws.send(JSON.stringify({
          type: 'extension_ui_request',
          data: {
            id: event.id,
            method: event.method,
            title: event.title,
            options: event.options,
            message: event.message,
            placeholder: event.placeholder,
            prefill: event.prefill,
          },
        }));
        break;
    }
  };
  ```

- [ ] **2.2.3** Implement re-subscription after session replacement:
  - Use `runtime.setRebindSession(callback)` to automate the pattern:
    ```typescript
    runtime.setRebindSession(() => {
      eventRelay.subscribe(); // re-subscribes to new runtime.session
      runtime.session.bindExtensions({ uiContext, onError, commandContextActions });
    });
    ```
  - This eliminates manual re-subscription code in `new_session`, `switch_session`, `fork`, `clone`, and `navigate_tree` handlers

- [ ] **2.2.4** Emit `session_changed` event after session replacement:
  ```typescript
  ws.send(JSON.stringify({ type: 'session_changed', data: {} }));
  ```

- [ ] **2.2.5** Emit `session_info` event on connection and after session changes:
  ```typescript
  ws.send(JSON.stringify({
    type: 'session_info',
    data: {
      sessionId: runtime.session.id,
      sessionFile: runtime.session.sessionFile,
      model: runtime.session.model.name,
      thinkingLevel: runtime.session.thinkingLevel,
      sessionName: runtime.session.name,
    },
  }));
  ```
  - **Fix for Issue #12 & #14:** The `sessionFile` field (full JSONL path) is included in this event. The frontend must store this in the session store and use it for `switch_session` commands instead of the short session `id`.

- [ ] **2.2.6** Handle backpressure:
  - Check `ws.readyState === WebSocket.OPEN` before every `ws.send()`
  - If connection is not open, skip the message (the connection is closing)

- [ ] **2.2.7** Handle rapid event bursts:
  - The `ws` library's `readyState` check naturally handles backpressure
  - No batching needed — stream events in real-time as specified

### Additional Info

- **Event types summary** (from design doc §6):

  | Category | Events |
  |---|---|
  | Agent lifecycle | `agent_start`, `agent_end` |
  | Turn lifecycle | `turn_start`, `turn_end` |
  | Message streaming | `message_start`, `message_update`, `message_end` |
  | Tool execution | `tool_execution_start`, `tool_execution_update`, `tool_execution_end` |
  | Queue state | `queue_update` |
  | Compaction | `compaction_start`, `compaction_end` |
  | Auto-retry | `auto_retry_start`, `auto_retry_end` |
  | Extension errors | `extension_error` |
  | Extension UI | `extension_ui_request` (Fix for Issue #1) |
  | Session metadata | `session_info_changed`, `thinking_level_changed` |

- **`message_update` delta types** (from `assistantMessageEvent.type`):
  - `text_start`, `text_delta`, `text_end` — text content
  - `thinking_start`, `thinking_delta`, `thinking_end` — thinking output
  - `toolcall_start`, `toolcall_delta`, `toolcall_end` — tool calls
  - `done`, `error` — completion/error

- **`compaction_end` result field**: `undefined` (not `null`) when compaction is aborted or failed. `details` carries extension-specific compaction data.

- **`agent_end.willRetry`**: When `true`, the agent will automatically retry (e.g., after compaction). Relay to frontend for UI indicator.

- **`auto_retry_end.finalError`**: Present when all retries are exhausted. Relay to frontend for error toast.

### Acceptance Criteria

- `message_update` events with `text_delta` stream to client in real-time
- Tool execution events (`tool_execution_start`, `tool_execution_end`) are relayed
- Agent lifecycle events (`agent_start`, `agent_end`) are relayed
- Turn events (`turn_start`, `turn_end`) are relayed
- Compaction events show "Compacting conversation..." indicator (via relay)
- Auto-retry events show "Retrying (attempt X/Y)..." indicator (via relay)
- `session_changed` is emitted after session replacement
- `session_info_changed` updates the sidebar when session name changes
- `thinking_level_changed` updates the settings panel when thinking level changes (includes availableLevels — Fix #4, #17)
- `extension_ui_request` events are relayed to the frontend (Fix #1)
- `compaction_end` with `willRetry` shows "Retrying after compaction..." indicator (via relay)
- `auto_retry_end` with `finalError` shows error toast (via relay)
- No events are lost during rapid streaming
- `setRebindSession()` eliminates manual re-subscription code

---

## Task 2.3: Command Handling (Client to Server)

### Description

Implement the command handler that routes all client-to-server WebSocket commands to the appropriate SDK methods.

### Todo

- [ ] **2.3.1** Create `src/backend/src/agent/command-handler.ts`:
  - Define the `CommandHandler` class
  - Constructor receives: `AgentSessionRuntime`, `WebSocket` reference
  - Implement `handleCommand(command: WSCommand)` method
  - Add command validation (type checking, required fields)

- [ ] **2.3.2** Implement `auth` command (first message only):
  ```typescript
  case 'auth': {
    const { secret } = payload as { secret: string };
    if (secret !== SHARED_SECRET) {
      ws.close(4011, 'Authentication failed');
      return;
    }
    ws.authenticated = true;
    // Proceed with runtime creation (handled in 2.1)
    break;
  }
  ```

- [ ] **2.3.3** Implement `prompt` command:
  ```typescript
  case 'prompt': {
    const { text, streamingBehavior } = payload as {
      text: string;
      streamingBehavior?: 'steer' | 'followUp';
    };
    try {
      await runtime.session.prompt(text, {
        streamingBehavior,
        source: 'rpc',
      });
    } catch (err: any) {
      // Fix for Issue #7: explicit error handling for prompt() during streaming
      if (err.message?.includes('streaming') || err.code === 'STREAMING_IN_PROGRESS') {
        ws.send(JSON.stringify({
          type: 'error',
          data: { message: 'Please use "steer" or "followUp" streaming behavior while the agent is active.' },
        }));
      } else {
        ws.send(JSON.stringify({
          type: 'error',
          data: { message: err.message || 'Prompt failed' },
        }));
      }
      return;
    }
    break;
  }
  ```
  - `streamingBehavior: 'steer'` — queues during streaming (delivered after current turn's tool calls)
  - `streamingBehavior: 'followUp'` — queues after agent finishes
  - `source: 'rpc'` — tells extensions where input came from

- [ ] **2.3.4** Implement `abort` command:
  ```typescript
  case 'abort': {
    await runtime.session.abort();
    break;
  }
  ```

- [ ] **2.3.5** Implement `new_session` command:
  ```typescript
  case 'new_session': {
    const result = await runtime.newSession();
    ws.send(JSON.stringify({
      type: 'response',
      command: 'new_session',
      success: true,
      data: { cancelled: result.cancelled },
    }));
    if (result.cancelled) {
      // Toast handled by frontend
    }
    break;
  }
  ```

- [ ] **2.3.6** Implement `switch_session` command:
  ```typescript
  case 'switch_session': {
    const { sessionPath, cwdOverride } = payload as {
      sessionPath: string;
      cwdOverride?: string;
    };
    const result = await runtime.switchSession(sessionPath, { cwdOverride });
    ws.send(JSON.stringify({
      type: 'response',
      command: 'switch_session',
      success: true,
      data: { cancelled: result.cancelled },
    }));
    break;
  }
  ```

- [ ] **2.3.7** Implement `fork` command:
  ```typescript
  case 'fork': {
    const { entryId, position } = payload as {
      entryId: string;
      position?: 'before' | 'at';
    };
    const result = await runtime.fork(entryId, { position: position ?? 'before' });
    ws.send(JSON.stringify({
      type: 'response',
      command: 'fork',
      success: true,
      data: {
        cancelled: result.cancelled,
        selectedText: result.selectedText,
      },
    }));
    break;
  }
  ```

- [ ] **2.3.8** Implement `clone` command:
  ```typescript
  case 'clone': {
    const result = await runtime.fork(runtime.session.getLeafId(), { position: 'at' });
    ws.send(JSON.stringify({
      type: 'response',
      command: 'clone',
      success: true,
      data: { cancelled: result.cancelled },
    }));
    break;
  }
  ```

- [ ] **2.3.9** Implement `navigate_tree` command:
  ```typescript
  case 'navigate_tree': {
    const { targetId, summarize, customInstructions, replaceInstructions, label } = payload as {
      targetId: string;
      summarize?: boolean;
      customInstructions?: string;
      replaceInstructions?: boolean;
      label?: string;
    };
    const result = await runtime.session.navigateTree(targetId, {
      summarize,
      customInstructions,
      replaceInstructions,
      label,
    });
    ws.send(JSON.stringify({
      type: 'response',
      command: 'navigate_tree',
      success: true,
      data: {
        editorText: result.editorText,
        cancelled: result.cancelled,
        aborted: result.aborted,
        summaryEntry: result.summaryEntry,
      },
    }));
    break;
  }
  ```

- [ ] **2.3.10** Implement `set_session_name` command:
  ```typescript
  case 'set_session_name': {
    const { name } = payload as { name: string };
    runtime.session.setSessionName(name);
    ws.send(JSON.stringify({
      type: 'response',
      command: 'set_session_name',
      success: true,
    }));
    break;
  }
  ```

- [ ] **2.3.11** Implement `get_fork_messages` command:
  ```typescript
  case 'get_fork_messages': {
    const messages = runtime.session.getUserMessagesForForking();
    ws.send(JSON.stringify({
      type: 'response',
      command: 'get_fork_messages',
      success: true,
      data: { messages },
    }));
    break;
  }
  ```

- [ ] **2.3.12** Implement `get_messages` command:
  ```typescript
  case 'get_messages': {
    // Fix for Issue #2: Transform SDK AgentMessage[] to frontend Message[] format
    const sdkMessages = runtime.session.messages;
    const transformed = sdkMessages.map(msg => transformMessage(msg));
    ws.send(JSON.stringify({
      type: 'response',
      command: 'get_messages',
      success: true,
      data: { messages: transformed },
    }));
    break;
  }
  ```
  - `transformMessage()` converts SDK `AgentMessage[]` to frontend `Message[]` format:
    - Assembles text content from all text deltas
    - Extracts tool calls from tool call deltas
    - Extracts thinking content from thinking deltas
    - Maps SDK `role` to frontend `role` ('user' | 'assistant')
    - Assigns stable IDs (use entry ID if available, otherwise hash)
    - Sets `timestamp` from the message's timestamp
  - Implement `transformMessage()` in `src/backend/src/agent/message-transform.ts`:
    ```typescript
    import { AgentMessage } from '@earendil-works/pi-coding-agent';
    import { Message, ToolCall } from '@/stores/chat';

    export function transformMessage(msg: AgentMessage): Message {
      let content = '';
      const toolCalls: ToolCall[] = [];
      let thinkingContent = '';

      // Iterate over assistantMessageEvent to extract content
      if (msg.assistantMessageEvent) {
        const evt = msg.assistantMessageEvent;
        // Assemble text from text deltas
        if (evt.textDeltas) {
          content = evt.textDeltas.join('');
        }
        // Extract tool calls from toolcall deltas
        if (evt.toolcallDeltas) {
          evt.toolcallDeltas.forEach(tc => {
            toolCalls.push({
              id: tc.toolCallId || `tc_${toolCalls.length}`,
              name: tc.toolName || 'unknown',
              args: tc.args || {},
              status: tc.status || 'running',
            });
          });
        }
        // Extract thinking content
        if (evt.thinkingDeltas) {
          thinkingContent = evt.thinkingDeltas.join('');
        }
      }

      return {
        id: msg.id || crypto.randomUUID(),
        role: msg.role === 'user' ? 'user' : 'assistant',
        content,
        timestamp: msg.timestamp || Date.now(),
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        thinkingContent: thinkingContent || undefined,
      };
    }
    ```

- [ ] **2.3.13** Implement `get_last_assistant_text` command:
  ```typescript
  case 'get_last_assistant_text': {
    const text = runtime.session.getLastAssistantText();
    ws.send(JSON.stringify({
      type: 'response',
      command: 'get_last_assistant_text',
      success: true,
      data: { text },
    }));
    break;
  }
  ```

- [ ] **2.3.14** Implement `set_model` command:
  ```typescript
  case 'set_model': {
    const { provider, modelId } = payload as { provider: string; modelId: string };
    // Fix for Issue #5: modelRegistry must be imported/injected into CommandHandler
    const model = modelRegistry.find(provider, modelId);
    if (!model) {
      ws.send(JSON.stringify({
        type: 'response',
        command: 'set_model',
        success: false,
        error: `Model not found: ${provider}/${modelId}`,
      }));
      return;
    }
    await runtime.session.setModel(model);
    ws.send(JSON.stringify({
      type: 'response',
      command: 'set_model',
      success: true,
      data: { model },
    }));
    break;
  }
  ```
  - **Fix for Issue #5:** `modelRegistry` must be imported in `command-handler.ts`:
    ```typescript
    import { modelRegistry } from '@earendil-works/pi-coding-agent';
    ```
  - Alternatively, pass `modelRegistry` as a constructor parameter to `CommandHandler` for testability:
    ```typescript
    constructor(
      private runtime: AgentSessionRuntime,
      private ws: WebSocket,
      private modelRegistry: ModelRegistry = modelRegistry, // default to singleton
    ) {}
    ```

- [ ] **2.3.15** Implement `set_thinking_level` command:
  ```typescript
  case 'set_thinking_level': {
    const { level } = payload as { level: 'off' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh' };
    runtime.session.setThinkingLevel(level);
    ws.send(JSON.stringify({
      type: 'response',
      command: 'set_thinking_level',
      success: true,
    }));
    break;
  }
  ```

- [ ] **2.3.16** Implement `compact` command:
  ```typescript
  case 'compact': {
    const { customInstructions } = payload as { customInstructions?: string };
    const result = await runtime.session.compact(customInstructions);
    ws.send(JSON.stringify({
      type: 'response',
      command: 'compact',
      success: true,
      data: {
        summary: result.summary,
        firstKeptEntryId: result.firstKeptEntryId,
        tokensBefore: result.tokensBefore,
        details: result.details,
      },
    }));
    break;
  }
  ```

- [ ] **2.3.17** Implement `extension_ui_response` command:
  ```typescript
  case 'extension_ui_response': {
    const { id, value, confirmed, cancelled } = payload as {
      id: string;
      value?: string;
      confirmed?: boolean;
      cancelled?: boolean;
    };
    // Fix for Issue #3: Route response through SDK's extension system
    // The SDK's bindExtensions() stores pending UI responses internally.
    // The response must be routed back to the pending dialog so the SDK
    // can resolve the Promise that the extension is waiting on.
    //
    // The exact mechanism depends on how bindExtensions() stores pending responses.
    // The uiContext object passed to bindExtensions() should have a method
    // to resolve the pending response, e.g.:
    //
    //   extensionUI.resolveResponse(id, { value, confirmed, cancelled });
    //
    // If the SDK doesn't expose this directly, the uiContext's dialog methods
    // (select, confirm, input, editor) should return Promises that are resolved
    // when the frontend sends extension_ui_response. The CommandHandler needs
    // access to the uiContext to route the response.

    // Example implementation with uiContext access:
    // uiContext.resolveResponse(id, {
    //   value,
    //   confirmed: confirmed ?? false,
    //   cancelled: cancelled ?? false,
    // });

    ws.send(JSON.stringify({
      type: 'response',
      command: 'extension_ui_response',
      success: true,
    }));
    break;
  }
  ```
  - **Fix for Issue #3:** The `CommandHandler` constructor must receive access to the `uiContext` (or a response resolver) so it can route `extension_ui_response` data back to the pending SDK dialog. Update the `CommandHandler` constructor:
    ```typescript
    constructor(
      private runtime: AgentSessionRuntime,
      private ws: WebSocket,
      private modelRegistry: ModelRegistry,
      private uiContext: ExtensionUIContext, // ← Add this for Issue #3 fix
    ) {}
    ```
  - In the WebSocket handler, pass `uiContext` to `CommandHandler`:
    ```typescript
    const commandHandler = new CommandHandler(runtime, ws, modelRegistry, uiContext);
    ```

- [ ] **2.3.18** Wire command handler into WebSocket message handler:
  ```typescript
  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data.toString());
      if (!isValidWSMessage(message)) {
        ws.send(JSON.stringify({ type: 'error', data: { message: 'Invalid message format' } }));
        return;
      }
      await commandHandler.handleCommand(message);
    } catch (err: any) {
      // Fix for Issue #6: Add default case handling in the switch statement
      // Unknown command types are handled by the default case in handleCommand()
      ws.send(JSON.stringify({ type: 'error', data: { message: err.message || 'Unknown error' } }));
    }
  });
  ```
  - **Fix for Issue #6:** Add `default` case in `CommandHandler.handleCommand()` switch statement:
    ```typescript
    // In handleCommand(), add this at the end of the switch:
    default: {
      ws.send(JSON.stringify({
        type: 'error',
        data: { message: `Unknown command: ${command.type}` },
      }));
      break;
    }
    ```

### Additional Info

- **`prompt` without `streamingBehavior` while streaming**: Throws an error. Catch and relay to client as `{ type: 'error', data: { message } }`.

- **Extension commands** (`/mycommand`) and **prompt templates** (`/template`) are handled automatically by `runtime.session.prompt()` — no special routing needed.

- **Session replacement cancellation**: `newSession()`, `switchSession()`, and `fork()` return `{ cancelled: boolean }` when extensions cancel the operation (via `session_before_switch` or `session_before_fork` handlers). The frontend should show a toast explaining the cancellation.

- **`fork` response `selectedText`**: Contains the text from the forked entry for pre-filling the input area.

- **`clone` vs `fork`**: `clone()` uses `fork(entryId, { position: "at" })` — does NOT return `selectedText`. It replaces the current branch rather than creating a new one.

- **`navigateTree()` vs `fork()`**: `navigateTree()` navigates in-place within the same session file (different from `fork` which creates a new file).

- **`setRebindSession()` usage**: Set this callback once after runtime creation. It will be called automatically after every session replacement (`newSession`, `switchSession`, `fork`). The callback should:
  1. Re-subscribe to `runtime.session.subscribe(eventHandler)`
  2. Re-bind extensions via `runtime.session.bindExtensions(bindings)`

### Acceptance Criteria

- `auth` command validates shared secret on first message
- `prompt` command triggers agent response
- `prompt` without `streamingBehavior` while streaming throws an error with user-friendly message (Fix #7)
- `prompt` with `streamingBehavior: 'followUp'` queues after agent finishes
- `prompt` with `streamingBehavior: 'followUp'` queues after agent finishes
- Extension commands (`/mycommand`) execute immediately even during streaming
- `abort` command stops current agent operation
- `new_session` creates a fresh session and emits `session_changed`
- `switch_session` loads the correct conversation and emits `session_changed` (supports `cwdOverride`)
- `fork` creates a forked session and emits `session_changed` (supports position option)
- `clone` creates a cloned branch and emits `session_changed`
- `navigate_tree` navigates in-place within the session (supports `replaceInstructions` and `label`)
- `set_model` resolves provider+modelId via `modelRegistry.find()` and switches the active model
- `set_session_name` sets the session display name
- `get_fork_messages` returns forkable user messages
- `get_messages` returns the full message list in frontend `Message[]` format (Fix #2)
- `get_messages` returns the full message list (for reconnection)
- `get_last_assistant_text` returns the last assistant text
- Extension cancellation (cancelled response) shows a toast notification (via frontend)
- Invalid commands are rejected with error events
- Unknown command types return `{ type: 'error', data: { message: 'Unknown command: <type>' } }` (Fix #6)

---

## Task 2.4: Model, Settings, and Commands Management

### Description

Create REST API endpoints for models, commands, sessions, and session stats. Support model switching, thinking level changes, and API key management.

### Todo

- [ ] **2.4.1** Create `src/backend/src/routes/models.ts`:
  ```typescript
  import { Router } from 'express';
  import { modelRegistry } from '@earendil-works/pi-coding-agent';
  const router = Router();

  router.get('/', (_req, res) => {
    try {
      const models = modelRegistry.getAvailable(); // synchronous
      if (models.length === 0) {
        // Check if API keys are configured
        res.json({
          models: [],
          message: 'No available models. Configure API keys in your environment or auth.json.',
        });
      } else {
        res.json({ models });
      }
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  export default router;
  ```

- [ ] **2.4.2** Create `src/backend/src/routes/commands.ts`:
  - List available commands from:
    - Extension commands (via extension registry)
    - Prompt templates (via `resourceLoader.getPrompts()`)
    - Skills
  - Return structured array of commands with names, descriptions, and parameters

- [ ] **2.4.3** Create `src/backend/src/routes/sessions.ts`:
  - `GET /api/sessions` — List all sessions (from `~/.pi/agent/sessions/`)
  - `POST /api/sessions` — Create a new session (delegates to `runtime.newSession()`)
  - `DELETE /api/sessions/:id` — Delete a session file

- [ ] **2.4.4** Create `src/backend/src/routes/session-stats.ts`:
  - `GET /api/sessions/:id/stats` — Return token usage, cost, and context window stats
  - Parse the session's JSONL file to compute stats
  - Or use SDK's built-in stats if available

- [ ] **2.4.5** Create `src/backend/src/routes/health.ts` (already done in Task 1.2, verify):
  - `GET /api/health` — Returns `{ status: 'ok' }`

- [ ] **2.4.6** Register all routes in `server.ts`:
  ```typescript
  import modelsRouter from './routes/models';
  import commandsRouter from './routes/commands';
  import sessionsRouter from './routes/sessions';
  import sessionStatsRouter from './routes/session-stats';

  app.use('/api/models', modelsRouter);
  app.use('/api/commands', commandsRouter);
  app.use('/api/sessions', sessionsRouter);
  app.use('/api/sessions', sessionStatsRouter); // nested: /api/sessions/:id/stats
  ```

- [ ] **2.4.7** Apply auth middleware to REST API routes:
  ```typescript
  import { authMiddleware } from './auth';
  app.use('/api', authMiddleware);
  ```

- [ ] **2.4.8** Configure `AuthStorage` and `ModelRegistry` initialization:
  - Read API keys from environment variables
  - Support `auth.json` file for persistent API key storage
  - Support runtime API key override via `authStorage.setRuntimeApiKey()`

- [ ] **2.4.9** Handle "no available models" case:
  - When `modelRegistry.getAvailable()` returns empty array
  - Return a clear message: "No available models. Configure API keys in your environment or auth.json."
  - Frontend should display this as a warning

### Additional Info

- **`modelRegistry.getAvailable()` is synchronous** — do NOT `await` it. It's a getter, not an async method.

- **Model resolution for `set_model`**: The command payload has `{ provider, modelId }` strings. The SDK requires a `Model<any>` object. Use `modelRegistry.find(provider, modelId)` to resolve.

- **API key configuration**:
  - Environment variables (e.g., `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`)
  - `auth.json` file in the agent directory
  - Runtime override: `authStorage.setRuntimeApiKey(provider, key)`

- **Session listing**: Sessions are stored as JSONL files in `~/.pi/agent/sessions/`. List them by globbing the directory and parsing metadata from the first line of each file.

- **Session stats**: Compute from the JSONL file:
  - Token usage: Count tokens in the session (may require SDK helper)
  - Cost: Multiply token counts by model-specific pricing
  - Context window: Percentage of context window used by the last message

### Acceptance Criteria

- Available models are listed with provider, name, and availability status
- `modelRegistry.getAvailable()` is called synchronously (not async)
- Empty model list returns a clear message when no API keys are configured
- Commands list includes extension commands, prompt templates, and skills
- Session stats include token usage, cost, and context window percentage
- Model switching works mid-session (resolves provider+modelId via `modelRegistry.find()`)
- Thinking level changes take effect immediately
- API keys are resolved from environment variables
- `GET /api/sessions` returns a list of sessions
- `POST /api/sessions` creates a new session
- `DELETE /api/sessions/:id` deletes a session
- `GET /api/sessions/:id/stats` returns session statistics
- Auth middleware protects all REST API routes

---

## Integration Notes

### How This Milestone Connects to Milestone 1

1. **Task 2.1** uses the WebSocket infrastructure from Milestone 1 (Task 1.3) and adds the pi SDK runtime lifecycle on top.

2. **Task 2.2** uses the runtime from 2.1 and populates the event relay that was left as a placeholder in Milestone 1.

3. **Task 2.3** uses the WebSocket message handler from Milestone 1 and populates it with actual command routing.

4. **Task 2.4** uses the Express server from Milestone 1 (Task 1.2) and adds REST API routes.

### Testing Strategy

- **Manual testing** (design doc §4, Level L1/L2):
  - `curl http://localhost:3001/api/health` → `{"status":"ok"}`
  - `curl http://localhost:3001/api/models -H "X-Shared-Secret: test"` → list of models
  - `wscat` for WebSocket auth, prompt, abort, session management
  - Ask agent to read a file → verify `tool_execution_start`/`tool_execution_end` events
  - Send `new_session` → verify `session_changed` event
  - Trigger compaction → verify `compaction_start`/`compaction_end` events
  - Send `/session` extension command → verify execution

- **Automated testing** (future):
  - Unit tests for command handler
  - Unit tests for event relay
  - Integration tests with a mock SDK

### Common Pitfalls

- **Re-subscribing after session replacement**: The most common bug. After `newSession()`, `switchSession()`, or `fork()`, `runtime.session` changes. You MUST re-subscribe to the new session's events. Use `setRebindSession()` to automate this.

- **Re-binding extensions after session replacement**: Same as above — `bindExtensions()` must be called again after every session replacement.

- **`modelRegistry.getAvailable()` is synchronous**: Don't `await` it. It's a getter.

- **`ws.readyState` check**: Always check `ws.readyState === WebSocket.OPEN` before sending. If the connection is closing, `ws.send()` will throw.

- **`runtime.dispose()` is async**: Always `await` it on WebSocket close. Not awaiting can cause resource leaks.

- **First-message auth timeout**: Set a reasonable timeout (5 seconds). If the client doesn't send auth, close the connection to prevent resource leaks.
