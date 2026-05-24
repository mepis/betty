<template>
  <div class="app">
    <!-- Header -->
    <header class="app-header">
      <h1>
        <span class="logo">🤖</span>
        Pi Chat
      </h1>
      <div class="header-actions">
        <span
          class="status-badge"
          :class="{
            connected: isConnected,
            connecting: isConnecting && !isConnected,
            error: lastError && !isConnected,
          }"
        >
          <span class="status-dot"></span>
          {{ statusText }}
        </span>
        <button
          class="btn"
          @click="startNewSession"
          :disabled="!isConnected"
          title="Start a new chat session"
        >
          ✚ New Chat
        </button>
      </div>
    </header>

    <!-- Chat Container -->
    <div class="chat-container">
      <!-- Error Banner -->
      <div v-if="lastError" class="error-banner">
        <span>⚠️</span>
        <span>{{ lastError }}</span>
        <button class="btn btn-danger btn-icon" @click="connect" style="margin-left: auto; flex-shrink: 0;">
          ↻ Retry
        </button>
      </div>

      <!-- Messages Area -->
      <div class="messages-area" ref="messagesContainer">
        <div class="messages-inner">
          <!-- Welcome Screen -->
          <div v-if="messages.length === 0 && !hasStarted" class="welcome-screen">
            <div class="welcome-icon">🤖</div>
            <h2>Welcome to Pi Chat</h2>
            <p>
              Chat with Pi, the minimal terminal coding agent. Ask it to write code,
              explain concepts, or build extensions.
            </p>
            <div class="welcome-hints">
              <div
                class="welcome-hint"
                v-for="hint in hints"
                :key="hint"
                @click="sendPrompt(hint)"
              >
                {{ hint }}
              </div>
            </div>
          </div>

          <!-- Messages -->
          <template v-else>
            <div
              v-for="(msg, index) in messages"
              :key="index"
              class="message"
              :class="msg.role"
            >
              <div class="message-avatar">
                {{ msg.role === "user" ? "👤" : "🤖" }}
              </div>
              <div class="message-content">
                <div class="message-text" v-html="formatMessage(msg.content)"></div>
              </div>
            </div>

            <!-- Streaming Message -->
            <div v-if="streamingContent" class="message assistant">
              <div class="message-avatar">🤖</div>
              <div class="message-content">
                <div class="message-text">
                  <span v-html="formatMessage(streamingContent)"></span>
                  <span class="streaming-cursor"></span>
                </div>
              </div>
            </div>

            <!-- Stop Button -->
            <div v-if="isStreaming" class="stop-indicator">
              <button class="btn btn-danger" @click="stopResponse">
                ⏹ Stop
              </button>
            </div>
          </template>
        </div>
      </div>

      <!-- Input Area -->
      <div class="input-area">
        <div class="input-wrapper">
          <div class="input-box">
            <textarea
              ref="inputEl"
              v-model="inputText"
              @keydown.enter.exact.prevent="sendPrompt(inputText)"
              @keydown.shift.enter.prevent="insertNewline"
              @input="autoResize"
              placeholder="Ask Pi anything..."
              rows="1"
              :disabled="!isConnected"
            ></textarea>
          </div>
          <button
            class="btn btn-primary"
            @click="sendPrompt(inputText)"
            :disabled="!isConnected || !inputText.trim() || isStreaming"
            title="Send message"
          >
            ➤
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted } from "vue";
import { useWebSocket } from "./composables/useWebSocket";

// WebSocket composable
const {
  isConnected,
  isConnecting,
  lastError,
  connect,
  disconnect,
  sendPrompt: wsSendPrompt,
  stopResponse: wsStopResponse,
  newSession: wsNewSession,
  on,
} = useWebSocket();

// State
const messages = ref([]);
const streamingContent = ref("");
const inputText = ref("");
const inputEl = ref(null);
const messagesContainer = ref(null);
const hasStarted = ref(false);
const isStreaming = ref(false);

