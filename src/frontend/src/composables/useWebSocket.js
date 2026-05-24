import { ref, readonly, onUnmounted } from "vue";

/**
 * Composable for managing WebSocket connection to the Pi backend.
 *
 * Events received:
 * - message: { role: "user"|"assistant", content: string }
 * - stream: { content: string } — streaming text chunk
 * - status: { status: "starting"|"ready"|"error" }
 * - error: { message: string }
 * - session-started: { sessionId: string }
 * - tool-call: { toolName, toolCallId }
 * - tool-result: { toolName, toolCallId, result, isError }
 * - auth-ok: { user: { id, username, role } }
 */
export function useWebSocket(url = null, authToken = null) {
  const backendUrl = url || import.meta.env.VITE_BACKEND_URL || (import.meta.env.DEV ? "ws://localhost:3001/ws" : `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/ws`);

  const ws = ref(null);
  const isConnected = ref(false);
  const isConnecting = ref(false);
  const lastError = ref(null);
  const sessionId = ref(null);
  const wsUser = ref(null);

  let reconnectAttempts = 0;
  const maxReconnectAttempts = 5;
  let reconnectTimer = null;
  let currentStreamContent = "";

  /**
   * Build WebSocket URL with auth token if available
   */
  function buildUrl() {
    let base = backendUrl;
    const token = authToken || (typeof authToken === "function" ? authToken() : null);
    if (token) {
      const sep = base.includes("?") ? "&" : "?";
      base = `${base}${sep}token=${token}`;
    }
    return base;
  }

  /**
   * Connect to the WebSocket server
   */
  function connect() {
    disconnect();
    isConnecting.value = true;
    lastError.value = null;

    try {
      const url = buildUrl();
      ws.value = new WebSocket(url);

      ws.value.onopen = () => {
        isConnected.value = true;
        isConnecting.value = false;
        reconnectAttempts = 0;
      };

      ws.value.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          emitEvent(data.type, data);
        } catch {
          // Ignore non-JSON messages
        }
      };

      ws.value.onclose = (event) => {
        isConnected.value = false;
        isConnecting.value = false;
        sessionId.value = null;
        currentStreamContent = "";

        // Try to reconnect if not explicitly disconnected
        if (!event.wasClean && reconnectAttempts < maxReconnectAttempts) {
          reconnectAttempts++;
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 10000);
          reconnectTimer = setTimeout(connect, delay);
        }
      };

      ws.value.onerror = () => {
        isConnected.value = false;
        isConnecting.value = false;
        lastError.value = "Connection failed. Check that the backend is running.";
      };
    } catch (err) {
      isConnecting.value = false;
      lastError.value = err.message;
    }
  }

  /**
   * Disconnect from the WebSocket server
   */
  function disconnect() {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    if (ws.value) {
      ws.value.close();
      ws.value = null;
    }
    isConnected.value = false;
    isConnecting.value = false;
  }

  /**
   * Send a prompt message to Pi
   * @returns {boolean} true if message was sent, false otherwise
   */
  function sendPrompt(content) {
    if (!ws.value || ws.value.readyState !== WebSocket.OPEN) return false;
    ws.value.send(JSON.stringify({ type: "prompt", content }));
    return true;
  }

  /**
   * Stop the current response
   */
  function stopResponse() {
    if (!ws.value || ws.value.readyState !== WebSocket.OPEN) return;
    ws.value.send(JSON.stringify({ type: "stop" }));
  }

  /**
   * Delete a message from the conversation
   */
  function deleteMessage(index, role, content) {
    if (!ws.value || ws.value.readyState !== WebSocket.OPEN) return;
    ws.value.send(JSON.stringify({ type: "delete-message", index, role, content }));
  }

  /**
   * Start a new session
   */
  function newSession() {
    if (!ws.value || ws.value.readyState !== WebSocket.OPEN) return;
    ws.value.send(JSON.stringify({ type: "new-session" }));
    currentStreamContent = "";
  }

  // Event handlers map
  const handlers = new Map();

  /**
   * Register an event handler
   */
  function on(event, callback) {
    handlers.set(event, callback);
  }

  /**
   * Remove an event handler
   */
  function off(event) {
    handlers.delete(event);
  }

  /**
   * Internal event dispatcher
   */
  function emitEvent(type, data) {
    const handler = handlers.get(type);
    if (handler) {
      handler(data);
    }

    // Special handling for stream events
    if (type === "stream") {
      currentStreamContent += data.content;
    }
    if (type === "message" && data.role === "assistant") {
      currentStreamContent = "";
    }
    if (type === "error") {
      lastError.value = data.message;
    }
    if (type === "session-started") {
      sessionId.value = data.sessionId;
    }
    if (type === "auth-ok") {
      wsUser.value = data.user;
    }
  }

  // Cleanup on unmount
  onUnmounted(() => {
    disconnect();
  });

  return {
    isConnected: readonly(isConnected),
    isConnecting: readonly(isConnecting),
    lastError: readonly(lastError),
    sessionId: readonly(sessionId),
    wsUser: readonly(wsUser),
    connect,
    disconnect,
    sendPrompt,
    stopResponse,
    deleteMessage,
    newSession,
    on,
    off,
  };
}
