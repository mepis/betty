# Milestone 4: Settings and Polish

**Design Doc Reference:** Phase 4 (Tasks 4.1 – 4.3)
**Status:** Not Started
**Estimated Effort:** 2–3 days

---

## Goal

Add model selection, thinking level control, error handling, UX polish, keyboard shortcuts, production build configuration, and environment variable management.

---

## Dependencies

- **Milestone 3** must be complete:
  - Full chat UI with streaming, markdown rendering, tool execution display
  - Pinia stores for chat and session state
  - WebSocket client with reconnection
  - Session sidebar with CRUD operations

---

## Task 4.1: Settings Panel

### Description

Build the settings panel accessible via a gear icon, with model selector, thinking level selector, API key input, shared secret configuration, connection status, and session stats.

### Todo

- [ ] **4.1.1** Create `src/frontend/src/components/SettingsPanel.vue`:
  - Modal or slide-out panel triggered by gear icon in header
  - Sections:
    1. Connection
    2. Model
    3. Thinking Level
    4. API Keys
    5. Session Stats
    6. Appearance (future)

- [ ] **4.1.2** Implement model selector:
  ```vue
  <template>
    <div class="settings-section">
      <h3>Model</h3>
      <select v-model="selectedModel" @change="changeModel">
        <option v-for="model in availableModels" :key="model.id" :value="model.id">
          {{ model.name || `${model.provider}/${model.id}` }} ({{ model.provider }})
        </option>
      </select>
      <p v-if="availableModels.length === 0" class="text-warning">
        No models available. Configure API keys in Settings → API Keys.
      </p>
    </div>
  </template>
  ```
  - Fetch available models from `GET /api/models` on mount
  - Display provider, name, and availability status
  - Model changes take effect on next prompt

