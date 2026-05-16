import { defineStore } from "pinia";
import { ref, computed } from "vue";
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
  const wsProtocol = location.protocol === "https:" ? "wss:" : "ws:";
  const wsUrl = import.meta.env.VITE_WS_URL || import.meta.env.VITE_WSS_URL
    || `${wsProtocol}//${location.hostname}:${import.meta.env.VITE_WS_PORT || "3001"}`;

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
    if (ws?.readyState === WebSocket.OPEN) return;

    ws = new WebSocket(wsUrl);

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
      // Auto-reconnect after 2s
      setTimeout(() => {
        if (!wsConnected.value) connect();
      }, 2000);
    };

    ws.onerror = () => {
      wsError.value = "Connection error";
    };
  }

  function send(msg: Record<string, unknown>): void {
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    } else {
      wsError.value = "Not connected to server";
    }
  }

  function handleWsMessage(msg: WsMessage): void {
    switch (msg.type) {
      case "connected": {
        const m = msg as unknown as WsConnected;
        console.log("[ws] Connected");
        break;
      }

      case "message_update": {
        const m = msg as unknown as WsMessageUpdate;
        const delta = m.assistantMessageEvent.delta;
        const eventType = m.assistantMessageEvent.type;

        if (eventType === "text_delta" && delta) {
          // Append to streaming assistant message
          const streamMsg = lastAssistantMessage.value;
          if (streamMsg) {
            streamMsg.content += delta;
          }
        }
        if (eventType === "thinking_delta" && delta) {
          // Append thinking block
          const streamMsg = lastAssistantMessage.value;
          if (streamMsg && streamMsg.content) {
            if (typeof streamMsg.content === "string") {
              streamMsg.content += "\n<details>\n<summary>Thinking</summary>\n\n" + delta;
            }
          }
        }
        if (eventType === "toolcall_delta") {
          // Tool call arguments are streaming - handled via tool_execution_start
        }
        if (eventType === "done" || eventType === "error") {
          const streamMsg = lastAssistantMessage.value;
          if (streamMsg) {
            streamMsg.isStreaming = false;
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
        const m = msg as unknown as WsAgentEnd;
        isStreaming.value = false;
        // Add any new messages from agent_end
        for (const agentMsg of m.messages) {
          if (agentMsg.role === "user" && !messages.value.find((cm) => cm.content === agentMsg.content)) {
            messages.value.push({
              id: crypto.randomUUID(),
              role: "user",
              content: agentMsg.content as string,
              timestamp: agentMsg.timestamp ?? Date.now(),
            });
          }
          if (agentMsg.role === "assistant" && agentMsg.content) {
            const existing = messages.value.find(
              (cm) => cm.role === "assistant" && cm.content === agentMsg.content
            );
            if (!existing) {
              messages.value.push({
                id: crypto.randomUUID(),
                role: "assistant",
                content: agentMsg.content as string,
                timestamp: agentMsg.timestamp ?? Date.now(),
                isStreaming: false,
              });
            }
          }
        }
        break;
      }

      case "tool_execution_start": {
        const m = msg as unknown as WsToolCallStart;
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
        const m = msg as unknown as WsToolCallEnd;
        const streamMsg = lastAssistantMessage.value;
        if (streamMsg?.toolCalls) {
          const tc = streamMsg.toolCalls.find((tc) => tc.id === m.toolCallId);
          if (tc) {
            tc.isComplete = true;
            tc.isError = m.isError;
            if (m.result?.content?.[0]?.text) {
              tc.result = m.result.content[0].text;
            }
          }
        }
        break;
      }

      case "error": {
        const m = msg as unknown as WsError;
        wsError.value = m.message;
        isStreaming.value = false;
        // Mark streaming message as complete with error
        const streamMsg = lastAssistantMessage.value;
        if (streamMsg) streamMsg.isStreaming = false;
        break;
      }

      case "state": {
        const m = msg as unknown as WsState;
        const data = m.data;
        if (data.model) {
          currentModel.value = {
            id: data.model.id,
            name: data.model.name,
            provider: data.model.provider,
          };
        }
        if (data.thinkingLevel) thinkingLevel.value = data.thinkingLevel;
        if (data.sessionId) sessionId.value = data.sessionId;
        if (data.sessionName) sessionName.value = data.sessionName;
        if (data.messageCount !== undefined) messageCount.value = data.messageCount;
        if (data.pendingMessageCount !== undefined) pendingMessageCount.value = data.pendingMessageCount;
        break;
      }

      case "models": {
        const m = msg as unknown as WsModels;
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
        const modelData = m.data as Record<string, unknown> | undefined;
        if (modelData?.model) {
          const model = modelData.model as Record<string, unknown>;
          currentModel.value = {
            id: model.id as string,
            name: model.name as string,
            provider: model.provider as string,
          };
        }
        showModelSelector.value = false;
        break;
      }

      case "thinking_level_changed": {
        const m = msg as unknown as WsThinkingLevelChanged;
        const levelData = m.data as Record<string, unknown> | undefined;
        if (levelData?.level) thinkingLevel.value = levelData.level as string;
        break;
      }

      case "last_assistant_text": {
        const m = msg as unknown as WsLastAssistantText;
        console.log("[ws] Last assistant text:", m.data.text);
        break;
      }

      case "bash_result": {
        const m = msg as unknown as WsBashResult;
        console.log("[ws] Bash result:", m.data);
        break;
      }

      case "session_switched": {
        const m = msg as unknown as WsSessionSwitched;
        if (m.data.cancelled) {
          wsError.value = "Session change was cancelled";
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

      default:
        // console.log("[ws] Unhandled event:", msg.type);
        break;
    }
  }

  async function sendMessage(text: string, images?: unknown[]): Promise<void> {
    if (!text.trim() || isStreaming.value) return;

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
    send({ type: "abort" });
  }

  function setModel(provider: string, modelId: string): void {
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
    send({ type: "new_session" });
    messages.value = [];
    sessionId.value = null;
    sessionName.value = null;
  }

  function compact(customInstructions?: string): void {
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
    send({ type: "fork", entryId });
  }

  function clone(): void {
    send({ type: "clone" });
  }

  function switchSession(sessionPath: string): void {
    send({ type: "switch_session", sessionPath });
  }

  function setSessionName(name: string): void {
    send({ type: "set_session_name", name });
  }

  function getCommands(): void {
    send({ type: "get_commands" });
  }

  function respondToUiRequest(id: string, response: Record<string, unknown>): void {
    // This would need to go back through WebSocket
    send({ type: "extension_ui_response", id, ...response });
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
  };
});
