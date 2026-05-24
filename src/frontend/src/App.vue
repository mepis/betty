<template>
  <div class="app">
    <!-- Auth Views -->
    <div v-if="!isLoggedIn" class="auth-views">
      <Login v-if="currentPage === 'login'" @login-success="handleAuthSuccess" />
      <Register v-else-if="currentPage === 'register'" @register-success="handleAuthSuccess" />
      <Login v-else @login-success="handleAuthSuccess" />
    </div>

    <!-- Main App (authenticated) -->
    <template v-else>
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
          <button
            v-if="auth.isAdmin()"
            class="btn"
            @click="currentPage = 'admin'"
            title="Admin Panel"
          >
            ⚙️
          </button>
          <!-- User Menu -->
          <div class="user-menu">
            <button class="btn user-btn" @click="showUserMenu = !showUserMenu">
              👤 {{ auth.user?.username || "User" }}
            </button>
            <div v-if="showUserMenu" class="user-dropdown">
              <div class="dropdown-item">
                <span>Role: <strong>{{ auth.user?.role }}</strong></span>
              </div>
              <div class="dropdown-divider"></div>
              <button class="dropdown-item btn-logout" @click="handleLogout">
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      <!-- Chat Container -->
      <div class="chat-container">
        <!-- Error Banner -->
        <div v-if="lastError" class="error-banner">
          <span>⚠️</span>
          <span>{{ lastError }}</span>
          <button class="btn btn-danger btn-icon" @click="connectWs" style="margin-left: auto; flex-shrink: 0;">
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
                <button
                  class="btn btn-delete"
                  @click="deleteMessage(index)"
                  title="Delete message"
                >
                  ✕
                </button>
              </div>

              <!-- Thinking Indicator -->
              <div v-if="isThinking && !streamingContent" class="message assistant">
                <div class="message-avatar">🤖</div>
                <div class="message-content">
                  <div class="message-text">
                    <span class="thinking-text">Thinking</span>
                    <span class="thinking-dots">
                      <span>.</span><span>.</span><span>.</span>
                    </span>
                  </div>
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
              v-if="!isStreaming"
              class="btn btn-primary"
              @click="sendPrompt(inputText)"
              :disabled="!isConnected || !inputText.trim()"
              title="Send message"
            >
              ➤
            </button>
            <button
              v-else
              class="btn btn-danger"
              @click="stopResponse"
              title="Stop response"
            >
              ⏹
            </button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted } from "vue";
import { useAuth } from "./composables/useAuth.js";
import { useWebSocket } from "./composables/useWebSocket.js";
import Login from "./pages/Login.vue";
import Register from "./pages/Register.vue";

const auth = useAuth();

// Local computed for auth state (to ensure reactivity)
const isLoggedIn = computed(() => !!auth.getToken());

// Simple hash-based routing
const currentPage = ref("login");

function updateRoute() {
  const hash = window.location.hash.slice(1) || "login";

  // Re-sync token with localStorage on every route change
  auth.syncWithStorage();

  if (isLoggedIn.value) {
    currentPage.value = ["chat", "admin"].includes(hash) ? hash : "chat";
  } else {
    currentPage.value = ["login", "register"].includes(hash) ? hash : "login";
  }
}

window.addEventListener("hashchange", updateRoute);

// WebSocket with auth token
const wsTokenGetter = computed(() => auth.getToken());
const {
  isConnected,
  isConnecting,
  lastError,
  connect: connectWs,
  sendPrompt: wsSendPrompt,
  stopResponse: wsStopResponse,
  newSession: wsNewSession,
  deleteMessage: wsDeleteMessage,
  on: wsOn,
} = useWebSocket(null, wsTokenGetter);

// State
const messages = ref([]);
const streamingContent = ref("");
const inputText = ref("");
const inputEl = ref(null);
const messagesContainer = ref(null);
const hasStarted = ref(false);
const isStreaming = ref(false);
const isThinking = ref(false);
const showUserMenu = ref(false);

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

