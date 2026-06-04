# Milestone 3: Frontend Chat Interface

**Design Doc Reference:** Phase 3 (Tasks 3.1 – 3.5)
**Status:** Not Started
**Estimated Effort:** 4–5 days

---

## Goal

Build the Vue 3 chat UI with real-time streaming, Pinia stores, WebSocket client service, markdown rendering, tool execution display, thinking output display, session sidebar, and responsive layout.

---

## Dependencies

- **Milestone 2** must be complete:
  - WebSocket server with full event relay and command handling
  - REST API endpoints (`/api/models`, `/api/commands`, `/api/sessions`, `/api/sessions/:id/stats`)
  - All WebSocket protocol events and commands defined and working

---

## Task 3.1: Pinia Stores

### Description

Create reactive Pinia stores for chat state (messages, streaming, connection) and session management (session list, stats, CRUD).

### Todo

- [ ] **3.1.1** Create `src/frontend/src/stores/chat.ts`:
  ```typescript
  import { defineStore } from 'pinia';

  export interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
    streaming?: boolean;
    toolCalls?: ToolCall[];
    thinkingContent?: string;
  }

  export interface ToolCall {
    id: string;
    name: string;
    args: Record<string, unknown>;
    status: 'running' | 'completed' | 'error';
    result?: string;
  }

  export const useChatStore = defineStore('chat', {
    state: () => ({
      // Connection state
      connectionState: 'disconnected' as 'disconnected' | 'connecting' | 'connected' | 'error',
      connectionError: null as string | null,

      // Messages
      messages: [] as Message[],
      currentSessionId: null as string | null,

      // Session info
      currentModel: null as string | null,
      currentThinkingLevel: 'off' as string,
      currentSessionName: null as string | null,

      // Streaming state
      isStreaming: false,
      currentTool: null as ToolCall | null,
      isCompacting: false,
      retryAttempt: 0,
      retryMax: 0,
      // Fix for Issue #10: tokensBefore is the token count BEFORE compaction,
      // not tokens saved. Display as "tokens before compaction: X" in UI.
      lastCompactionResult: null as { tokensBefore: number } | null,
      // Fix for Issue #4 & #17: Available thinking levels for current model
      availableThinkingLevels: [] as string[],

      // Queue state
      pendingSteerMessages: 0,
      pendingFollowUpMessages: 0,

      // Event queue for reconnection
      eventQueue: [] as string[],
    }),

    getters: {
      hasMessages: (state) => state.messages.length > 0,
      lastMessage: (state) => state.messages[state.messages.length - 1] || null,
      isIdle: (state) => !state.isStreaming && !state.isCompacting,
    },

    actions: {
      // Connection actions
      setConnectionState(state: 'disconnected' | 'connecting' | 'connected' | 'error') { ... },
      setConnectionError(error: string | null) { ... },

      // Message actions
      addUserMessage(text: string) { ... },
      addAssistantMessage(id: string) { ... },
      updateStreamingMessage(id: string, delta: string) { ... },
      updateThinkingContent(id: string, delta: string) { ... },
      completeStreamingMessage(id: string) { ... },

      // Tool call actions
      startToolCall(toolCallId: string, toolName: string, args: Record<string, unknown>) { ... },
      updateToolCall(toolCallId: string, partialResult: object) { ... },
      completeToolCall(toolCallId: string, result: object, isError: boolean) { ... },
      // Fix for Issue #9: Update tool call state from streaming deltas
      updateToolCallFromDelta(messageId: string, assistantMessageEvent: any) { ... },

      // Session actions
      setSessionInfo(info: { sessionId: string; model: string; thinkingLevel: string; sessionName?: string }) { ... },
      setModel(model: string) { ... },
      setThinkingLevel(level: string) { ... },
      // Fix for Issue #4: Update available thinking levels when model changes
      setAvailableThinkingLevels(levels: string[]) { this.availableThinkingLevels = levels; },
      setSessionName(name: string) { ... },

      // Streaming state actions
      startStreaming() { ... },
      stopStreaming() { ... },
      startCompacting() { ... },
      // Fix for Issue #10: tokensBefore is the token count BEFORE compaction,
      // not the number of tokens saved. UI should display as "tokens before compaction: X"
      stopCompacting(result?: { tokensBefore: number }) { ... },
      startRetry(attempt: number, maxAttempts: number) { ... },
      stopRetry(success: boolean, finalError?: string) { ... },

      // Queue actions
      setQueueState(steering: string[], followUp: string[]) { ... },

      // Session change (reset state)
      onSessionChanged() { ... },

      // Reconnection
      onReconnect() { ... },

      // Fix for Issue #2: Transform SDK messages to frontend format on reconnection
      // Called after 'get_messages' response from backend
      loadMessages(transformedMessages: Message[]) {
        this.messages = transformedMessages;
      },
    },
  });
  ```