- [ ] **4.1.3** Implement thinking level selector:
  ```vue
  <template>
    <div class="settings-section">
      <h3>Thinking Level</h3>
      <select v-model="selectedThinkingLevel" @change="changeThinkingLevel">
        <option v-for="level in availableThinkingLevels" :key="level" :value="level">
          {{ level }}
        </option>
      </select>
      <p class="text-xs text-gray-500">
        Only levels available for the current model are shown.
      </p>
    </div>
  </template>
  ```
  - Filter to only levels supported by the current model (reasoning models support off/minimal/low/medium/high/xhigh; non-reasoning models always use 'off')
  - Not all models support all thinking levels
  - Levels: `off`, `minimal`, `low`, `medium`, `high`, `xhigh`
  - Changes take effect on next prompt
  - Note: The SDK does NOT provide `getAvailableThinkingLevels()`. Available levels are determined by the model's reasoning capability.
    - Reasoning models (e.g., Claude): off, minimal, low, medium, high, xhigh
    - Non-reasoning models: always 'off'
    - The frontend should filter levels based on the current model's `reasoning` property.
    ```
    This way the frontend receives available levels whenever the thinking level changes (e.g., after model switch), without needing a separate WebSocket command.

- [ ] **4.1.4** Implement API key input:
  ```vue
  <template>
    <div class="settings-section">
      <h3>API Keys</h3>
      <div v-for="provider in apiKeyProviders" :key="provider" class="api-key-input">
        <label>{{ provider }}</label>
        <input
          type="password"
          v-model="apiKeys[provider]"
          placeholder="Enter API key"
        />
        <button @click="saveApiKey(provider)">Save</button>
      </div>
      <p class="text-xs text-gray-500">
        API keys are stored securely and used for model requests.
      </p>
    </div>
  </template>
  ```
  - Support providers without OAuth (OpenAI, Anthropic, etc.)
  - Store in `authStorage.setRuntimeApiKey()` for runtime override
  - Keys are masked (password input type)

- [ ] **4.1.5** Implement shared secret configuration:
  ```vue
  <template>
    <div class="settings-section">
      <h3>Shared Secret</h3>
      <input
        type="password"
        v-model="sharedSecret"
        placeholder="Enter shared secret"
      />
      <button @click="saveSharedSecret">Save</button>
      <p class="text-xs text-gray-500">
        Used for WebSocket authentication. Set via SHARED_SECRET environment variable.
      </p>
    </div>
  </template>
  ```
  - Store in `settingsStore.sharedSecret`
  - Persist in localStorage
  - Reconnect WebSocket with new secret on change

- [ ] **4.1.6** Implement connection status indicator:
  ```vue
  <template>
    <div class="connection-status">
      <span class="status-dot" :class="connectionState"></span>
      <span>{{ connectionLabel }}</span>
    </div>
  </template>
  ```
  - Green dot: connected
  - Yellow dot: connecting
  - Red dot: disconnected/error
  - Label: "Connected", "Connecting...", "Disconnected", "Error"

- [ ] **4.1.7** Implement session stats display:
  ```vue
  <template>
    <div class="settings-section">
      <h3>Session Stats</h3>
      <div class="stats-grid">
        <div class="stat-item">
          <span class="stat-label">Tokens Used</span>
          <span class="stat-value">{{ stats.tokensUsed?.toLocaleString() || '—' }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Cost</span>
          <span class="stat-value">${{ stats.cost?.toFixed(4) || '—' }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Context Window</span>
          <span class="stat-value">{{ stats.contextPercentage?.toFixed(1) || '—' }}%</span>
        </div>
      </div>
      <div class="context-bar">
        <div class="context-fill" :style="{ width: stats.contextPercentage + '%' }"></div>
      </div>
    </div>
  </template>
  ```
  - Fetch stats from `GET /api/sessions/:id/stats`
  - Update in real-time via `agent_end` events
  - Show context window usage as a progress bar

- [ ] **4.1.8** Persist settings in localStorage:
  ```typescript
  // In settings store
  function saveToLocalStorage() {
    localStorage.setItem('betty:settings', JSON.stringify({
      sharedSecret: this.sharedSecret,
      apiKeys: this.apiKeys,
      theme: this.theme,
      fontSize: this.fontSize,
      autoScroll: this.autoScroll,
      showThinking: this.showThinking,
      showTools: this.showTools,
    }));
  }

  function loadFromLocalStorage() {
    const saved = localStorage.getItem('betty:settings');
    if (saved) {
      const parsed = JSON.parse(saved);
      Object.assign(this, parsed);
    }
  }
  ```

### Additional Info

- **Model availability**: The `/api/models` endpoint returns models with provider, id, and availability status. Display unavailable models with a visual indicator (e.g., grayed out, "(no API key)" label).

- **Thinking level filtering**: Not all models support all thinking levels. The SDK does NOT provide `getAvailableThinkingLevels()`. Available levels are determined by the model's reasoning capability.
    - Reasoning models (e.g., Claude): off, minimal, low, medium, high, xhigh
    - Non-reasoning models: always 'off'
    - The frontend should filter levels based on the current model's `reasoning` property.

- **API key providers**: Common providers include:
  - OpenAI (`OPENAI_API_KEY`)
  - Anthropic (`ANTHROPIC_API_KEY`)
  - Google (`GOOGLE_API_KEY`)
  - Ollama (local, no key needed)
  - Custom providers via environment variables

- **Session stats**:
  - Tokens used: total tokens consumed by the session
  - Cost: estimated cost based on model pricing
  - Context window: percentage of the model's context window used by the current conversation

### Acceptance Criteria

- Model selector shows available models from `/api/models`
- Thinking level changes take effect on next prompt
- Available thinking levels are updated when `thinking_level_changed` event fires (Fix #4, #17)
- Settings persist across page reloads (localStorage)
- Connection status shows real-time WebSocket state
- Session stats are displayed and update in real-time
- API key input works and saves to runtime
- Shared secret configuration works
- Model switching works mid-session
- Thinking level dropdown filters to available levels for the current model (Fix #4, #17)

---

## Task 4.2: Error Handling and UX Polish

### Description

Add error toast notifications, loading states, empty states, keyboard shortcuts, and connection status bar.

### Todo

- [ ] **4.2.1** Create `src/frontend/src/components/ConnectionBar.vue`:
  - Fixed bar at the top or bottom of the screen
  - Shows connection status with color-coded indicator
  - Shows current model and session name
  - Click to open settings panel
  ```vue
  <template>
    <div class="connection-bar" :class="connectionState">
      <div class="connection-info">
        <span class="status-dot" :class="connectionState"></span>
        <span>{{ connectionLabel }}</span>
        <span v-if="currentModel" class="model-info">{{ currentModel }}</span>
        <span v-if="currentSessionName" class="session-info">{{ currentSessionName }}</span>
      </div>
      <button @click="openSettings" class="settings-btn">⚙</button>
    </div>
  </template>
  ```

- [ ] **4.2.2** Create `src/frontend/src/components/Toast.vue`:
  - Toast notification component
  - Types: `info`, `warning`, `error`, `success`
  - Auto-dismiss after 5 seconds
  - Manual dismiss with close button
  - Stack multiple toasts vertically
  ```vue
  <template>
    <div class="toast-container">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="toast"
        :class="toast.type"
      >
        <span class="toast-message">{{ toast.message }}</span>
        <button @click="removeToast(toast.id)" class="toast-close">×</button>
      </div>
    </div>
  </template>
  ```

- [ ] **4.2.3** Create `src/frontend/src/composables/useToast.ts`:
  ```typescript
  import { ref } from 'vue';

  interface Toast {
    id: string;
    type: 'info' | 'warning' | 'error' | 'success';
    message: string;
    duration?: number;
  }

  const toasts = ref<Toast[]>([]);

  export function useToast() {
    function showToast(type: Toast['type'], message: string, duration = 5000) {
      const id = crypto.randomUUID();
      toasts.value.push({ id, type, message, duration });

      if (duration > 0) {
        setTimeout(() => removeToast(id), duration);
      }
    }

    function removeToast(id: string) {
      toasts.value = toasts.value.filter(t => t.id !== id);
    }

    return { toasts, showToast, removeToast };
  }
  ```

- [ ] **4.2.4** Wire up error toasts for all error sources:
  ```typescript
  // In ChatView.vue event handler
  function handleEvent(event: WSEvent) {
    switch (event.type) {
      case 'error':
        showToast('error', event.data.message);
        break;
      case 'extension_error':
        showToast('error', `Extension error: ${event.data.error}`);
        break;
      case 'agent_end':
        if (event.data.willRetry) {
          showToast('info', 'Retrying after compaction...');
        }
        break;
      case 'auto_retry_end':
        if (event.data.finalError) {
          showToast('error', `Retry exhausted: ${event.data.finalError}`);
        }
        break;
      case 'compaction_end':
        if (event.data.errorMessage) {
          showToast('error', `Compaction failed: ${event.data.errorMessage}`);
        } else if (event.data.result) {
          // Fix for Issue #10: tokensBefore is the token count BEFORE compaction,
          // not the number of tokens saved. Display accurately.
          const tokensBefore = event.data.result.tokensBefore;
          const tokensAfter = event.data.result.tokensAfter;
          if (tokensAfter !== undefined) {
            const tokensSaved = tokensBefore - tokensAfter;
            showToast('success', `Compacted: ${tokensSaved} tokens saved (${tokensBefore} → ${tokensAfter})`);
          } else {
            showToast('success', `Compacted: ${tokensBefore} tokens before compaction`);
          }
        }
        break;
      // ... other events
    }
  }
  ```

- [ ] **4.2.5** Add loading states for all async operations:
  - Session list loading: show spinner while fetching sessions
  - Model list loading: show spinner while fetching models
  - Session switch: show loading indicator during switch
  - Session delete: show confirmation, then loading during deletion
  - Use skeleton screens or spinners

- [ ] **4.2.6** Add empty state for new sessions:
  ```vue
  <template>
    <div v-if="!hasMessages" class="empty-state">
      <div class="empty-icon">💬</div>
      <h2>Ask me anything...</h2>
      <p>I can help you with coding, debugging, architecture, and more.</p>
      <div class="suggestions">
        <button @click="fillInput('Explain how this code works')">Explain how this code works</button>
        <button @click="fillInput('Help me debug this error')">Help me debug this error</button>
        <button @click="fillInput('Write a test for this function')">Write a test for this function</button>
      </div>
    </div>
  </template>
  ```

- [ ] **4.2.7** Add keyboard shortcuts:
  ```typescript
  // In App.vue or ChatView.vue
  onMounted(() => {
    window.addEventListener('keydown', handleKeyDown);
  });

  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeyDown);
  });

  function handleKeyDown(event: KeyboardEvent) {
    // Ctrl+Enter or Cmd+Enter: send message
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      sendMessage();
    }
    // Escape: abort current operation
    if (event.key === 'Escape' && isStreaming) {
      event.preventDefault();
      abort();
    }
    // Enter (no modifier): send message (if not in textarea or textarea is empty)
    if (event.key === 'Enter' && !event.shiftKey && !event.ctrlKey && !event.metaKey) {
      const activeElement = document.activeElement;
      if (activeElement?.tagName !== 'TEXTAREA') {
        event.preventDefault();
        sendMessage();
      }
    }
    // Shift+Enter: newline in textarea (handled by textarea's default behavior)
  }
  ```

- [ ] **4.2.8** Add model fallback warning toast:
  ```typescript
  // After runtime creation, check modelFallbackMessage
  if (runtime.modelFallbackMessage) {
    showToast('warning', `Model fallback: ${runtime.modelFallbackMessage}`);
  }
  ```

- [ ] **4.2.9** Add extension cancellation toast:
  ```typescript
  // After fork/switch/new_session responses
  if (response.data.cancelled) {
    showToast('warning', 'Session operation was cancelled by an extension.');
  }
  ```

### Additional Info

- **Toast types**:
  - `info`: Informational messages (e.g., "Compacting conversation...")
  - `warning`: Non-critical issues (e.g., "Model fallback", "Session cancelled")
  - `error`: Errors that need attention (e.g., "WebSocket connection failed", "Agent error")
  - `success`: Positive confirmations (e.g., "Compacted: X tokens saved", "Session created")

- **Toast positioning**: Top-right corner of the screen, stacking vertically. Each toast has a 5-second auto-dismiss with a close button.

- **Loading states**:
  - Use CSS spinners (Tailwind `animate-spin`)
  - Skeleton screens for list items (gray placeholder boxes)
  - Disable input during loading states

- **Empty state**: Display when there are no messages. Include a greeting, description, and suggested prompts to guide new users.

- **Keyboard shortcuts**:
  - `Ctrl+Enter` / `Cmd+Enter`: Send message
  - `Escape`: Abort current agent operation
  - `Enter`: Send message (when not in textarea)
  - `Shift+Enter`: Newline in textarea (default behavior)

### Acceptance Criteria

- Errors are displayed as non-blocking toasts
- Loading states prevent user confusion
- Empty state guides new users
- Keyboard shortcuts work as documented
- Connection status is always visible
- Model fallback warnings display as toasts
- Extension cancellation shows toast notification
- Compaction toasts show accurate token info (Fix #10)
- Session stats update in real-time

---

## Task 4.3: Production Build Configuration

### Description

Configure production builds for both frontend and backend, set up environment variables, and create the start script.

### Todo

- [ ] **4.3.1** Configure Vite for production build:
  ```typescript
  // src/frontend/vite.config.ts
  import { defineConfig } from 'vite';
  import vue from '@vitejs/plugin-vue';
  import { resolve } from 'path';

  export default defineConfig({
    plugins: [vue()],
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      sourcemap: false,
    },
    server: {
      proxy: {
        '/api': 'http://localhost:3001',
        '/ws': {
          target: 'ws://localhost:3001',
          ws: true,
        },
      },
    },
  });
  ```

- [ ] **4.3.2** Create `src/frontend/package.json` scripts:
  ```json
  {
    "scripts": {
      "dev": "vite",
      "build": "vue-tsc && vite build",
      "preview": "vite preview"
    }
  }
  ```

- [ ] **4.3.3** Configure Express to serve static files:
  ```typescript
  // src/backend/src/server.ts
  import path from 'path';
  import { fileURLToPath } from 'url';

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  // Serve static files from frontend dist in production
  app.use(express.static(path.join(__dirname, '../../frontend/dist')));

  // Catch-all route: serve index.html for SPA routing
  app.get('*', (_req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/dist/index.html'));
  });
  ```

- [ ] **4.3.4** Create `src/backend/package.json` scripts:
  ```json
  {
    "scripts": {
      "dev": "tsx watch src/server.ts",
      "build": "tsc",
      "start": "node dist/server.js"
    }
  }
  ```

- [ ] **4.3.5** Create root `package.json` scripts:
  ```json
  {
    "scripts": {
      "dev:backend": "cd src/backend && npm run dev",
      "dev:frontend": "cd src/frontend && npm run dev",
      "dev": "concurrently \"npm run dev:backend\" \"npm run dev:frontend\"",
      // Fix for Issue #13: Use proper && chain so frontend build failure stops the build
      "build": "npm run build:frontend && npm run build:backend",
      "build:frontend": "cd src/frontend && npm run build",
      "build:backend": "cd src/backend && npm run build",
      "start": "cd src/backend && npm start"
    }
  }
  ```
  - **Fix for Issue #13:** The original build script `"build": "cd src/frontend && npm run build && cd ../backend && npm run build"` runs sequentially but doesn't fail if the frontend build fails (the `cd ../backend` still executes). Using separate scripts with `&&` ensures the backend build only runs if the frontend build succeeds.

- [ ] **4.3.6** Create `.env.example` with all required variables:
  ```bash
  # Server configuration
  PORT=3001
  CWD=/path/to/project/root

  # Authentication
  SHARED_SECRET=your-secret-here

  # API Keys (optional — can also be set per-provider)
  OPENAI_API_KEY=sk-...
  ANTHROPIC_API_KEY=sk-ant-...
  GOOGLE_API_KEY=ai-...

  # CORS (production only)
  FRONTEND_ORIGIN=http://your-domain.com
  ```

- [ ] **4.3.7** Create `src/backend/.env` (gitignored) for local development:
  ```bash
  SHARED_SECRET=dev-secret
  OPENAI_API_KEY=sk-...
  ```

- [ ] **4.3.8** Update `.gitignore`:
  ```gitignore
  # Dependencies
  node_modules/

  # Build output
  dist/

  # Environment files
  .env
  .env.local
  .env.*.local

  # OS files
  .DS_Store
  Thumbs.db

  # IDE
  .vscode/
  .idea/
  *.swp
  *.swo
  ```

- [ ] **4.3.9** Verify production build:
  ```bash
  # Build both packages
  npm run build

  # Start the server
  npm start

  # Open browser to http://localhost:3001
  # Verify:
  # - Frontend loads
  # - WebSocket connects
  # - Auth works
  # - Chat works
  # - Health check works
  ```

### Additional Info

- **SPA routing**: The catch-all route (`app.get('*', ...)`) serves `index.html` for all non-API, non-static routes. This allows Vue Router to handle client-side routing.

- **Static file caching**: Configure cache headers for static assets:
  ```typescript
  app.use(express.static(path.join(__dirname, '../../frontend/dist'), {
    maxAge: '1y',
    etag: true,
  }));
  ```

- **Environment variable loading**: Use `dotenv` to load `.env` files:
  ```typescript
  import dotenv from 'dotenv';
  dotenv.config();
  ```

- **CORS in production**: Restrict to the actual frontend origin. Don't use `*` or `localhost` in production.

- **Build order**: Frontend must be built before backend (backend serves frontend's `dist/`). Uses separate scripts with `&&` so frontend failure stops the build (Fix #13).

### Acceptance Criteria

- `npm run build` produces production-ready assets
- `npm start` serves the complete application
- Environment variables are documented in `.env.example`
- Static files are served with proper cache headers
- SPA routing works (refresh on any route loads the app)
- WebSocket connects in production mode
- Health check works in production mode

---

## Integration Notes

### How This Milestone Completes the Application

1. **Task 4.1** adds the settings panel that gives users control over model, thinking level, API keys, and session stats. This is the primary UI for configuration.

2. **Task 4.2** adds the polish that makes the application feel complete: error handling, loading states, empty states, keyboard shortcuts, and connection status.

3. **Task 4.3** configures production builds so the application can be deployed and run as a single process.

### Final Architecture

After all 4 milestones are complete, the application will:

- Run as a single Node.js process serving both the Express API and the Vue SPA
- Support browser-based chat with real-time streaming
- Provide full agent capabilities (file read/write/edit, bash, tools, extensions, skills)
- Manage sessions (create, list, resume, delete, fork, clone, navigate)
- Display tool execution, thinking output, and compaction events
- Allow model switching and thinking level control
- Persist settings across page reloads
- Handle errors gracefully with toast notifications
- Support keyboard shortcuts for common operations
- Be deployable as a self-hosted single-user application

### Testing Strategy

- **End-to-end testing** (design doc §4, Level L3):
  - Full workflow: create session → send prompt → receive streaming response → fork → switch session → delete session
  - Model switching mid-session
  - Thinking level changes
  - Compaction and retry behavior
  - Extension commands
  - Session tree navigation
  - Abort during streaming
  - Reconnection after backend restart

- **Production testing**:
  - `npm run build && npm start`
  - Open browser to `http://localhost:3001`
  - Verify all features work in production mode
  - Test with different browsers (Chrome, Firefox, Safari)