// Format message content
function formatMessage(content) {
  if (!content) return "";

  let text = content
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  text = text.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
    return `<pre><code class="language-${lang}">${code.trim()}</code></pre>`;
  });

  text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
  text = text.replace(/\*\*([\s\S]*?)\*\*/g, "<strong>$1</strong>");
  text = text.replace(/\*([\s\S]*?)\*/g, "<em>$1</em>");
  text = text.replace(/(<pre>.*?<\/pre>)|(\n)/gs, (match, preBlock) => {
    return preBlock !== undefined ? preBlock : "<br>";
  });

  return text;
}

function scrollToBottom() {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
    }
  });
}

watch([messages, streamingContent], scrollToBottom);

function sendPrompt(text) {
  const trimmed = text.trim();
  if (!trimmed || !isConnected.value || isStreaming.value) return;

  inputText.value = "";
  hasStarted.value = true;

  messages.value.push({ role: "user", content: trimmed });

  if (wsSendPrompt(trimmed)) {
    isStreaming.value = true;
    isThinking.value = true;
    streamingContent.value = "";
  }
}

function stopResponse() {
  isStreaming.value = false;
  isThinking.value = false;
  streamingContent.value = "";
  wsStopResponse();
}

function deleteMessage(index) {
  const msg = messages.value[index];
  if (!msg) return;
  messages.value.splice(index, 1);
  wsDeleteMessage(index, msg.role, msg.content);
}

function startNewSession() {
  messages.value = [];
  streamingContent.value = "";
  hasStarted.value = false;
  isStreaming.value = false;
  isThinking.value = false;
  wsNewSession();
}

function insertNewline() {
  inputText.value += "\n";
  autoResize();
}

function autoResize() {
  if (!inputEl.value) return;
  inputEl.value.style.height = "auto";
  inputEl.value.style.height = Math.min(inputEl.value.scrollHeight, 150) + "px";
}

// Auth handlers
function handleAuthSuccess() {
  currentPage.value = "chat";
  window.location.hash = "chat";
  connectWs();
}

async function handleLogout() {
  showUserMenu.value = false;
  await auth.logout();
  currentPage.value = "login";
  window.location.hash = "login";
}

// WebSocket event handlers
wsOn("message", (data) => {
  if (data.role === "assistant") {
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

wsOn("stream", (data) => {
  isThinking.value = false;
  streamingContent.value += data.content;
  isStreaming.value = true;
});

wsOn("error", (data) => {
  console.error("[Pi Chat] Error:", data.message);
  isStreaming.value = false;
  isThinking.value = false;
  streamingContent.value = "";
});

wsOn("status", (data) => {
  if (data.status === "ready") {
    console.log("[Pi Chat] Pi is ready");
  } else if (data.status === "starting") {
    console.log("[Pi Chat] Pi is starting...");
  }
});

wsOn("tool-call", (data) => {
  console.log(`[Pi Chat] Tool call: ${data.toolName}`);
});

wsOn("tool-result", (data) => {
  console.log(`[Pi Chat] Tool result: ${data.toolName} (error: ${data.isError})`);
});

// Close dropdown when clicking outside
document.addEventListener("click", (e) => {
  if (showUserMenu.value && !e.target.closest(".user-menu")) {
    showUserMenu.value = false;
  }
});

// Initialize on mount
onMounted(async () => {
  // Sync auth state with localStorage first
  auth.syncWithStorage();
  updateRoute();

  // Try to restore session from localStorage
  if (auth.getToken()) {
    const user = await auth.fetchUser();
    if (user) {
      currentPage.value = "chat";
      window.location.hash = "chat";
      connectWs();
    } else {
      auth.logout();
    }
  }
});
</script>

<style scoped>
.app {
  height: 100dvh;
  height: 100vh;
  display: flex;
  flex-direction: column;
}
</style>