- [ ] **3.1.2** Create `src/frontend/src/stores/sessions.ts`:
  ```typescript
  import { defineStore } from 'pinia';

  export interface Session {
    id: string;
    name: string;
    createdAt: number;
    updatedAt: number;
    model: string;
    messageCount: number;
    stats?: SessionStats;
  }

  export interface SessionStats {
    tokensUsed: number;
    cost: number;
    contextPercentage: number;
  }

  export const useSessionStore = defineStore('sessions', {
    state: () => ({
      sessions: [] as Session[],
      activeSessionId: null as string | null,
      loading: false,
      error: null as string | null,
    }),

    getters: {
      activeSession: (state) => state.sessions.find(s => s.id === state.activeSessionId) || null,
      sortedSessions: (state) => [...state.sessions].sort((a, b) => b.updatedAt - a.updatedAt),
    },

    actions: {
      async fetchSessions() { ... },
      async createSession() { ... },
      async deleteSession(sessionId: string) { ... },
      async switchSession(sessionId: string) { ... },
      async renameSession(sessionId: string, name: string) { ... },
      async updateSessionStats(sessionId: string, stats: SessionStats) { ... },
      async loadSessionMessages(sessionId: string) { ... },
      // Fix for Issue #12: Store sessionFile from session_info event
      updateSessionFile(sessionId: string, sessionFile: string) {
        const session = this.sessions.find(s => s.id === sessionId);
        if (session) session.sessionFile = sessionFile;
      },
    },
  });
  ```

- [ ] **3.1.3** Register Pinia in `src/frontend/src/main.ts`:
  ```typescript
  import { createApp } from 'vue';
  import { createPinia } from 'pinia';
  import App from './App.vue';

  const app = createApp(App);
  app.use(createPinia());
  app.mount('#app');
  ```

- [ ] **3.1.4** Create `src/frontend/src/stores/settings.ts`:
  ```typescript
  import { defineStore } from 'pinia';

  export const useSettingsStore = defineStore('settings', {
    state: () => ({
      sharedSecret: '',
      apiKeys: {} as Record<string, string>,
      theme: 'dark' as 'dark' | 'light',
      fontSize: 14 as number,
      autoScroll: true,
      showThinking: true,
      showTools: true,
    }),

    actions: {
      loadFromLocalStorage() { ... },
      saveToLocalStorage() { ... },
      setApiKey(provider: string, key: string) { ... },
      setSharedSecret(secret: string) { ... },
    },
  });
  ```

### Additional Info

- **Pinia store patterns**:
  - Use `defineStore` with the options API style (not setup store) for better TypeScript inference
  - Keep state minimal — only what the UI needs
  - Use getters for computed values (e.g., `hasMessages`, `isIdle`)
  - Actions should be async where they call the WebSocket service

- **Message ID generation**: Use `crypto.randomUUID()` for unique message IDs.

- **Reactivity considerations**:
  - `messages` array should be reactive — use `push()`, `splice()`, etc. (not reassignment)
  - `connectionState` should be a reactive ref or state property
  - Streaming updates should trigger re-renders via reactive properties

- **localStorage persistence**: Settings store should load from and save to localStorage. Use a key prefix like `betty:` to avoid collisions.

### Acceptance Criteria

- Stores are reactive and persist across component lifecycle
- WebSocket state transitions are tracked (connecting → connected → disconnected)
- Messages are stored with timestamps and roles
- Compaction and retry state is tracked for UI indicators
- Session stats update after `agent_end`
- Settings persist across page reloads (localStorage)
- `useChatStore` and `useSessionStore` are accessible in all Vue components

---

## Task 3.2: WebSocket Client Service

### Description

Create a robust WebSocket client with automatic reconnection, command sending, event parsing, and heartbeat.

### Todo

- [ ] **3.2.1** Create `src/frontend/src/services/websocket.ts`:
  ```typescript
  export class WebSocketService {
    private ws: WebSocket | null = null;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private reconnectDelay = 1000; // starts at 1s, doubles each attempt
    private messageQueue: string[] = [];
    private commandIdCounter = 0;
    private pendingCommands: Map<string, { resolve: Function; reject: Function }> = new Map();

    constructor(
      private url: string,
      private secret: string,
      private onEvent: (event: WSEvent) => void,
      private onStatusChange: (status: ConnectionStatus) => void,
    ) {}

    connect() { ... }
    disconnect() { ... }
    sendCommand(type: WSCommandType, payload: Record<string, unknown>): Promise<WSResponse> { ... }
    private authenticate() { ... }
    private handleMessage(data: string) { ... }
    private handleEvent(event: WSEvent) { ... }
    private handleResponse(response: WSResponse) { ... }
    private reconnect() { ... }
    private sendHeartbeat() { ... }
    private getBackoffDelay(): number { ... }
  }
  ```

- [ ] **3.2.2** Implement connection with first-message auth:
  ```typescript
  connect() {
    this.ws = new WebSocket(this.url);
    this.onStatusChange('connecting');

    this.ws.onopen = () => {
      this.authenticate();
    };

    this.ws.onmessage = (event) => {
      this.handleMessage(event.data);
    };

    this.ws.onclose = (event) => {
      this.onStatusChange('disconnected');
      if (event.code !== 4001 && event.code !== 4011) {
        this.reconnect();
      }
    };

    this.ws.onerror = () => {
      this.onStatusChange('error');
    };
  }
  ```

