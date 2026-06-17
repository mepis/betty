import { ref, watch } from 'vue';
import { createMessageStreaming } from './useStreaming.js';
import { hasMessageById } from './useMessageStore.js';

/**
 * Module singleton holding all chat-related reactive state and actions.
 * Extracted from App.vue to decouple chat logic from the root component.
 *
 * @module useChatState
 */

// ─── State refs ──────────────────────────────────────────────────────────

/** @type {import('../types.js').ChatMessage[]} */
const messages = ref([]);

/** Whether the agent is currently streaming a response */
const isStreaming = ref(false);

/** ID of the message currently being streamed */
const streamingMsgId = ref(null);

/** Dual-stream pacing manager (text + thinking) for the active message */
const {
  displayText: streamingText,
  thinkingText: streamingThinking,
  appendDelta,
  appendThinkingDelta,
  complete: completeStreaming,
  reset: resetStreaming,
} = createMessageStreaming();

/** Pending tool calls keyed by toolCallId */
const pendingToolCalls = ref(new Map());

/** @type {import('../types.js').Session[]} */
const sessions = ref([]);

/** @type {string} */
const activeSessionId = ref('');

/** @type {import('../types.js').ModelInfo[]} */
const models = ref([]);

/** @type {import('../types.js').ModelInfo|null} */
const currentModel = ref(null);

/** @type {string} */
const selectedModelId = ref('');

/** @type {string} */
const thinkingLevel = ref('medium');

/** @type {string} */
const workspace = ref('');

/** @type {Array<{name: string, description: string, icon: string}>} */
const availableCommands = ref([]);

/** @type {number|null} */
const contextTokens = ref(null);

/** @type {number|null} */
const contextLimit = ref(null);

// ─── Watchers ────────────────────────────────────────────────────────────

// Keep the streaming message's content in sync with the paced display text.
// The pacing loop updates streamingText/streamingThinking asynchronously via
// setTimeout, so we need watchers to propagate those changes back into the
// message object that ChatMessage renders.
watch(streamingText, (text) => {
  if (!streamingMsgId.value) return;
  const streamMsg = messages.value.find(m => m.id === streamingMsgId.value);
  if (streamMsg) streamMsg.content = text;
});

watch(streamingThinking, (thinking) => {
  if (!streamingMsgId.value) return;
  const streamMsg = messages.value.find(m => m.id === streamingMsgId.value);
  if (streamMsg) streamMsg.thinking = thinking;
});

// ─── Helpers ─────────────────────────────────────────────────────────────

/**
 * Show a fork-point selection prompt to the user.
 * @param {Array<{entryId: string, text: string}>} forkPts
 */
function showForkList(forkPts) {
  if (!forkPts || forkPts.length === 0) {
    _toast && _toast('No fork points available', 'info');
    return;
  }
  const entryIds = forkPts.map(m => `${m.entryId} - ${(m.text || '').slice(0, 40)}`).join('\n');
  const entryId = prompt(`Available fork points:\n${entryIds}\n\nEnter an entry ID to fork from:`, forkPts[0].entryId);
  if (entryId) {
    // Will be called with a bound `send` from the consumer
    chatState._onForkSelected(entryId.trim());
  }
}

/**
 * Handle extension UI requests from the agent.
 * @param {Object} req - Extension UI request
 * @param {Function} send - WebSocket send function
 */
function handleExtensionUI(req, send) {
  switch (req.method) {
    case 'select': {
      const optionsStr = req.options.join('\n');
      const selected = prompt(`${req.title || 'Select'}\n\nOptions:\n${optionsStr}\n\nEnter your choice:`, req.options[0]);
      send({ type: 'extension_ui_response', id: req.id, value: selected || req.options[0] });
      break;
    }
    case 'confirm': {
      const confirmed = confirm(`${req.title || 'Confirm'}\n\n${req.message || ''}`);
      send({ type: 'extension_ui_response', id: req.id, confirmed });
      break;
    }
    case 'input': {
      const inputValue = prompt(req.title || 'Input', req.placeholder || '');
      if (inputValue !== null) {
        send({ type: 'extension_ui_response', id: req.id, value: inputValue });
      } else {
        send({ type: 'extension_ui_response', id: req.id, cancelled: true });
      }
      break;
    }
    case 'editor': {
      const editorValue = prompt(`${req.title || 'Editor'}\n\n(Paste your text below. Press Cancel to abort.):`, req.prefill || '');
      if (editorValue !== null) {
        send({ type: 'extension_ui_response', id: req.id, value: editorValue });
      } else {
        send({ type: 'extension_ui_response', id: req.id, cancelled: true });
      }
      break;
    }
    case 'notify':
      _toast && _toast(req.message || '', req.notifyType || 'info');
      break;
    case 'setStatus':
      if (req.statusText) _toast && _toast(`[${req.statusKey}] ${req.statusText}`, 'info');
      break;
    case 'setWidget':
      if (req.widgetLines) _toast && _toast(`[${req.widgetKey}] ${req.widgetLines.join(', ')}`, 'info');
      break;
    case 'set_editor_text':
      // Would need ref to input
      break;
  }
}

