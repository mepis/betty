import { ref, readonly } from "vue";
import { marked } from "marked";

// ---------------------------------------------------------------------------
// Shared state
// ---------------------------------------------------------------------------
let ws = null;
const status = ref("disconnected");
const messages = ref([]);
const isIdle = ref(true);
const currentSession = ref(null);
const queueLength = ref(0);
const error = ref(null);

// Track the "current" streaming message
let currentMessageId = null;
let currentToolId = null;
let currentToolName = "";
let currentToolStatus = "";

// ---------------------------------------------------------------------------
// Connect
// ---------------------------------------------------------------------------
export function useRpc() {
  const connect = () => {
    if (ws && ws.readyState <= 1) return;

    const proto = location.protocol === "https:" ? "wss:" : "ws:";
    const url = `${proto}//${location.host}`;

    ws = new WebSocket(url);

    ws.onopen = () => {
      status.value = "connected";
      error.value = null;
    };

    ws.onclose = () => {
      status.value = "disconnected";
      error.value = "Connection lost";
      // Auto-reconnect with exponential backoff (1s, 2s, 4s, 8s, 16s, max 30s)
      scheduleReconnect();
    };

    ws.onerror = () => {
      status.value = "error";
      error.value = "WebSocket error";
    };

    ws.onmessage = (event) => {
      try {
        handleMessage(JSON.parse(event.data));
      } catch (e) {
        console.error("Failed to parse RPC message:", e);
      }
    };
  };

  // Reconnection tracking
  let reconnectTimeout = null;
  let reconnectAttempts = 0;

  function scheduleReconnect() {
    if (reconnectTimeout) clearTimeout(reconnectTimeout);
    reconnectTimeout = setTimeout(() => {
      // Exponential backoff: 1s, 2s, 4s, 8s, 16s, max 30s
      const delay = Math.min(Math.pow(2, reconnectAttempts) * 1000, 30000);
      reconnectAttempts++;
      status.value = `Reconnecting${reconnectAttempts > 1 ? ` (attempt ${reconnectAttempts})` : ""}...`;
      if (!ws || ws.readyState !== 1) {
        connect();
      }
    }, delay);
  }

  const disconnect = () => {
    if (reconnectTimeout) clearTimeout(reconnectTimeout);
    reconnectAttempts = 0;
    if (ws) {
      ws.close();
      ws = null;
    }
  };

  // Send commands to pi RPC
  const send = (obj) => {
    if (ws && ws.readyState === 1) {
      ws.send(JSON.stringify(obj));
    }
  };

  const prompt = (message, images) => {
    send({ type: "prompt", message, images });
  };

  const steer = (message) => {
    send({ type: "steer", message });
  };

  const followUp = (message) => {
    send({ type: "follow_up", message });
  };

  const abort = () => {
    send({ type: "abort" });
  };

  const runBash = (command) => {
    send({ type: "bash", command });
  };

  const getState = () => {
    send({ type: "get_state" });
  };

  const setModel = (model) => {
    send({ type: "set_model", model });
  };

  const cycleModel = (direction = "next") => {
    send({ type: "cycle_model", direction });
  };

  const compact = () => {
    send({ type: "compact" });
  };

  const newSession = () => {
    send({ type: "new_session" });
  };

  const switchSession = (id) => {
    send({ type: "switch_session", id });
  };

  // ---------------------------------------------------------------------------
  // Process incoming RPC events
  // ---------------------------------------------------------------------------
  function extractContentText(content) {
    if (typeof content === "string") {
      return content;
    }
    if (Array.isArray(content)) {
      return content
        .map((item) => {
          if (item.type === "text") return item.text;
          if (item.type === "thinking") return item.thinking;
          if (item.type === "tool_call")
            return `${item.name}(${JSON.stringify(item.arguments)})`;
          return String(item);
        })
        .join("");
    }
    return String(content);
  }

  function handleMessage(json) {
    const { type } = json;

    switch (type) {
      case "agent_start":
        isIdle.value = false;
        currentToolId = null;
        currentToolName = "";
        currentToolStatus = "";
        break;

      case "agent_end":
        isIdle.value = true;
        currentMessageId = null;
        currentToolId = null;
        currentToolName = "";
        currentToolStatus = "";
        break;

      case "message_update":
        // Streaming message content
        if (json.message) {
          const messageContent = extractContentText(json.message.content);
          if (currentMessageId && currentMessageId !== json.message.id) {
            // New message started – reset to trigger creation below
            currentMessageId = null;
          }
          if (!currentMessageId) {
            currentMessageId = json.message.id;
            // Create or find the message (use actual role from backend)
            const existing = messages.value.find(
              (m) => m.id === json.message.id
            );
            if (existing) {
              existing.content = messageContent;
            } else {
              messages.value.push({
                id: json.message.id,
                role: json.message.role || "assistant",
                content: messageContent,
                timestamp: Date.now(),
              });
            }
          } else {
            // Update existing streaming message
            const msg = messages.value.find((m) => m.id === currentMessageId);
            if (msg) {
              msg.content = messageContent;
            }
          }
          scrollToBottom();
        }
        break;

      case "message_create":
        // New message created (e.g. assistant response)
        if (json.message) {
          const messageContent = extractContentText(json.message.content);
          if (currentMessageId && currentMessageId !== json.message.id) {
            currentMessageId = null;
          }
          if (!currentMessageId) {
            currentMessageId = json.message.id;
            const existing = messages.value.find(
              (m) => m.id === json.message.id
            );
            if (existing) {
              existing.content = messageContent;
            } else {
              messages.value.push({
                id: json.message.id,
                role: json.message.role || "assistant",
                content: messageContent,
                timestamp: Date.now(),
              });
            }
          }
        }
        break;

      case "tool_execution_start":
        currentToolId = json.id;
        currentToolName = json.name || "tool";
        currentToolStatus = "running";
        // Add a tool status message
        const toolStart = messages.value.find(
          (m) => m.toolId === json.id && m.role === "tool_status"
        );
        if (!toolStart) {
          messages.value.push({
            id: `tool-start-${json.id}`,
            role: "tool_status",
            toolId: json.id,
            toolName: currentToolName,
            toolStatus: "running",
            content: `⏳ Running: ${currentToolName}`,
            timestamp: Date.now(),
          });
        }
        scrollToBottom();
        break;

      case "tool_execution_update":
        if (currentToolId) {
          const toolMsg = messages.value.find(
            (m) => m.toolId === currentToolId && m.role === "tool_status"
          );
          if (toolMsg) {
            toolMsg.content = `⏳ ${currentToolName}: ${json.output || "..."}`;
          }
        }
        break;

      case "tool_execution_end":
        if (currentToolId) {
          const toolMsg = messages.value.find(
            (m) => m.toolId === currentToolId && m.role === "tool_status"
          );
          if (toolMsg) {
            toolMsg.toolStatus = json.success ? "success" : "error";
            toolMsg.content = `${json.success ? "✅" : "❌"} ${currentToolName}${
              json.output ? `: ${json.output}` : ""
            }`.slice(0, 200);
          }
          currentToolId = null;
          currentToolName = "";
          currentToolStatus = "";
        }
        scrollToBottom();
        break;

      case "user_message":
        // Echo of user message
        messages.value.push({
          id: json.id || `user-${Date.now()}`,
          role: "user",
          content: json.message,
          timestamp: Date.now(),
        });
        scrollToBottom();
        break;

      case "compaction_start":
        isIdle.value = false;
        messages.value.push({
          id: `compact-start-${Date.now()}`,
          role: "system",
          content: "🔄 Compacting conversation...",
          timestamp: Date.now(),
        });
        scrollToBottom();
        break;

      case "compaction_end":
        isIdle.value = true;
        messages.value.push({
          id: `compact-end-${Date.now()}`,
          role: "system",
          content: `✅ Compaction complete. ${json.tokens_saved || 0} tokens saved.`,
          timestamp: Date.now(),
        });
        scrollToBottom();
        break;

      case "session_start":
        currentSession.value = json;
        break;

      case "session_end":
        currentSession.value = null;
        break;

      case "queue_update":
        queueLength.value = json.queue_length ?? 0;
        break;

      case "state":
        currentSession.value = json.session || null;
        // Restore messages from state if available
        if (json.messages && json.messages.length > 0) {
          messages.value = json.messages.map((m) => ({
            id: m.id || `history-${Date.now()}-${Math.random()}`,
            role: m.role || "assistant",
            content: m.content || "",
            timestamp: m.timestamp || Date.now(),
          }));
        }
        break;

      case "error":
        error.value = json.error || "Unknown error";
        break;

      case "messages":
        // get_messages response
        if (json.messages) {
          messages.value = json.messages.map((m) => ({
            id: m.id || `msg-${Date.now()}-${Math.random()}`,
            role: m.role || "assistant",
            content: m.content || "",
            timestamp: m.timestamp || Date.now(),
          }));
        }
        break;

      default:
        // Unknown event – log it
        console.debug("[rpc] unknown event:", type, json);
    }
  }

  let scrollRAF = null;
  function scrollToBottom() {
    // Debounce scroll via requestAnimationFrame
    if (scrollRAF) return;
    scrollRAF = requestAnimationFrame(() => {
      scrollRAF = null;
      window.dispatchEvent(new CustomEvent("scroll-to-bottom"));
    });
  }

  const clearMessages = () => {
    messages.value = [];
    currentMessageId = null;
  };

  return {
    status: readonly(status),
    messages: readonly(messages),
    isIdle: readonly(isIdle),
    currentSession: readonly(currentSession),
    queueLength: readonly(queueLength),
    error: readonly(error),
    connect,
    disconnect,
    prompt,
    steer,
    followUp,
    abort,
    runBash,
    getState,
    setModel,
    cycleModel,
    compact,
    newSession,
    switchSession,
    clearMessages,
  };
}

// ---------------------------------------------------------------------------
// Markdown helper
// ---------------------------------------------------------------------------
export function renderMarkdown(text) {
  if (!text) return "";
  try {
    return marked.parse(text);
  } catch {
    return `<pre class="whitespace-pre-wrap">${escapeHtml(text)}</pre>`;
  }
}

function escapeHtml(str) {
  if (typeof str !== "string") str = String(str);
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