- **Security testing**:
  - Verify shared secret authentication works
  - Verify CORS is properly configured
  - Verify input validation on all WebSocket commands
  - Verify HTML sanitization (no XSS)

### Common Pitfalls

- **Build order**: Frontend must be built before backend. Uses separate scripts with `&&` so frontend failure stops the build (Fix #13).

- **CORS in production**: Don't forget to update CORS configuration for production. The development CORS (allowing `localhost:5173`) won't work in production.

- **Static file paths**: Use `path.join()` and `fileURLToPath()` for cross-platform path resolution. Don't hardcode paths.

- **Environment variables**: Document all required variables in `.env.example`. Don't commit `.env` files to git.

- **SPA routing**: The catch-all route must come AFTER all API routes. Otherwise, it will intercept API requests.

- **WebSocket in production**: WebSocket connections use `wss://` (secure) in production and `ws://` (insecure) in development. The frontend service should detect the protocol automatically.

- **Memory leaks**: Ensure all WebSocket connections, intervals, and event listeners are cleaned up on disconnect/unmount.

---

## Completion Checklist

When all milestones are complete:

- [ ] Backend starts and serves health check
- [ ] WebSocket connects with valid auth
- [ ] WebSocket rejects invalid auth
- [ ] AgentSessionRuntime creates on connect
- [ ] message_update events stream to client
- [ ] Tool execution events relay
- [ ] Abort stops agent
- [ ] Session persists to JSONL
- [ ] Session replacement works
- [ ] Compaction events relayed
- [ ] Extension commands execute
- [ ] Messages render with correct alignment
- [ ] Streaming appears in real-time
- [ ] Markdown renders correctly
- [ ] Code blocks have syntax highlighting
- [ ] Session sidebar loads and switches
- [ ] Auto-reconnect works
- [ ] Streaming indicator reflects state
- [ ] Thinking output is collapsible
- [ ] Thinking output renders markdown (Fix #8)
- [ ] Thinking output has scroll container (Fix #11)
- [ ] Model selector works
- [ ] Thinking level changes
- [ ] Model changes relayed via `model_select` WebSocket event
- [ ] Available thinking levels update on model change (Fix #4, #17)
- [ ] Extension dialogs work (Fix #1)
- [ ] Tool call deltas handled during streaming (Fix #9)
- [ ] Error deltas handled inline (Fix #15)
- [ ] Compaction tokens displayed accurately (Fix #10)
- [ ] Session switching uses full session path (Fix #12)
- [ ] Error toasts display
- [ ] Session stats display
- [ ] Production build works (frontend first, stops on failure — Fix #13)
- [ ] Keyboard shortcuts work
- [ ] All environment variables documented
- [ ] README.md is complete