// ─── Actions (accept `send` as dependency) ──────────────────────────────

/**
 * Send a user message to the agent.
 * @param {{text: string, images: Array<{dataUrl: string}>}} payload
 * @param {Function} send - WebSocket send function
 * @param {import('vue').Ref<boolean>} connected - connection state ref
 */
function sendMessage({ text, images }, send, connected) {
  if ((!text && !images.length) || !send || !connected.value) return;

  // Show user message immediately
  const msgId = 'msg-' + Date.now();
  const trackingContent = [];
  if (images.length > 0) {
    for (const img of images) {
      trackingContent.push({ type: 'image', imageUrl: img.dataUrl });
    }
  }
  if (text) {
    trackingContent.push({ type: 'text', text });
  }
  messages.value.push({ id: msgId, role: 'user', content: trackingContent, timestamp: new Date().toISOString() });

  const imagesData = images.map(img => {
    const commaIdx = img.dataUrl.indexOf(',');
    const prefix = img.dataUrl.slice(0, commaIdx);
    const base64Data = img.dataUrl.slice(commaIdx + 1);
    const mimeMatch = prefix.match(/data:([^;]+)/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    return { type: 'image', mimeType, data: base64Data };
  });

  const sendMsg = { type: 'prompt', message: text };
  if (imagesData.length > 0) {
    sendMsg.images = imagesData;
  }
  send(sendMsg);
}

/**
 * Abort the current streaming response.
 * @param {Function} send - WebSocket send function
 */
function abortStream(send) {
  if (!send) return;
  send({ type: 'abort' });
  isStreaming.value = false;
  resetStreaming();
  // Remove the streaming message and temporary tool messages from the array
  if (streamingMsgId.value) {
    messages.value = messages.value.filter(m => m.id !== streamingMsgId.value && !m.id.startsWith('tool-'));
    streamingMsgId.value = null;
  }
  pendingToolCalls.value.clear();
  _toast && _toast('Aborted', 'info');
}

/**
 * Start a new session.
 * @param {Function} send - WebSocket send function
 */
function newSession(send) {
  send({ type: 'new_session' });
}

/**
 * Switch to an existing session.
 * @param {string} sessionId
 * @param {Function} send - WebSocket send function
 * @param {import('vue').Ref<boolean>} connected
 */
function switchSession(sessionId, send, connected) {
  if (!connected.value) {
    _toast && _toast('Not connected', 'error');
    return;
  }
  send({ type: 'switch_session', sessionId });
}

/**
 * Delete a session after confirmation.
 * @param {string} sessionId
 * @param {Function} send - WebSocket send function
 */
function deleteSession(sessionId, send) {
  const session = sessions.value.find(s => s.id === sessionId);
  if (!session) return;
  if (!confirm(`Delete "${session.name}"?`)) return;
  send({ type: 'delete_session', sessionId });
}

/**
 * Load the session list from the server.
 * @param {Function} send - WebSocket send function
 */
function loadSessions(send) {
  send({ type: 'list_sessions' });
}

/**
 * Request fork points from the server.
 * @param {Function} send - WebSocket send function
 */
function forkSession(send) {
  send({ type: 'get_fork_messages' });
}

/**
 * Compact the current session context.
 * @param {Function} send - WebSocket send function
 */
function compactSession(send) {
  const instructions = prompt('Custom compaction instructions (optional, press Cancel to skip):');
  if (instructions !== null) {
    send({ type: 'compact', customInstructions: instructions || undefined });
  }
}

/**
 * Export current session as HTML.
 * @param {Function} send - WebSocket send function
 */
function exportHtml(send) {
  send({ type: 'export_html' });
}

/**
 * Change the active model.
 * @param {{provider: string, modelId: string}} model
 * @param {Function} send - WebSocket send function
 */
function changeModel({ provider, modelId }, send) {
  send({ type: 'set_model', provider, modelId });
}

/**
 * Change the thinking level.
 * @param {string} level
 * @param {Function} send - WebSocket send function
 */
function changeThinkingLevel(level, send) {
  thinkingLevel.value = level;
  send({ type: 'set_thinking_level', level });
}

/**
 * Handle a command selection.
 * @param {string} name
 * @param {Function} send - WebSocket send function
 */
function selectCommand(name, send) {
  switch (name) {
    case 'help':
      _toast && _toast('Type / to open the command palette. Enter=Send, Shift+Enter=New line, Esc=Abort, Ctrl+D=Disconnect', 'info');
      break;
    case 'shortcuts':
      _toast && _toast('Enter=Send, Shift+Enter=New line, Esc=Abort, Ctrl+D=Disconnect, /=Command palette', 'info');
      break;
    case 'clear':
      messages.value = [];
      _toast && _toast('Session cleared', 'success');
      break;
    case 'compact':
      compactSession(send);
      break;
    case 'export':
      exportHtml(send);
      break;
    case 'new':
      newSession(send);
      break;
    default:
      send({ type: 'prompt', message: `/${name}` });
  }
}

/**
 * Fetch session statistics (context usage).
 * @param {Function} send - WebSocket send function
 */
function fetchSessionStats(send) {
  send({ type: 'get_session_stats' });
}

// ─── Public API ──────────────────────────────────────────────────────────

// Dependency-injected toast (set by consumer via bindToast)
let _toast = null;

/**
 * The chat state singleton.
 * All refs and actions are exposed for use by App.vue, WebSocket handlers, etc.
 */
const chatState = {
  // State refs
  messages,
  isStreaming,
  streamingMsgId,
  streamingText,
  streamingThinking,
  pendingToolCalls,
  sessions,
  activeSessionId,
  models,
  currentModel,
  selectedModelId,
  thinkingLevel,
  workspace,
  availableCommands,
  contextTokens,
  contextLimit,

  // Streaming helpers
  appendDelta,
  appendThinkingDelta,
  completeStreaming,
  resetStreaming,

  // Actions (curried — accept `send` at call time)
  sendMessage,
  abortStream,
  newSession,
  switchSession,
  deleteSession,
  loadSessions,
  forkSession,
  compactSession,
  exportHtml,
  changeModel,
  changeThinkingLevel,
  selectCommand,
  fetchSessionStats,

  // Helpers
  showForkList,
  handleExtensionUI,

  // Internal: called when user selects a fork point
  _onForkSelected: null, // set by consumer

  /**
   * Bind the toast function.
   * @param {Function} t
   */
  bindToast(t) {
    _toast = t;
  },

  /**
   * Bind the WebSocket `send` function to all actions.
   * Returns a new object with all actions pre-bound to `send`.
   * @param {Function} send
   * @param {import('vue').Ref<boolean>} [connected]
   * @returns {Object} Bound actions
   */
  bindSend(send, connected) {
    return {
      sendMessage: (payload) => sendMessage(payload, send, connected || ref(true)),
      abortStream: () => abortStream(send),
      newSession: () => newSession(send),
      switchSession: (sessionId) => switchSession(sessionId, send, connected || ref(true)),
      deleteSession: (sessionId) => deleteSession(sessionId, send),
      loadSessions: () => loadSessions(send),
      forkSession: () => forkSession(send),
      compactSession: () => compactSession(send),
      exportHtml: () => exportHtml(send),
      changeModel: (model) => changeModel(model, send),
      changeThinkingLevel: (level) => changeThinkingLevel(level, send),
      selectCommand: (name) => selectCommand(name, send),
      fetchSessionStats: () => fetchSessionStats(send),
    };
  },

  /**
   * Check if a message with the given ID exists.
   * @param {string} id
   * @returns {boolean}
   */
  hasMessageById(id) {
    return hasMessageById(messages.value, id);
  },
};

export { chatState };