// Welcome hints
const hints = [
  "Write a Vue 3 component that fetches and displays a list of GitHub repos",
  "Explain the difference between let, const, and var in JavaScript",
  "Help me set up a Node.js Express server with TypeScript",
  "Write a regex to validate email addresses",
];

// Computed status text
const statusText = computed(() => {
  if (isConnected.value) return "Connected";
  if (isConnecting.value) return "Connecting...";
  if (lastError.value) return "Disconnected";
  return "Offline";
});

// Format message content (basic markdown-like formatting)
function formatMessage(content) {
  if (!content) return "";

  let text = content
    // Escape HTML
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Code blocks (``` ... ```)
  text = text.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
    return `<pre><code class="language-${lang}">${code.trim()}</code></pre>`;
  });

  // Inline code
  text = text.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Bold (allow * inside for nested formatting like **bold *and italic* bold**)
  text = text.replace(/\*\*([\s\S]*?)\*\*/g, "<strong>$1</strong>");

  // Italic (allow * inside)
  text = text.replace(/\*([\s\S]*?)\*/g, "<em>$1</em>");

  // Line breaks (but not inside <pre> blocks)
  // Use alternation to preserve newlines inside <pre>...</pre> blocks
  text = text.replace(/(<pre>.*?<\/pre>)|(\n)/gs, (match, preBlock) => {
    return preBlock !== undefined ? preBlock : "<br>";
  });

  return text;
}

// Auto-scroll to bottom
function scrollToBottom() {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
    }
  });
}

// Watch messages and streaming content for auto-scroll
watch([messages, streamingContent], scrollToBottom);

// Send a prompt
function sendPrompt(text) {
  const trimmed = text.trim();
  if (!trimmed || !isConnected.value || isStreaming.value) return;

  inputText.value = "";
  hasStarted.value = true;

  // Add user message immediately
  messages.value.push({ role: "user", content: trimmed });

  // Send to backend — only set streaming state if the send succeeds
  if (wsSendPrompt(trimmed)) {
    isStreaming.value = true;
    streamingContent.value = "";
  }
}

// Stop current response
function stopResponse() {
  isStreaming.value = false;
  streamingContent.value = "";
  wsStopResponse();
}

// Start a new session
function startNewSession() {
  messages.value = [];
  streamingContent.value = "";
  hasStarted.value = false;
  isStreaming.value = false;
  wsNewSession();
}

// Insert newline on Shift+Enter
function insertNewline() {
  inputText.value += "\n";
  autoResize();
}

// Auto-resize textarea
function autoResize() {
  if (!inputEl.value) return;
  inputEl.value.style.height = "auto";
  inputEl.value.style.height = Math.min(inputEl.value.scrollHeight, 150) + "px";
}

// WebSocket event handlers
on("message", (data) => {
  if (data.role === "assistant") {
    // Message completed — save streaming content as final message
    if (streamingContent.value) {
      messages.value.push({
        role: "assistant",
        content: streamingContent.value,
      });
      streamingContent.value = "";
    }
    isStreaming.value = false;
  }
});

on("stream", (data) => {
  streamingContent.value += data.content;
  isStreaming.value = true;
});

on("error", (data) => {
  console.error("[Pi Chat] Error:", data.message);
  if (data.message && data.message !== "Empty message") {
    // Don't add error messages as chat messages — show in banner
  }
  isStreaming.value = false;
  streamingContent.value = "";
});

on("status", (data) => {
  if (data.status === "ready") {
    console.log("[Pi Chat] Pi is ready");
  } else if (data.status === "starting") {
    console.log("[Pi Chat] Pi is starting...");
  }
});

on("tool-call", (data) => {
  console.log(`[Pi Chat] Tool call: ${data.toolName}`);
});

on("tool-result", (data) => {
  console.log(`[Pi Chat] Tool result: ${data.toolName} (error: ${data.isError})`);
});

// Connect on mount
onMounted(() => {
  connect();
});
</script>

<style scoped>
.app {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.stop-indicator {
  display: flex;
  justify-content: center;
  padding: 8px 0;
}
</style>