- [ ] **3.2.3** Implement authentication:
  ```typescript
  private authenticate() {
    this.sendRaw(JSON.stringify({
      type: 'auth',
      payload: { secret: this.secret },
    }));
  }
  ```

- [ ] **3.2.4** Implement command sending with correlation:
  ```typescript
  sendCommand(type: WSCommandType, payload: Record<string, unknown>): Promise<WSResponse> {
    const commandId = `cmd_${++this.commandIdCounter}`;
    const command = {
      type,
      payload: { ...payload, _id: commandId },
    };

    return new Promise((resolve, reject) => {
      this.pendingCommands.set(commandId, { resolve, reject });
      this.sendRaw(JSON.stringify(command));

      // Timeout after 30 seconds
      setTimeout(() => {
        this.pendingCommands.delete(commandId);
        reject(new Error(`Command ${type} timed out`));
      }, 30000);
    });
  }
  ```

- [ ] **3.2.5** Implement event parsing and routing:
  ```typescript
  private handleMessage(data: string) {
    const message = JSON.parse(data);
    if (message.type === 'response') {
      this.handleResponse(message);
    } else {
      this.onEvent(message);
    }
  }

  private handleResponse(response: WSResponse) {
    const pending = this.pendingCommands.get(response._id);
    if (pending) {
      this.pendingCommands.delete(response._id);
      if (response.success) {
        pending.resolve(response.data);
      } else {
        pending.reject(new Error(response.error));
      }
    }
  }
  ```

- [ ] **3.2.6** Implement exponential backoff reconnection:
  ```typescript
  private reconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.onStatusChange('error');
      return;
    }

    const delay = this.getBackoffDelay();
    this.reconnectAttempts++;

    setTimeout(() => {
      this.connect();
    }, delay);
  }

  private getBackoffDelay(): number {
    return Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 30000);
  }
  ```

- [ ] **3.2.7** Implement heartbeat:
  ```typescript
  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000);
  }
  ```

- [ ] **3.2.8** Create Vue composable `src/frontend/src/composables/useWebSocket.ts`:
  ```typescript
  import { ref, computed, onMounted, onUnmounted } from 'vue';
  import { WebSocketService } from '../services/websocket';

  export function useWebSocket() {
    const isConnected = ref(false);
    const isConnecting = ref(false);
    const connectionError = ref<string | null>(null);
    const events = ref<WSEvent[]>([]);

    const service = new WebSocketService(
      `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`,
      settingsStore.sharedSecret,
      (event) => {
        events.value.push(event);
        // Route to chat store
        chatStore.handleEvent(event);
      },
      (status) => {
        isConnected.value = status === 'connected';
        isConnecting.value = status === 'connecting';
        connectionError.value = status === 'error' ? 'Connection lost' : null;
      },
    );

    onMounted(() => service.connect());
    onUnmounted(() => service.disconnect());

    return {
      isConnected,
      isConnecting,
      connectionError,
      sendCommand: (type, payload) => service.sendCommand(type, payload),
    };
  }
  ```

### Additional Info

- **Reconnection strategy**:
  - Max 5 retries
  - Exponential backoff: 1s, 2s, 4s, 8s, 16s (capped at 30s)
  - On reconnect, request `get_messages` to restore conversation state
  - On reconnect, request `session_info` to restore session state

- **Command correlation**: Each command sent gets a unique `_id`. The server echoes this back in the response. Match responses to pending promises.

- **Message queue**: If the WebSocket is disconnected but commands are sent, queue them and send on reconnect.

- **Heartbeat**: Ping every 30 seconds. If no pong received in 5 seconds, the server will close the connection (handled by server-side heartbeat from Milestone 1).

- **Error handling**:
  - Connection failures → toast notification
  - Command failures → toast notification with error message
  - WebSocket close with code 4001/4011 → do NOT reconnect (auth issue)

### Acceptance Criteria

- Reconnects automatically after network interruption (max 5 retries, exponential backoff)
- Sends commands and receives events reliably
- Exposes `isConnected`, `isConnecting` reactive state
- Handles WebSocket errors gracefully
- Commands return Promises that resolve/reject with responses
- Event parsing correctly routes events to the chat store
- Heartbeat keeps connection alive

---

## Task 3.3: Chat View Component

### Description

Build the main chat interface with message list, streaming indicator, tool execution display, thinking output, and input area.

### Todo

- [ ] **3.3.1** Create `src/frontend/src/components/ChatView.vue`:
  - Main layout: sidebar (collapsible) + chat area
  - Chat area contains: message list + input area
  - Auto-scroll to bottom on new messages
  - Responsive layout (mobile-friendly)

- [ ] **3.3.2** Create `src/frontend/src/components/MessageBubble.vue`:
  - Props: `message: Message`, `isStreaming: boolean`
  - User messages: right-aligned, distinct background color
  - Assistant messages: left-aligned, markdown rendered
  - Streaming state: show typing indicator
  - Tool calls: collapsible section within assistant message
  - Thinking content: collapsible section within assistant message

