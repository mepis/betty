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
 */
export function useWebSocket(url = null) {
  const wsUrl = url || (import.meta.env.DEV ? "ws://localhost:3001/ws" : `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/ws`);

  const ws = ref(null);
  const isConnected = ref(false);
  const isConnecting = ref(false);
  const lastError = ref(null);
  const sessionId = ref(null);

  let reconnectAttempts = 0;
  const maxReconnectAttempts = 5;
  let reconnectTimer = null;
  let currentStreamContent = "";

  /**
   * Connect to the WebSocket server
   */
  function connect() {
    disconnect();
    isConnecting.value = true;
    lastError.value = null;

    try {
      ws.value = new WebSocket(wsUrl);

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
      // Message completed — currentStreamContent is now final
      currentStreamContent = "";
    }
    if (type === "error") {
      lastError.value = data.message;
    }
    if (type === "session-started") {
      sessionId.value = data.sessionId;
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
    connect,
    disconnect,
    sendPrompt,
    stopResponse,
    newSession,
    on,
    off,
  };
}
