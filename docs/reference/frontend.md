# Frontend (`src/`)

The Vue 3 + Pinia frontend that provides the chat UI.

## Summary

A single-page Vue application with a GitHub Dark-themed chat interface. It connects to the WebSocket server, manages chat state via Pinia, and renders streaming responses with tool call visualization.

## Entry Point: `main.ts`

```typescript
import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";

const app = createApp(App);
app.use(createPinia());
app.mount("#app");
```

Minimal bootstrap: creates a Vue app, registers the Pinia store, and mounts to `#app`.

## Main Component: `App.vue`

The single-file component containing the entire UI. It uses `<script setup>` with Composition API.

### Template Structure

```
app (root flex container)
├── sidebar (session list, new session button)
├── main
│   ├── header (logo, model badge, thinking badge, connection status)
│   ├── messages (scrollable message list)
│   └── input-area (textarea + send/abort button)
└── modals (Teleported to body)
    ├── model-selector
    ├── settings
    └── confirm-clear
```

### Computed Properties (from store)

| Property | Type | Description |
|----------|------|-------------|
| `messages` | `Ref<ChatMessage[]>` | Chat message history |
| `isStreaming` | `Ref<boolean>` | Whether an agent is currently responding |
| `wsConnected` | `Ref<boolean>` | WebSocket connection status |
| `wsError` | `Ref<string \| null>` | Last error message |
| `currentModel` | `Ref<ModelOption \| null>` | Currently selected model |
| `availableModels` | `Ref<ModelOption[]>` | All available models |
| `thinkingLevel` | `Ref<string>` | Current thinking level |
| `sessionId` | `Ref<string \| null>` | Current session ID |
| `sessionName` | `Ref<string \| null>` | Current session name |
| `messageCount` | `Ref<number>` | Total message count |
| `pendingMessageCount` | `Ref<number>` | Pending message count |

### UI Actions

| Action | Description |
|--------|-------------|
| `sendMessage()` | Sends input text, clears input, focuses textarea |
| `useSuggestion(text)` | Pre-fills the input with a suggestion |
| `abort()` | Sends abort signal to server |
| `selectModel(model)` | Switches to the given model |
| `handleNewSession()` | Creates a new session, closes sidebar |
| `clearMessages()` | Clears the message list locally |

### Formatting Functions

| Function | Description |
|----------|-------------|
| `formatTime(ts)` | Formats a Unix timestamp to locale time string |
| `truncate(str, max)` | Truncates a string with `...` |
| `formatContent(content)` | Converts markdown-like syntax to HTML (bold, italic, code blocks, headings, lists) |

### Auto-Scroll Behavior

A `watch` on `messages.length` and `isStreaming` triggers `scrollToBottom()` after each post-flush update, ensuring the chat view follows new content.

### Styles

All styles are scoped to `:root` CSS variables (GitHub Dark theme):

| Variable | Value | Purpose |
|----------|-------|---------|
| `--bg-primary` | `#0d1117` | Main background |
| `--bg-secondary` | `#161b22` | Sidebar/header background |
| `--bg-tertiary` | `#21262d` | Input/cards background |
| `--accent` | `#58a6ff` | Primary accent color |
| `--green` | `#3fb950` | Success/completion indicator |
| `--red` | `#f85149` | Error indicator |
| `--orange` | `#d29922` | Warning indicator |

## Store: `stores/chat.ts`

See [[docs/reference/store/chat.md]] for detailed store documentation.

## Types: `types.ts`

See [[docs/reference/types.md]] for detailed type documentation.

## Build Configuration: `vite.config.ts`

| Setting | Value | Purpose |
|---------|-------|---------|
| `port` | `5173` | Dev server port |
| `proxy /ws` | `http://localhost:3001` | Proxy WebSocket connections to backend |
| `@` alias | `./src/` | Import alias for source files |

### Dev Mode Proxy

In development, Vite proxies WebSocket connections from `ws://localhost:5173/ws` to the backend server at `ws://localhost:3001`. This allows the frontend to connect to the WebSocket server without CORS issues.

```typescript
// vite.config.ts
server: {
  port: 5173,
  proxy: {
    "/ws": {
      target: "http://localhost:3001",
      ws: true,
      changeOrigin: true,
    },
  },
}
```

## Tags

- **category**: frontend, vue
- **component**: App.vue, main.ts, stores/chat.ts, types.ts
- **pattern**: composition-api, pinia-store, css-variables
- **audience**: developers, engineers