- [ ] **3.3.3** Create `src/frontend/src/components/StreamingIndicator.vue`:
  - Multi-state indicator based on agent state:
    - `agent_start` → "Thinking..." with pulsing dots animation
    - `turn_start` → "Working..." with pulsing dots animation
    - `compaction_start` → "Compacting conversation..." with spinner
    - `auto_retry_start` → "Retrying (attempt X/Y)..." with spinner
    - `compaction_end` with `willRetry` → "Retrying after compaction..."
    - `auto_retry_end` with `finalError` → error message
  - Hide when agent is idle

- [ ] **3.3.4** Create `src/frontend/src/components/ToolExecution.vue`:
  - Props: `toolCall: ToolCall`
  - Collapsible section showing:
    - Tool name (e.g., `read`, `write`, `bash`)
    - Status indicator (running/completed/error)
    - Arguments preview (truncated)
    - Result preview (truncated, expandable)
  - Color coding: green (completed), yellow (running), red (error)

- [ ] **3.3.5** Create `src/frontend/src/components/ThinkingBlock.vue`:
  - Props: `content: string`, `collapsed: boolean`
  - Collapsible section for thinking output
  - Header: "💭 Thinking" with toggle button
  - Body: rendered thinking content via `MarkdownRenderer` component (Fix for Issue #8)
  - Default collapsed state
  - **Fix for Issue #11:** Add scroll container with max-height and overflow-y-auto to handle potentially large thinking content:
    ```vue
    <template>
      <div class="thinking-block">
        <div class="thinking-header" @click="collapsed = !collapsed">
          <span>💭 Thinking</span>
          <span>{{ collapsed ? '▶' : '▼' }}</span>
        </div>
        <div v-if="!collapsed" class="thinking-body">
          <div class="thinking-content-scroll">
            <MarkdownRenderer :content="content" />
          </div>
        </div>
      </div>
    </template>
    ```
    ```css
    .thinking-content-scroll {
      max-height: 400px;
      overflow-y: auto;
      padding: 8px;
    }
    ```

- [ ] **3.3.6** Create `src/frontend/src/components/InputArea.vue`:
  - Props: `disabled: boolean`, `commands: Command[]`
  - Textarea with auto-resize
  - Send button (disabled when empty or streaming)
  - Keyboard shortcuts:
    - `Enter` → send message
    - `Shift+Enter` → newline
    - `Ctrl+Enter` → send (alternative)
    - `Escape` → abort (when streaming)
  - Command suggestions: show `/` commands as dropdown
  - Queue state display: "N messages queued" when `queue_update` has pending messages
  - Compaction result display: "Compacted: X tokens saved" after `compaction_end` with result

- [ ] **3.3.7** Wire up event handling in `ChatView.vue`:
  ```typescript
  // In ChatView.vue
  function handleEvent(event: WSEvent) {
    switch (event.type) {
      case 'agent_start':
        chatStore.startStreaming();
        break;
      case 'agent_end':
        chatStore.stopStreaming();
        if (event.data.willRetry) {
          // Show "Retrying after compaction..."
        }
        break;
      case 'turn_start':
        // Update streaming indicator to "Working..."
        break;
      case 'turn_end':
        break;
      case 'message_start':
        chatStore.addAssistantMessage(event.data.message.id);
        break;
      case 'message_update':
        const { type, delta, contentIndex } = event.data.assistantMessageEvent;
        if (type === 'text_delta') {
          chatStore.updateStreamingMessage(event.data.message.id, delta);
        } else if (type === 'thinking_delta') {
          chatStore.updateThinkingContent(event.data.message.id, delta);
        } else if (type === 'toolcall_delta') {
          // Fix for Issue #9: Handle toolcall_delta events during streaming
          chatStore.updateToolCallFromDelta(
            event.data.message.id,
            event.data.assistantMessageEvent,
          );
        } else if (type === 'error') {
          // Fix for Issue #15: Handle error delta type for inline streaming errors
          chatStore.updateStreamingMessage(
            event.data.message.id,
            `[Error: ${event.data.assistantMessageEvent.error || 'Streaming error'}]`,
          );
        }
        break;
      case 'message_end':
        chatStore.completeStreamingMessage(event.data.message.id);
        break;
      case 'tool_execution_start':
        chatStore.startToolCall(
          event.data.toolCallId,
          event.data.toolName,
          event.data.args,
        );
        break;
      case 'tool_execution_update':
        chatStore.updateToolCall(event.data.toolCallId, event.data.partialResult);
        break;
      case 'tool_execution_end':
        chatStore.completeToolCall(
          event.data.toolCallId,
          event.data.result,
          event.data.isError,
        );
        break;
      case 'queue_update':
        chatStore.setQueueState(event.data.steering, event.data.followUp);
        break;
      case 'compaction_start':
        chatStore.startCompacting();
        break;
      case 'compaction_end':
        // Fix for Issue #10: Display tokensBefore as "tokens before compaction" rather than "tokens saved"
        // tokensBefore is the token count BEFORE compaction, not the reduction amount
        if (event.data.result) {
          chatStore.stopCompacting({
            tokensBefore: event.data.result.tokensBefore,
            // If tokensAfter is available in the result, compute actual savings:
            // tokensSaved: event.data.result.tokensBefore - event.data.result.tokensAfter,
          });
        } else if (event.data.aborted || event.data.errorMessage) {
          chatStore.stopCompacting();
        }
        break;
      case 'auto_retry_start':
        chatStore.startRetry(event.data.attempt, event.data.maxAttempts);
        break;
      case 'auto_retry_end':
        chatStore.stopRetry(event.data.success, event.data.finalError);
        break;
      case 'session_info':
        chatStore.setSessionInfo(event.data);
        // Fix for Issue #12 & #14: Store sessionFile in session store
        if (event.data.sessionId && event.data.sessionFile) {
          sessionStore.updateSessionFile(event.data.sessionId, event.data.sessionFile);
        }
        break;
      case 'session_changed':
        chatStore.onSessionChanged();
        break;
      case 'session_info_changed':
        chatStore.setSessionName(event.data.name);
        break;
      case 'thinking_level_changed':
        // Fix for Issue #4: Also update available levels when thinking level changes
        chatStore.setThinkingLevel(event.data.level);
        if (event.data.availableLevels) {
          chatStore.setAvailableThinkingLevels(event.data.availableLevels);
        }
        break;
      case 'extension_ui_request':
        // Fix for Issue #1: Handle extension UI dialog requests
        handleExtensionUIRequest(event);
        break;
      case 'extension_error':
        // Show error toast
        break;
      case 'error':
        // Show error toast
        break;
    }
  }

  // Fix for Issue #1: Extension dialog handler
  function handleExtensionUIRequest(event: WSEvent) {
    const { id, method, title, options, message, placeholder, prefill } = event.data;
    // Open ExtensionDialog component and wait for user response
    // When user responds, send extension_ui_response back to server
    const dialog = openExtensionDialog({
      id,
      method, // 'select' | 'confirm' | 'input' | 'editor'
      title,
      options,      // for 'select'
      message,
      placeholder,  // for 'input'
      prefill,      // for 'editor'
    });
    dialog.onConfirm = async (response) => {
      await sendCommand('extension_ui_response', {
        id,
        value: response.value,
        confirmed: response.confirmed,
        cancelled: response.cancelled,
      });
    };
  }
  ```
  - **Fix for Issue #1:** Create `src/frontend/src/components/ExtensionDialog.vue`:
    ```vue
    <template>
      <div class="extension-dialog-overlay" v-if="visible">
        <div class="extension-dialog">
          <h3>{{ title }}</h3>

          <!-- Select dialog -->
          <div v-if="method === 'select'">
            <p>{{ message }}</p>
            <select v-model="selectedOption">
              <option v-for="opt in options" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </option>
            </select>
            <button @click="confirm({ value: selectedOption })">Confirm</button>
            <button @click="cancel()">Cancel</button>
          </div>

          <!-- Confirm dialog -->
          <div v-if="method === 'confirm'">
            <p>{{ message }}</p>
            <button @click="confirm({ confirmed: true })">Yes</button>
            <button @click="confirm({ confirmed: false })">No</button>
          </div>

          <!-- Input dialog -->
          <div v-if="method === 'input'">
            <p>{{ message }}</p>
            <input
              v-model="inputValue"
              :placeholder="placeholder"
              @keyup.enter="confirm({ value: inputValue })"
            />
            <button @click="confirm({ value: inputValue })">Confirm</button>
            <button @click="cancel()">Cancel</button>
          </div>

          <!-- Editor dialog -->
          <div v-if="method === 'editor'">
            <p>{{ message }}</p>
            <textarea v-model="editorText" :placeholder="prefill"></textarea>
            <button @click="confirm({ value: editorText })">Confirm</button>
            <button @click="cancel()">Cancel</button>
          </div>
        </div>
      </div>
    </template>
    ```
  - **Fix for Issue #15:** The `message_update` handler now handles all delta types:
    - `text_delta` — accumulates text content
    - `thinking_delta` — accumulates thinking content
    - `toolcall_delta` — updates tool call state (Issue #9 fix)
    - `error` — shows inline error message (Issue #15 fix)
    - Other types (`text_start`, `text_end`, `thinking_start`, `thinking_end`, `toolcall_start`, `toolcall_end`, `done`) are handled for state management but don't produce visible output

- [ ] **3.3.8** Implement auto-scroll:
  ```typescript
  // Scroll to bottom on new messages or streaming updates
  const chatContainer = ref<HTMLDivElement>();
  watch(
    () => chatStore.messages.length,
    () => {
      if (chatStore.autoScroll) {
        nextTick(() => {
          chatContainer.value?.scrollTo({ top: chatContainer.value.scrollHeight, behavior: 'smooth' });
        });
      }
    },
  );
  ```

- [ ] **3.3.9** Implement responsive layout:
  - Desktop: sidebar always visible, chat area takes remaining space
  - Mobile: sidebar hidden, toggle with hamburger menu
  - Use Tailwind responsive classes (`hidden md:block`, etc.)

### Additional Info

- **Streaming behavior**:
  - `message_update` events arrive frequently during streaming
  - Each `text_delta` contains a small chunk of text (1-10 characters typically)
  - The frontend accumulates deltas into the message content
  - `partial` field in `assistantMessageEvent` contains the full accumulated message

- **Tool call rendering**:
  - Group tool calls by turn (between `turn_start` and `turn_end`)
  - Show tool name, status, and a truncated preview of args/result
  - Expandable to show full details

- **Thinking output**:
  - Models with thinking enabled produce `thinking_start`, `thinking_delta`, `thinking_end` events
  - Display in a collapsible section (default collapsed)
  - Render as markdown within the thinking block

- **Input area states**:
  - Normal: text input with send button
  - Streaming: input disabled (unless using `streamingBehavior: 'steer'`)
  - Queued: show "N messages queued" indicator
  - Error: show error message with retry button

- **Command suggestions**:
  - When user types `/`, show a dropdown of available commands
  - Commands come from `/api/commands` endpoint
  - Include extension commands, prompt templates, and skills

### Acceptance Criteria

- Messages render correctly with proper alignment (user right, assistant left)
- Streaming text appears in real-time (character-by-character)
- Tool executions are visible and collapsible
- Thinking output is visible, collapsible, and rendered as markdown (Fix #8)
- Thinking output has scroll container for large content (Fix #11)
- Thinking output is visible and collapsible
- Auto-scroll works during streaming
- Input is disabled during streaming (unless using steer via streamingBehavior)
- Streaming indicator reflects current agent state (thinking, working, compacting, retrying)
- Extension dialogs (select, confirm, input, editor) work correctly (Fix #1)
- Command suggestions are shown in the input area
- Tool call deltas are handled during streaming (Fix #9)
- Error deltas show inline error messages (Fix #15)
- Queue state display shows "N messages queued"
- Compaction result display shows accurate token info ("tokens before compaction: X" or "X tokens saved" if tokensAfter available) (Fix #10)
- Compaction result display shows "Compacted: X tokens saved"
- Responsive layout works on mobile and desktop

---

## Task 3.4: Markdown Rendering

### Description

Create a markdown renderer component with syntax highlighting, copy-to-clipboard, and HTML sanitization.

### Todo

- [ ] **3.4.1** Create `src/frontend/src/components/MarkdownRenderer.vue`:
  ```vue
  <template>
    <div class="markdown-content" v-html="renderedHtml"></div>
  </template>

  <script setup lang="ts">
  import { computed } from 'vue';
  import { marked } from 'marked';
  import DOMPurify from 'dompurify';
  import hljs from 'highlight.js';
  import 'highlight.js/styles/github-dark.css'; // or another theme

  marked.setOptions({
    highlight: function (code, lang) {
      if (lang && hljs.getLanguage(lang)) {
        return hljs.highlight(code, { language: lang }).value;
      }
      return hljs.highlightAuto(code).value;
    },
    breaks: true,
    gfm: true,
  });

  const props = defineProps<{
    content: string;
  }>();

  const renderedHtml = computed(() => {
    const html = marked.parse(props.content, { async: false }) as string;
    return DOMPurify.sanitize(html);
  });
  </script>
  ```

- [ ] **3.4.2** Add copy-to-clipboard button on code blocks:
  - Use `marked`'s `renderer` option to add a `code` renderer
  - Wrap code blocks in a container with a copy button
  - Use `navigator.clipboard.writeText()` for copying

  ```typescript
  marked.setOptions({
    renderer: {
      code(code, infostring, escaped) {
        const lang = infostring?.split(/\s+/g)?.[0];
        const highlighted = lang && hljs.getLanguage(lang)
          ? hljs.highlight(code, { language: lang }).value
          : hljs.highlightAuto(code).value;
        const langLabel = lang || 'text';
        return `<div class="code-block relative">
          <div class="code-header">
            <span class="code-lang">${langLabel}</span>
            <button class="copy-btn" onclick="navigator.clipboard.writeText(this.closest('.code-block').querySelector('code').textContent)">
              Copy
            </button>
          </div>
          <pre><code class="hljs language-${langLabel}">${highlighted}</code></pre>
        </div>`;
      },
    },
  });
  ```

- [ ] **3.4.3** Add custom CSS for markdown content:
  ```css
  /* src/frontend/src/styles/markdown.css */
  .markdown-content h1, .markdown-content h2, .markdown-content h3 {
    @apply font-bold mt-4 mb-2;
  }
  .markdown-content p {
    @apply mb-2;
  }
  .markdown-content ul, .markdown-content ol {
    @apply ml-4 mb-2;
  }
  .markdown-content blockquote {
    @apply border-l-4 border-gray-600 pl-4 italic mb-2;
  }
  .markdown-content table {
    @apply w-full border-collapse mb-2;
  }
  .markdown-content th, .markdown-content td {
    @apply border border-gray-700 px-3 py-2;
  }
  .code-block {
    @apply relative bg-gray-900 rounded-lg mb-2 overflow-hidden;
  }
  .code-header {
    @apply flex justify-between items-center px-3 py-1 bg-gray-800 text-xs text-gray-400;
  }
  .copy-btn {
    @apply px-2 py-1 rounded text-xs hover:bg-gray-700;
  }

  /* Fix for Issue #1: ExtensionDialog styles */
  .extension-dialog-overlay {
    @apply fixed inset-0 bg-black/50 flex items-center justify-center z-50;
  }
  .extension-dialog {
    @apply bg-gray-800 rounded-lg p-6 max-w-md w-full;
  }
  .extension-dialog h3 {
    @apply text-lg font-bold mb-4;
  }
  .extension-dialog p {
    @apply mb-4;
  }
  .extension-dialog select,
  .extension-dialog input,
  .extension-dialog textarea {
    @apply w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 mb-4 text-white;
  }
  .extension-dialog textarea {
    @apply min-h-[100px];
  }
  .extension-dialog button {
    @apply px-4 py-2 rounded mr-2;
  }

  /* Fix for Issue #11: ThinkingBlock scroll container */
  .thinking-content-scroll {
    max-height: 400px;
    overflow-y: auto;
    padding: 8px;
  }
  ```

- [ ] **3.4.4** Apply `MarkdownRenderer` to all assistant messages in `MessageBubble.vue`:
  ```vue
  <template>
    <div class="message assistant">
      <MarkdownRenderer :content="message.content" />
    </div>
  </template>
  ```
  - **Fix for Issue #8:** Also apply `MarkdownRenderer` inside `ThinkingBlock.vue`:
    ```vue
    <template>
      <div class="thinking-block">
        <div class="thinking-header" @click="collapsed = !collapsed">
          <span>💭 Thinking</span>
          <span>{{ collapsed ? '▶' : '▼' }}</span>
        </div>
        <div v-if="!collapsed" class="thinking-body">
          <div class="thinking-content-scroll">
            <MarkdownRenderer :content="content" />
          </div>
        </div>
      </div>
    </template>
    ```

### Additional Info

- **`marked` configuration**:
  - Enable GFM (GitHub Flavored Markdown) for tables, strikethrough, etc.
  - Enable line breaks for single-newline-to-paragraph conversion
  - Use `highlight.js` for syntax highlighting via the `highlight` option

- **`highlight.js` themes**:
  - `github-dark.css` — dark theme, matches most dark UIs
  - `atom-one-dark.css` — alternative dark theme
  - Let the user choose in settings (future enhancement)

- **`DOMPurify` configuration**:
  - Default configuration is sufficient for most cases
  - Allow common HTML tags used by markdown (p, strong, em, code, pre, etc.)
  - Block script tags, event handlers, and iframes

- **Copy-to-clipboard**: Use `navigator.clipboard.writeText()`. Show a brief "Copied!" feedback on the button.

### Acceptance Criteria

- Markdown renders correctly (headings, lists, code blocks, inline code)
- Code blocks have syntax highlighting with language labels
- Copy button works on code blocks
- HTML is sanitized (no script injection)
- Tables render correctly
- Blockquotes render with left border
- Responsive code blocks (horizontal scroll on mobile)

---

## Task 3.5: Session Sidebar

### Description

Build the session sidebar with session list, new session button, active session highlight, delete confirmation, and mobile collapse.

### Todo

- [ ] **3.5.1** Create `src/frontend/src/components/SessionSidebar.vue`:
  - Session list (scrollable)
  - New session button at top
  - Active session highlight
  - Session metadata: name, date, model
  - Delete button per session (with confirmation)
  - Rename support (click to edit)
  - Collapsible on mobile (hamburger menu)

- [ ] **3.5.2** Implement session list rendering:
  ```vue
  <template>
    <aside class="sidebar">
      <div class="sidebar-header">
        <button @click="createNewSession" class="new-session-btn">
          + New Session
        </button>
        <button @click="toggleSidebar" class="mobile-toggle">☰</button>
      </div>
      <div class="session-list">
        <div
          v-for="session in sortedSessions"
          :key="session.id"
          class="session-item"
          :class="{ active: session.id === activeSessionId }"
          @click="switchSession(session.id)"
        >
          <div class="session-name">{{ session.name || 'Untitled' }}</div>
          <div class="session-meta">
            <span>{{ formatDate(session.updatedAt) }}</span>
            <span>{{ session.model }}</span>
          </div>
          <button @click.stop="deleteSession(session.id)" class="delete-btn">🗑</button>
        </div>
      </div>
    </aside>
  </template>
  ```

- [ ] **3.5.3** Implement session CRUD operations:
  ```typescript
  async function createNewSession() {
    await sessionStore.createSession();
    await sendCommand('new_session', {});
  }

  async function switchSession(sessionId: string) {
    await sessionStore.switchSession(sessionId);
    // Fix for Issue #12: Use session.sessionFile (full path) instead of session.id (short ID)
    const session = sessionStore.sessions.find(s => s.id === sessionId);
    const sessionPath = session?.sessionFile || sessionId;
    await sendCommand('switch_session', { sessionPath });

    // Fix for Issue #2: After session switch, request transformed messages
    const response = await sendCommand('get_messages', {});
    if (response.success && response.data?.messages) {
      chatStore.loadMessages(response.data.messages);
    }
  }

  // Fix for Issue #2: Reconnection handler also requests transformed messages
  async function onReconnect() {
    const response = await sendCommand('get_messages', {});
    if (response.success && response.data?.messages) {
      chatStore.loadMessages(response.data.messages);
    }
  }

  async function deleteSession(sessionId: string) {
    if (!confirm('Delete this session?')) return;
    await sessionStore.deleteSession(sessionId);
  }
  ```
  - **Fix for Issue #12:** The `Session` store interface must include `sessionFile` (full JSONL path):
    ```typescript
    export interface Session {
      id: string;
      name: string;
      createdAt: number;
      updatedAt: number;
      model: string;
      messageCount: number;
      sessionFile?: string; // Full JSONL file path — Fix for Issue #12
      stats?: SessionStats;
    }
    ```
  - The `session_info` event relayed from the backend (Task 2.2.5) includes `sessionFile` — this must be stored in the session store and used for `switch_session` commands.

- [ ] **3.5.4** Implement session rename:
  ```typescript
  async function renameSession(sessionId: string, newName: string) {
    await sessionStore.renameSession(sessionId, newName);
    await sendCommand('set_session_name', { name: newName });
  }
  ```

- [ ] **3.5.5** Implement mobile collapse:
  ```typescript
  const sidebarOpen = ref(false);

  function toggleSidebar() {
    sidebarOpen.value = !sidebarOpen.value;
  }
  ```
  - Desktop: sidebar always visible (`md:block`)
  - Mobile: sidebar hidden by default, toggle with hamburger (`hidden md:block`)
  - Overlay backdrop when sidebar is open on mobile

- [ ] **3.5.6** Fetch sessions on mount:
  ```typescript
  onMounted(async () => {
    await sessionStore.fetchSessions();
  });
  ```

- [ ] **3.5.7** Update sidebar on session events:
  ```typescript
  // Listen for session_info_changed to update sidebar
  watch(
    () => chatStore.currentSessionName,
    (name) => {
      if (name && chatStore.currentSessionId) {
        sessionStore.renameSession(chatStore.currentSessionId, name);
      }
    },
  );
  ```
  - **Fix for Issue #14:** The sidebar must use `session.sessionFile` (full path) for session switching, not `session.id`. The `session_info` event (Task 2.2.5) includes `sessionFile` — store this in the session store when the event arrives (see Task 3.3.7 `session_info` case above).

### Additional Info

- **Session naming**: Sessions are auto-named by the pi SDK based on the first user message. The user can override this with `set_session_name`.

- **Session date format**: Use relative time (e.g., "2 hours ago", "Yesterday", "Jun 3, 2026") for better UX.

- **Active session highlight**: Use a distinct background color or border for the active session.

- **Delete confirmation**: Use a native `confirm()` dialog or a custom modal (future enhancement).

- **Session stats in sidebar**: Optionally show token usage or message count per session.

### Acceptance Criteria

- Sessions list loads from REST API
- New session creates a fresh conversation
- Switching sessions loads the correct conversation
- Delete session removes from list and server
- Sidebar collapses on mobile with toggle button
- Active session is highlighted
- Session metadata (name, date, model) is displayed
- Session rename works

---

## Integration Notes

### How This Milestone Connects to Milestones 1 & 2

1. **Task 3.1** creates the Pinia stores that the entire frontend depends on. These stores receive events from the WebSocket service (Task 3.2) and drive the UI components.

2. **Task 3.2** creates the WebSocket client that communicates with the backend from Milestone 2. It authenticates, sends commands, and receives events.

3. **Tasks 3.3–3.5** build the UI components that consume the Pinia stores and interact with the WebSocket service.

### Testing Strategy

- **Visual testing** (design doc §4, Level L3):
  - Messages render with correct alignment (user right, assistant left)
  - Streaming appears in real-time (character-by-character)
  - Markdown renders correctly
  - Code blocks have syntax highlighting
  - Session sidebar loads and switches
  - Streaming indicator reflects state
  - Thinking output is collapsible

- **Interaction testing** (Level L2):
  - Auto-reconnect works (kill backend, restart, verify frontend reconnects)
  - Keyboard shortcuts work (Ctrl+Enter, Escape, Enter, Shift+Enter)
  - Command suggestions appear when typing `/`

- **Responsive testing**:
  - Test on mobile viewport (Chrome DevTools device emulation)
  - Test sidebar collapse/expand on mobile
  - Test message readability on small screens

### Common Pitfalls

- **Auto-scroll during streaming**: Use `requestAnimationFrame` or `nextTick` to ensure the DOM has updated before scrolling. Scrolling during a Vue re-render can cause jitter.

- **WebSocket reconnection**: The frontend must handle the case where the backend restarts while the frontend is connected. The WebSocket `onclose` event should trigger reconnection.

- **Message ordering**: Events arrive in order from the SDK, but the frontend must handle the case where a `message_update` arrives before `message_start` (shouldn't happen, but defensive coding is good).

- **Memory leaks**: Clean up WebSocket connections, intervals, and event listeners on component unmount.

- **Markdown XSS**: Always sanitize HTML output with `DOMPurify`. Never render raw HTML from the agent without sanitization.

- **Tailwind v4 syntax**: Tailwind v4 uses native CSS for configuration. Don't use `tailwind.config.js`. Use `@import "tailwindcss"` in your CSS file.
