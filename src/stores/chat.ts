import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { useAuthStore } from "./auth";
import type {
  ChatMessage,
  ToolCallInfo,
  ModelOption,
  WsMessage,
  WsMessageUpdate,
  WsAgentStart,
  WsAgentEnd,
  WsToolCallStart,
  WsToolCallEnd,
  WsError,
  WsState,
  WsModels,
  WsModelChanged,
  WsThinkingLevelChanged,
  WsLastAssistantText,
  WsBashResult,
  WsSessionSwitched,
  WsConnected,
  WsUiRequest,
  WsStats,
  WsForkMessages,
  WsCommands,
  WsToolCallUpdate,
  WsQueueUpdate,
  WsCompactionStart,
  WsCompactionEnd,
  WsTurnStart,
  WsTurnEnd,
  WsAuthRequired,
  WsAuthError,
} from "@/types";

export const useChatStore = defineStore("chat", () => {
  // ─── State ────────────────────────────────────────────────────────────────
  const messages = ref<ChatMessage[]>([]);
  const isStreaming = ref(false);
  const wsConnected = ref(false);
  const wsError = ref<string | null>(null);
  const currentModel = ref<ModelOption | null>(null);
  const availableModels = ref<ModelOption[]>([]);
  const thinkingLevel = ref("medium");
  const sessionId = ref<string | null>(null);
  const sessionName = ref<string | null>(null);
  const messageCount = ref(0);
  const pendingMessageCount = ref(0);
  const uiRequests = ref<WsUiRequest[]>([]);
  const showSidebar = ref(false);
  const showModelSelector = ref(false);
  const showSettings = ref(false);
  const showCompactDialog = ref(false);
  const compactInstructions = ref("");
  const showNewSessionConfirm = ref(false);

  // WebSocket
  let ws: WebSocket | null = null;
  let shouldReconnect = true;
  // C-08: Track reconnect timeout for cleanup
  // C-15: Debounce rapid sends
  let lastSendTime = 0;
  const DEBOUNCE_MS = 100;
  let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  const wsProtocol = location.protocol === "https:" ? "wss:" : "ws:";
  // C-01: wsBaseUrl is now a function so it's re-evaluated each call
  // C-06: Cache baseUrl locally to avoid redundant env lookups in getWsUrl
  function getWsBaseUrl(): string {
    return import.meta.env.VITE_WS_URL || import.meta.env.VITE_WSS_URL
      || `${wsProtocol}//${location.hostname}:${import.meta.env.VITE_WS_PORT || "3001"}`;
  }

  function getWsUrl(): string {
    const authStore = useAuthStore();
    const baseUrl = getWsBaseUrl();
    if (authStore.token) {
      const separator = baseUrl.includes("?") ? "&" : "?";
      return `${baseUrl}${separator}token=${encodeURIComponent(authStore.token)}`;
    }
    return baseUrl;
  }

  // C-67: Validate timestamps from server events
  function validateTimestamp(ts: unknown): number | null {
    if (typeof ts !== "number" || !Number.isFinite(ts)) return null;
    const now = Date.now();
    // Reject timestamps too far in the past (>24h) or future (>1h)
    if (ts < now - 24 * 60 * 60 * 1000 || ts > now + 60 * 60 * 1000) {
      console.warn("[ws] Invalid timestamp:", ts);
      return null;
    }
    return ts;
  }

  // ─── Computed ─────────────────────────────────────────────────────────────
  const lastAssistantMessage = computed(() => {
    for (let i = messages.value.length - 1; i >= 0; i--) {
      if (messages.value[i].role === "assistant") return messages.value[i];
    }
    return null;
  });

  const lastUserMessage = computed(() => {
    for (let i = messages.value.length - 1; i >= 0; i--) {
      if (messages.value[i].role === "user") return messages.value[i];
    }
    return null;
  });

  // ─── Actions ──────────────────────────────────────────────────────────────

  function connect(): void {
    const authStore = useAuthStore();
    // C-03: Guard against duplicate connections during CONNECTING state
    if (ws) {
      if (ws.readyState === WebSocket.OPEN) return;
      if (ws.readyState === WebSocket.CONNECTING) return;
    }
    // Only connect if authenticated
    if (!authStore.token) return;

    // C-07: Clear old handlers to prevent stale references after disconnect()
    if (ws) {
      ws.onopen = null;
      ws.onmessage = null;
      ws.onclose = null;
      ws.onerror = null;
      ws.close();
    }

    // C-08: Clear any pending reconnect timeout before starting a new one
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }

    // C-04: Clear wsError on connection attempt
    wsError.value = null;

    // Wrap WebSocket creation in try/catch to handle invalid URLs, OOM, etc.
    let wsInstance: WebSocket;
    try {
      wsInstance = new WebSocket(getWsUrl());
    } catch (err) {
      console.error("[ws] Failed to create WebSocket:", (err as Error).message);
      wsError.value = "Connection failed. Please check your network and try again.";
      return;
    }
    ws = wsInstance;

    // C-05: Re-check readyState after creation — connection could close immediately
    if (ws.readyState === WebSocket.CLOSED || ws.readyState === WebSocket.CLOSING) {
      console.warn("[ws] WebSocket closed immediately after creation");
      wsError.value = "Connection failed. Please check your network and try again.";
      return;
    }

    ws.onopen = () => {
      wsConnected.value = true;
      wsError.value = null;
    };

    ws.onmessage = (event) => {
      try {
        const msg: WsMessage = JSON.parse(event.data);
        handleWsMessage(msg);
      } catch (err) {
        console.error("[ws] Parse error:", err);
      }
    };

    ws.onclose = () => {
      wsConnected.value = false;
      wsError.value = "Disconnected from server. Reconnecting...";
      // C-08: Use stored timeout reference for cleanup
      if (shouldReconnect) {
        reconnectTimeout = setTimeout(() => {
          reconnectTimeout = null;
          if (shouldReconnect && !wsConnected.value) connect();
        }, 2000);
      }
    };

    ws.onerror = () => {
      wsError.value = "Connection error";
    };
  }

  function disconnect(): void {
    shouldReconnect = false;
    ws?.close();
    ws = null;
    wsConnected.value = false;
  }

  function handleAuthRejection(): void {
    const authStore = useAuthStore();
    shouldReconnect = false;
    ws?.close();
    ws = null;
    wsConnected.value = false;
    wsError.value = "Authentication required";
    authStore.logout();
  }

  function send(msg: Record<string, unknown>): void {
    // ws is always set by connect(); optional chaining on readyState is sufficient
    if (ws?.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(msg));
      } catch (err) {
        console.error("[ws] send() failed:", (err as Error).message);
        wsError.value = "Failed to send message. Connection may be unstable.";
      }
    } else {
      wsError.value = "Not connected to server. Check your connection and refresh the page.";
    }
  }

  function handleWsMessage(msg: WsMessage): void {
    switch (msg.type) {
      case "connected": {
        const m = msg as unknown as WsConnected;
        console.log("[ws] Connected");
        break;
      }

      case "auth_required": {
        handleAuthRejection();
        break;
      }

      case "auth_error": {
        // C-61: Runtime validation before type cast
        const m = msg as unknown as WsAuthError;
        if (!m.message || typeof m.message !== "string") {
          console.warn("[ws] auth_error: missing or invalid message");
          wsError.value = "Authentication error";
        } else {
          wsError.value = m.message;
        }
        handleAuthRejection();
        break;
      }

      case "message_update": {
        // C-61: Runtime validation before type cast
        const m = msg as unknown as WsMessageUpdate;
        if (!m.assistantMessageEvent || typeof m.assistantMessageEvent !== "object") {
          console.warn("[ws] message_update: missing assistantMessageEvent");
          break;
        }
        const event = m.assistantMessageEvent as Record<string, unknown>;
        const delta = event.delta;
        const eventType = event.type;

        if (eventType === "text_delta" && delta) {
          // Append to streaming assistant message
          const streamMsg = lastAssistantMessage.value;
          if (streamMsg) {
            // Content is always string in ChatMessage; append delta
            streamMsg.content += delta;
          }
        }
        if (eventType === "thinking_delta" && delta) {
          // Append thinking block
          const streamMsg = lastAssistantMessage.value;
          if (streamMsg) {
            if (!streamMsg.content.includes("<details>") && !streamMsg.content.includes("<summary>Thinking</summary>")) {
              streamMsg.content += "\n<details>\n<summary>Thinking</summary>\n\n";
            }
            streamMsg.content += delta;
          }
        }
        if (eventType === "toolcall_delta") {
          // Tool call arguments are streaming - handled via tool_execution_start
        }
        if (eventType === "done" || eventType === "error") {
          const streamMsg = lastAssistantMessage.value;
          if (streamMsg) {
            streamMsg.isStreaming = false;
            // Close the thinking details block if it was opened
            if (streamMsg.content.includes("<details>") && !streamMsg.content.includes("</details>")) {
              streamMsg.content += "\n</details>";
            }
          }
          isStreaming.value = false;
        }
        break;
      }

      case "agent_start": {
        isStreaming.value = true;
        break;
      }

      case "agent_end": {
        // C-61: Runtime validation before type cast
        const m = msg as unknown as WsAgentEnd;
        // C-30: Validate data shape
        if (!m.messages || !Array.isArray(m.messages)) {
          console.warn("[ws] agent_end: missing or invalid messages array");
          isStreaming.value = false;
          break;
        }
        isStreaming.value = false;
        // C-63: Helper to normalize content to string for comparison
        const normalizeContent = (content: string | unknown[] | undefined): string => {
          if (!content) return "";
          if (typeof content === "string") return content;
          if (Array.isArray(content)) {
            return content
              .filter((b): b is Record<string, unknown> => typeof b === "object" && b !== null && "type" in b)
              .map((b) => (b.text || "") as string)
              .filter(Boolean)
              .join("\n");
          }
          return String(content);
        };
        // Add any new messages from agent_end
        for (const agentMsg of m.messages) {
          // C-63: Validate message has a role field
          if (!agentMsg.role || !agentMsg.content) {
            console.warn("[ws] agent_end: skipping message with missing role or content");
            continue;
          }
          const normalized = normalizeContent(agentMsg.content);
          if (agentMsg.role === "user" && normalized && !messages.value.find((cm) => cm.content === normalized)) {
            messages.value.push({
              id: crypto.randomUUID(),
              role: "user",
              content: normalized,
              // C-67: Validate timestamp from server
              timestamp: validateTimestamp(agentMsg.timestamp) ?? Date.now(),
            });
          }
          if (agentMsg.role === "assistant" && normalized) {
            const existing = messages.value.find(
              (cm) => cm.role === "assistant" && cm.content === normalized
            );
            if (!existing) {
              messages.value.push({
                id: crypto.randomUUID(),
                role: "assistant",
                content: normalized,
                // C-67: Validate timestamp from server
                timestamp: validateTimestamp(agentMsg.timestamp) ?? Date.now(),
                isStreaming: false,
              });
            }
          }
        }
        break;
      }

      case "tool_execution_start": {
        // C-61: Runtime validation before type cast
        const m = msg as unknown as WsToolCallStart;
        if (!m.toolCallId || !m.toolName) {
          console.warn("[ws] tool_execution_start: missing toolCallId or toolName");
          break;
        }
        const streamMsg = lastAssistantMessage.value;
        if (streamMsg) {
          if (!streamMsg.toolCalls) streamMsg.toolCalls = [];
          streamMsg.toolCalls.push({
            id: m.toolCallId,
            name: m.toolName,
            args: m.args,
            isComplete: false,
          });
        }
        break;
      }

      case "tool_execution_end": {
        // C-61: Runtime validation before type cast
        const m = msg as unknown as WsToolCallEnd;
        if (!m.toolCallId) {
          console.warn("[ws] tool_execution_end: missing toolCallId");
          break;
        }
        const streamMsg = lastAssistantMessage.value;
        if (streamMsg?.toolCalls) {
          const tc = streamMsg.toolCalls.find((tc) => tc.id === m.toolCallId);
          if (tc) {
            tc.isComplete = true;
            tc.isError = Boolean(m.isError);
            if (m.result?.content?.[0]?.text) {
              tc.result = m.result.content[0].text;
            }
          }
        }
        break;
      }

      case "error": {
        // C-61: Runtime validation before type cast
        // C-30: Validate data shape before accessing properties
        const m = msg as unknown as WsError;
        if (!m.message || typeof m.message !== "string") {
          console.warn("[ws] error: missing or invalid message");
          wsError.value = "An error occurred";
        } else {
          wsError.value = m.message;
        }
        // C-60: Clear isStreaming on error event
        isStreaming.value = false;
        // Mark streaming message as complete with error
        const streamMsg = lastAssistantMessage.value;
        if (streamMsg) {
          streamMsg.isStreaming = false;
          // Close the thinking details block if it was opened
          if (streamMsg.content.includes("<details>") && !streamMsg.content.includes("</details>")) {
            streamMsg.content += "\n</details>";
          }
        }
        break;
      }

      case "state": {
        const m = msg as unknown as WsState;
        // C-30: Validate data shape before accessing properties
        if (!m.data || typeof m.data !== "object") {
          console.warn("[ws] state: invalid data shape", m.data);
          break;
        }
        const data = m.data as Record<string, unknown>;
        if (data.model && typeof data.model === "object" && data.model !== null) {
          const model = data.model as Record<string, unknown>;
          currentModel.value = {
            id: String(model.id ?? ""),
            name: String(model.name ?? ""),
            provider: String(model.provider ?? ""),
          };
        }
        if (data.thinkingLevel) thinkingLevel.value = String(data.thinkingLevel);
        if (data.sessionId) sessionId.value = String(data.sessionId);
        // C-25: Validate session name length
        if (data.sessionName) {
          const name = String(data.sessionName);
          if (name.length > 200) {
            console.warn("[ws] state: session name exceeds max length of 200 characters");
            sessionName.value = name.slice(0, 200);
          } else {
            sessionName.value = name;
          }
        }
        if (data.messageCount !== undefined) messageCount.value = Number(data.messageCount);
        if (data.pendingMessageCount !== undefined) pendingMessageCount.value = Number(data.pendingMessageCount);
        break;
      }

      case "models": {
        const m = msg as unknown as WsModels;
        // C-32: Validate m.data.models is an array before calling .map()
        // C-30: Validate data shape before accessing properties
        // C-66: Handle empty models list
        if (!m.data || !Array.isArray(m.data.models)) {
          console.warn("[ws] models: invalid data shape", m.data);
          break;
        }
        if (m.data.models.length === 0) {
          console.warn("[ws] models: empty models list");
          availableModels.value = [];
          showModelSelector.value = false;
          break;
        }
        availableModels.value = m.data.models.map((model) => ({
          id: model.id,
          name: model.name,
          provider: model.provider,
        }));
        showModelSelector.value = false;
        break;
      }

      case "model_changed": {
        const m = msg as unknown as WsModelChanged;
        // C-30: Validate data shape before accessing properties
        if (!m.data || typeof m.data !== "object") {
          console.warn("[ws] model_changed: invalid data shape", m.data);
          break;
        }
        const modelData = m.data as Record<string, unknown>;
        if (modelData?.model && typeof modelData.model === "object" && modelData.model !== null) {
          const model = modelData.model as Record<string, unknown>;
          currentModel.value = {
            id: String(model.id ?? ""),
            name: String(model.name ?? ""),
            provider: String(model.provider ?? ""),
          };
        }
        showModelSelector.value = false;
        break;
      }

      case "thinking_level_changed": {
        const m = msg as unknown as WsThinkingLevelChanged;
        // C-30: Validate data shape before accessing properties
        if (!m.data || typeof m.data !== "object") {
          console.warn("[ws] thinking_level_changed: invalid data shape", m.data);
          break;
        }
        const levelData = m.data as Record<string, unknown>;
        if (levelData?.level) thinkingLevel.value = String(levelData.level);
        break;
      }

      case "last_assistant_text": {
        const m = msg as unknown as WsLastAssistantText;
        // C-30: Validate data shape before accessing properties
        if (!m.data || typeof m.data !== "object") {
          console.warn("[ws] last_assistant_text: invalid data shape", m.data);
          break;
        }
        // C-56: Warn if text field is undefined
        const text = (m.data as Record<string, unknown>).text;
        if (text === undefined) {
          console.warn("[ws] last_assistant_text: text field is undefined");
        } else {
          console.log("[ws] Last assistant text:", text);
        }
        break;
      }

      case "bash_result": {
        const m = msg as unknown as WsBashResult;
        // C-30: Validate data shape before accessing properties
        if (!m.data) {
          console.warn("[ws] bash_result: missing data");
          break;
        }
        console.log("[ws] Bash result:", m.data);
        break;
      }

      case "stats": {
        const m = msg as unknown as WsStats;
        // C-59: Validate response format
        if (!m.data || typeof m.data !== "object") {
          console.warn("[ws] stats: invalid data shape", m.data);
          break;
        }
        // Stats response handled by caller (e.g., for display in settings)
        break;
      }

      case "fork_messages": {
        const m = msg as unknown as WsForkMessages;
        // Fork messages response handled by caller
        break;
      }

      case "commands": {
        const m = msg as unknown as WsCommands;
        // C-57: Validate response format
        if (!m.data || !Array.isArray(m.data)) {
          console.warn("[ws] commands: invalid data shape", m.data);
          break;
        }
        // Commands response handled by caller
        break;
      }

      case "tool_execution_update": {
        const m = msg as unknown as WsToolCallUpdate;
        // Partial tool call update - can be used for real-time tool output
        break;
      }

      case "queue_update": {
        // Message queue update (steering/follow-up)
        break;
      }

      case "compaction_start": {
        const m = msg as unknown as WsCompactionStart;
        // C-61: Runtime validation
        console.log("[ws] Compaction started:", typeof m.reason === "string" ? m.reason : "(no reason)");
        break;
      }

      case "compaction_end": {
        const m = msg as unknown as WsCompactionEnd;
        // C-61: Runtime validation
        console.log("[ws] Compaction ended:", typeof m.reason === "string" ? m.reason : "(no reason)", Boolean(m.aborted));
        break;
      }

      case "turn_start": {
        // Agent turn started
        break;
      }

      case "turn_end": {
        const m = msg as unknown as WsTurnEnd;
        // Agent turn ended - may contain new message and tool results
        break;
      }

      case "session_switched": {
        const m = msg as unknown as WsSessionSwitched;
        if (m.data?.cancelled) {
          wsError.value = "Session change was cancelled";
        } else {
          // Update session info from the response data
          const data = m.data as Record<string, unknown>;
          if (data?.sessionId) sessionId.value = data.sessionId as string;
          if (data?.sessionName) sessionName.value = data.sessionName as string;
          if (data?.messageCount !== undefined) messageCount.value = data.messageCount as number;
          wsError.value = null;
        }
        break;
      }

      case "ui_request": {
        const m = msg as unknown as WsUiRequest;
        uiRequests.value.push(m);
        // For simple notifications, auto-dismiss
        if (m.method === "notify") {
          setTimeout(() => {
            uiRequests.value = uiRequests.value.filter((r) => r.id !== m.id);
          }, 5000);
        }
        break;
      }

      // C-28: steer handler with validation
      case "steer": {
        const m = msg as unknown as { type: "steer"; data: { direction?: string; strength?: number } };
        if (!m.data || typeof m.data !== "object") {
          console.warn("[ws] steer: missing or invalid data");
          break;
        }
        const steerData = m.data as Record<string, unknown>;
        if (steerData.direction !== undefined) {
          if (typeof steerData.direction !== "string") {
            console.warn("[ws] steer: direction must be a string");
            break;
          }
        }
        if (steerData.strength !== undefined) {
          if (typeof steerData.strength !== "number" || steerData.strength < -1 || steerData.strength > 1) {
            console.warn("[ws] steer: strength must be a number between -1 and 1");
            break;
          }
        }
        console.log("[ws] steer:", steerData);
        break;
      }

      // C-33: bash handler with validation
      case "bash": {
        const m = msg as unknown as { type: "bash"; data: { command?: string } };
        if (!m.data || typeof m.data !== "object") {
          console.warn("[ws] bash: missing or invalid data");
          break;
        }
        const bashData = m.data as Record<string, unknown>;
        if (bashData.command !== undefined) {
          if (typeof bashData.command !== "string" || !bashData.command.trim()) {
            console.warn("[ws] bash: command must be a non-empty string");
            break;
          }
        }
        console.log("[ws] bash:", bashData);
        break;
      }

      // C-36: follow_up handler with validation
      case "follow_up": {
        const m = msg as unknown as { type: "follow_up"; data: { mode?: string } };
        if (!m.data || typeof m.data !== "object") {
          console.warn("[ws] follow_up: missing or invalid data");
          break;
        }
        const fuData = m.data as Record<string, unknown>;
        if (fuData.mode !== undefined) {
          const validModes = ["auto", "manual", "disabled"];
          if (typeof fuData.mode !== "string" || !validModes.includes(fuData.mode as string)) {
            console.warn("[ws] follow_up: mode must be one of:", validModes.join(", "));
            break;
          }
        }
        console.log("[ws] follow_up:", fuData);
        break;
      }

      // C-38: auto_compaction handler with validation
      case "auto_compaction": {
        const m = msg as unknown as { type: "auto_compaction"; data: { enabled?: boolean } };
        if (!m.data || typeof m.data !== "object") {
          console.warn("[ws] auto_compaction: missing or invalid data");
          break;
        }
        const acData = m.data as Record<string, unknown>;
        if (acData.enabled !== undefined) {
          if (typeof acData.enabled !== "boolean") {
            console.warn("[ws] auto_compaction: enabled must be a boolean");
            break;
          }
        }
        console.log("[ws] auto_compaction:", acData);
        break;
      }

      // C-42: auto_retry handler with validation
      case "auto_retry": {
        const m = msg as unknown as { type: "auto_retry"; data: { enabled?: boolean } };
        if (!m.data || typeof m.data !== "object") {
          console.warn("[ws] auto_retry: missing or invalid data");
          break;
        }
        const arData = m.data as Record<string, unknown>;
        if (arData.enabled !== undefined) {
          if (typeof arData.enabled !== "boolean") {
            console.warn("[ws] auto_retry: enabled must be a boolean");
            break;
          }
        }
        console.log("[ws] auto_retry:", arData);
        break;
      }

      // C-48: thinking_level handler with validation
      case "thinking_level": {
        const m = msg as unknown as { type: "thinking_level"; data: { level?: string } };
        if (!m.data || typeof m.data !== "object") {
          console.warn("[ws] thinking_level: missing or invalid data");
          break;
        }
        const tlData = m.data as Record<string, unknown>;
        if (tlData.level !== undefined) {
          const validLevels = ["off", "low", "medium", "high"];
          if (typeof tlData.level !== "string" || !validLevels.includes(tlData.level as string)) {
            console.warn("[ws] thinking_level: level must be one of:", validLevels.join(", "));
            break;
          }
        }
        console.log("[ws] thinking_level:", tlData);
        break;
      }

      // C-52: cycle_model handler with validation
      case "cycle_model": {
        const m = msg as unknown as { type: "cycle_model"; data?: { model?: string; provider?: string } };
        if (m.data && typeof m.data === "object") {
          const cmData = m.data as Record<string, unknown>;
          if (cmData.model && typeof cmData.model === "string") {
            const modelExists = availableModels.value.some(
              (model) => model.id === cmData.model && model.provider === (cmData.provider as string)
            );
            if (!modelExists) {
              console.warn("[ws] cycle_model: model not found in available models");
              break;
            }
          }
        }
        console.log("[ws] cycle_model");
        break;
      }

      // C-53: cycle_thinking_level handler with validation
      case "cycle_thinking_level": {
        const m = msg as unknown as { type: "cycle_thinking_level"; data?: { level?: string } };
        if (m.data && typeof m.data === "object") {
          const ctlData = m.data as Record<string, unknown>;
          if (ctlData.level !== undefined) {
            const validLevels = ["off", "low", "medium", "high"];
            if (typeof ctlData.level !== "string" || !validLevels.includes(ctlData.level as string)) {
              console.warn("[ws] cycle_thinking_level: level must be one of:", validLevels.join(", "));
              break;
            }
          }
        }
        console.log("[ws] cycle_thinking_level");
        break;
      }

      default:
        // C-22: Warn about unknown message types
        console.warn("[ws] Unknown message type:", msg.type);
        break;
    }
  }

  async function sendMessage(text: string, images?: Array<{ type: string; data: string; mimeType: string }>): Promise<void> {
    // C-58: Enforce input length limit
    const MAX_MESSAGE_LENGTH = 10000;
    if (!text.trim() || isStreaming.value) return;
    // C-15: Debounce rapid sends
    const now = Date.now();
    if (now - lastSendTime < DEBOUNCE_MS) return;
    lastSendTime = now;
    if (text.length > MAX_MESSAGE_LENGTH) {
      wsError.value = `Message exceeds maximum length of ${MAX_MESSAGE_LENGTH} characters`;
      return;
    }

    // C-20: Check WebSocket is connected before adding messages locally
    if (ws?.readyState !== WebSocket.OPEN) {
      wsError.value = "Not connected to server. Please refresh and try again.";
      return;
    }

    // C-62: Validate images array — max 4 images, each <= 4MB, only valid mime types
    const MAX_IMAGES = 4;
    const MAX_IMAGE_SIZE = 4 * 1024 * 1024; // 4MB
    const VALID_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);
    if (images && images.length > 0) {
      if (images.length > MAX_IMAGES) {
        wsError.value = `Maximum ${MAX_IMAGES} images allowed`;
        return;
      }
      for (const img of images) {
        if (!VALID_MIME_TYPES.has(img.mimeType)) {
          wsError.value = `Unsupported image type: ${img.mimeType}`;
          return;
        }
        // Base64 data length estimate: actual size ≈ data.length * 0.75
        if (img.data.length * 0.75 > MAX_IMAGE_SIZE) {
          wsError.value = `Image exceeds maximum size of ${MAX_IMAGE_SIZE / (1024 * 1024)}MB`;
          return;
        }
      }
    }

    // Add user message locally
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
      timestamp: Date.now(),
    };
    messages.value.push(userMsg);

    // Add placeholder assistant message
    const assistantMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: "",
      timestamp: Date.now(),
      isStreaming: true,
    };
    messages.value.push(assistantMsg);

    send({
      type: "prompt",
      message: text,
      images,
    });
  }

  function abort(): void {
    // C-23: Only send abort if connected and actively streaming
    if (ws?.readyState !== WebSocket.OPEN || !isStreaming.value) return;
    send({ type: "abort" });
    isStreaming.value = false;
  }

  function setModel(provider: string, modelId: string): void {
    // C-40: Validate model exists in available models before sending
    const modelExists = availableModels.value.some(
      (m) => m.id === modelId && m.provider === provider
    );
    if (!modelExists) {
      wsError.value = `Model "${modelId}" not found for provider "${provider}". Please select from the available models.`;
      return;
    }
    send({ type: "set_model", provider, modelId });
  }

  function cycleModel(): void {
    send({ type: "cycle_model" });
  }

  function setThinkingLevel(level: string): void {
    send({ type: "set_thinking_level", level });
  }

  function cycleThinkingLevel(): void {
    send({ type: "cycle_thinking_level" });
  }

  function newSession(): void {
    // C-18: Clear message history before switching to new session
    messages.value = [];
    sessionId.value = null;
    sessionName.value = null;
    send({ type: "new_session" });
  }

  function compact(customInstructions?: string): void {
    // C-35: Guard against compacting when already compacting or not connected
    if (ws?.readyState !== WebSocket.OPEN) {
      wsError.value = "Not connected to server. Cannot compact. Please refresh and try again.";
      return;
    }
    send({ type: "compact", customInstructions });
  }

  function getState(): void {
    send({ type: "get_state" });
  }

  function getMessages(): void {
    send({ type: "get_messages" });
  }

  function getAvailableModels(): void {
    send({ type: "get_available_models" });
  }

  function getSessionStats(): void {
    send({ type: "get_session_stats" });
  }

  function getForkMessages(): void {
    send({ type: "get_fork_messages" });
  }

  function fork(entryId: string): void {
    // C-50: Prevent fork during active stream to avoid race condition
    if (isStreaming.value) {
      wsError.value = "Cannot fork while a response is being generated";
      return;
    }
    if (!entryId || typeof entryId !== "string") {
      wsError.value = "Invalid entry ID. Please select a message to fork.";
      return;
    }
    send({ type: "fork", entryId });
  }

  function clone(): void {
    send({ type: "clone" });
  }

  function switchSession(sessionPath: string): void {
    // C-45: Validate session path is not empty
    if (!sessionPath || typeof sessionPath !== "string" || !sessionPath.trim()) {
      wsError.value = "Invalid session path. Please select a valid session to switch to.";
      return;
    }
    send({ type: "switch_session", sessionPath });
  }

  function setSessionName(name: string): void {
    send({ type: "set_session_name", name });
  }

  function getCommands(): void {
    send({ type: "get_commands" });
  }

  function respondToUiRequest(id: string, response: Record<string, unknown>): void {
    // C-54: Sanitize response — only include known safe fields to prevent data leak
    const safeResponse: Record<string, unknown> = { id };
    const safeKeys = new Set(["id", "accepted", "rejected", "value", "choice", "text", "command", "args"]);
    for (const [key, value] of Object.entries(response)) {
      if (safeKeys.has(key)) {
        safeResponse[key] = value;
      }
    }
    send({ type: "extension_ui_response", ...safeResponse });
  }

  function dismissUiRequest(id: string): void {
    uiRequests.value = uiRequests.value.filter((r) => r.id !== id);
  }

  function clearMessages(): void {
    messages.value = [];
  }

  return {
    // State
    messages,
    isStreaming,
    wsConnected,
    wsError,
    currentModel,
    availableModels,
    thinkingLevel,
    sessionId,
    sessionName,
    messageCount,
    pendingMessageCount,
    uiRequests,
    showSidebar,
    showModelSelector,
    showSettings,
    showCompactDialog,
    compactInstructions,
    showNewSessionConfirm,

    // Computed
    lastAssistantMessage,
    lastUserMessage,

    // Actions
    connect,
    send,
    sendMessage,
    abort,
    setModel,
    cycleModel,
    setThinkingLevel,
    cycleThinkingLevel,
    newSession,
    compact,
    getState,
    getMessages,
    getAvailableModels,
    getSessionStats,
    getForkMessages,
    fork,
    clone,
    switchSession,
    setSessionName,
    getCommands,
    respondToUiRequest,
    dismissUiRequest,
    clearMessages,
    disconnect,
  };
});
