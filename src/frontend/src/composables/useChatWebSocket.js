import { toast } from './useToast.js';

/**
 * Register all chat-related WebSocket event handlers.
 *
 * Takes the WebSocket composable and chat state as dependencies,
 * and wires up every `on(...)` handler that was previously inline
 * in App.vue's setupWebSocket() function.
 *
 * @param {Object} ws - WebSocket composable from useWebSocket()
 * @property {Function} ws.on - Register a handler for a specific event type
 * @param {Object} chatState - Chat state singleton from useChatState
 */
export function setupChatEventHandlers(ws, chatState) {
  const { on } = ws;

  on('agent_status', (data) => {
    if (data.status === 'running') {
      // Agent is running
    }
  });

  on('agent_start', () => {
    chatState.isStreaming.value = true;
    chatState.resetStreaming();
    // Add streaming message to the main array immediately
    const streamId = 'streaming-' + Date.now();
    chatState.streamingMsgId.value = streamId;
    chatState.messages.value.push({
      id: streamId,
      role: 'assistant',
      content: '',
      thinking: '',
      toolCalls: [],
      isStreaming: true,
      timestamp: new Date().toISOString(),
    });
  });

  on('agent_end', (data) => {
    chatState.isStreaming.value = false;
    chatState.completeStreaming();

    // Remove temporary tool execution messages (they'll be replaced by final messages)
    chatState.messages.value = chatState.messages.value.filter(m => !m.id.startsWith('tool-'));
    chatState.pendingToolCalls.value.clear();

    // Finalize the streaming message in the array
    if (chatState.streamingMsgId.value) {
      const streamMsg = chatState.messages.value.find(m => m.id === chatState.streamingMsgId.value);
      if (streamMsg) {
        streamMsg.isStreaming = false;
        // If agent_end provided the final message with a real ID, replace the streaming one
        if (data.messages && data.messages.length > 0) {
          const finalMsg = data.messages[data.messages.length - 1];
          if (finalMsg && finalMsg.role === 'assistant' && finalMsg.id !== chatState.streamingMsgId.value) {
            // Replace streaming message with the final one
            const idx = chatState.messages.value.findIndex(m => m.id === chatState.streamingMsgId.value);
            if (idx >= 0) {
              chatState.messages.value[idx] = finalMsg;
            }
          }
        }
      }
      chatState.streamingMsgId.value = null;
    }

    // Add any additional messages from the agent
    if (data.messages) {
      for (const msg of data.messages) {
        if (msg.role === 'user') continue;
        if (!chatState.hasMessageById(msg.id)) {
          chatState.messages.value.push(msg);
        }
      }
      // Update current session metadata
      if (chatState.activeSessionId.value) {
        const session = chatState.sessions.value.find(s => s.id === chatState.activeSessionId.value);
        if (session) {
          session.messageCount = (session.messageCount || 0) + (data.messages?.length || 0);
          session.updatedAt = Date.now();
        }
      }
    }
    // Refresh context stats after each agent turn
    if (chatState._boundActions) {
      chatState._boundActions.fetchSessionStats();
    }
  });

  on('message_update', (data) => {
    const evt = data.assistantMessageEvent;
    if (!evt) return;

    // Update the streaming message in the main array
    if (chatState.streamingMsgId.value) {
      const streamMsg = chatState.messages.value.find(m => m.id === chatState.streamingMsgId.value);
      if (!streamMsg) return;

      if (evt.type === 'text_delta') {
        chatState.appendDelta(evt.delta);
        streamMsg.content = chatState.streamingText.value;
      }
      if (evt.type === 'thinking_delta') {
        chatState.appendThinkingDelta(evt.delta);
        streamMsg.thinking = chatState.streamingThinking.value;
      }
    }
  });

  on('message_end', () => {
    // Streaming content is done being received; finalize pacing
    chatState.completeStreaming();
    if (chatState.streamingMsgId.value) {
      const streamMsg = chatState.messages.value.find(m => m.id === chatState.streamingMsgId.value);
      if (streamMsg) {
        // Ensure final content is set
        streamMsg.content = chatState.streamingText.value;
        streamMsg.thinking = chatState.streamingThinking.value;
      }
    }
  });

  // ─── Tool Execution Events (real-time tool call display) ───
  on('tool_execution_start', (data) => {
    const streamMsg = chatState.messages.value.find(m => m.id === chatState.streamingMsgId.value);
    if (streamMsg) {
      streamMsg.toolCalls.push({
        toolCallId: data.toolCallId,
        name: data.toolName,
        args: data.args || {},
        status: 'running',
        result: undefined,
        details: undefined,
        isError: false,
      });
      streamMsg.toolCalls = [...streamMsg.toolCalls]; // trigger reactivity
    }
    chatState.pendingToolCalls.value.set(data.toolCallId, {
      name: data.toolName,
      args: data.args || {},
      status: 'running',
      result: undefined,
    });
  });

  on('tool_execution_update', (data) => {
    const streamMsg = chatState.messages.value.find(m => m.id === chatState.streamingMsgId.value);
    if (streamMsg) {
      const tc = streamMsg.toolCalls.find(t => t.toolCallId === data.toolCallId);
      if (tc && data.partialResult) {
        tc.result = data.partialResult.content || '';
        tc.details = data.partialResult.details;
        tc.status = 'running';
        streamMsg.toolCalls = [...streamMsg.toolCalls]; // trigger reactivity
      }
    }
    if (chatState.pendingToolCalls.value.has(data.toolCallId)) {
      chatState.pendingToolCalls.value.get(data.toolCallId).result = data.partialResult;
    }
  });

  on('tool_execution_end', (data) => {
    const streamMsg = chatState.messages.value.find(m => m.id === chatState.streamingMsgId.value);
    if (streamMsg) {
      const tc = streamMsg.toolCalls.find(t => t.toolCallId === data.toolCallId);
      if (tc) {
        tc.result = data.result?.content || '';
        tc.details = data.result?.details;
        tc.isError = data.isError || false;
        tc.status = data.isError ? 'error' : 'completed';
        streamMsg.toolCalls = [...streamMsg.toolCalls]; // trigger reactivity
      }
    }
    if (chatState.pendingToolCalls.value.has(data.toolCallId)) {
      const tc = chatState.pendingToolCalls.value.get(data.toolCallId);
      tc.result = data.result;
      tc.status = data.isError ? 'error' : 'completed';
    }
  });

  on('messages', (data) => {
    chatState.messages.value = data.messages || [];
  });

  on('state', (data) => {
    if (data.state) {
      const model = data.state.model;
      if (model) {
        chatState.currentModel.value = model;
        chatState.selectedModelId.value = model.id;
      }
      if (data.state.thinkingLevel) {
        chatState.thinkingLevel.value = data.state.thinkingLevel;
      }
    }
  });

  on('models', (data) => {
    chatState.models.value = data.models || [];
  });

  on('model_set', (data) => {
    if (data.data) {
      chatState.currentModel.value = data.data;
      chatState.selectedModelId.value = data.data.id;
    }
  });

  on('thinking_level_set', () => {});

  on('commands', (data) => {
    chatState.availableCommands.value = (data.commands || []).map(cmd => ({
      name: cmd.name || cmd,
      description: cmd.description || '',
      icon: cmd.icon || '⚡',
    }));
  });

  on('fork_messages', (data) => {
    chatState.showForkList(data.messages);
  });

  on('session_new', (data) => {
    chatState.messages.value = [];
    chatState.resetStreaming();
    chatState.streamingMsgId.value = null;
    chatState.pendingToolCalls.value.clear();
    if (data.sessionId) {
      chatState.activeSessionId.value = data.sessionId;
      // Add new session to the list
      const newSession = {
        id: data.sessionId,
        name: data.sessionName || `Session ${new Date().toLocaleString()}`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messageCount: 0,
      };
      chatState.sessions.value = [newSession, ...chatState.sessions.value];
    }
    toast('New session started', 'success');
  });

  on('sessions_list', (data) => {
    chatState.sessions.value = data.sessions || [];
  });

  on('session_switched', (data) => {
    chatState.activeSessionId.value = data.sessionId;
    chatState.messages.value = data.messages || [];
    chatState.resetStreaming();
    chatState.streamingMsgId.value = null;
    toast('Session switched', 'info');
  });

  on('session_deleted', (data) => {
    chatState.sessions.value = chatState.sessions.value.filter(s => s.id !== data.sessionId);
    toast('Session deleted', 'info');
  });

  on('session_renamed', (data) => {
    const idx = chatState.sessions.value.findIndex(s => s.id === data.session.id);
    if (idx >= 0) {
      chatState.sessions.value[idx] = data.session;
    }
  });

  on('compacted', () => {
    toast('Context compacted', 'success');
    if (chatState._boundActions) {
      chatState._boundActions.fetchSessionStats();
    }
  });

  on('session_stats', (data) => {
    if (data.data && data.data.contextUsage) {
      chatState.contextTokens.value = data.data.contextUsage.tokens;
      chatState.contextLimit.value = data.data.contextUsage.contextWindow;
    }
  });

  on('html_exported', (data) => {
    if (data.data && data.data.path) {
      toast(`Exported to: ${data.data.path}`, 'success');
    }
  });

  on('agent_exit', (data) => {
    toast(`Agent exited (code: ${data.code})`, 'error');
  });

  on('agent_error', (data) => {
    toast(`Agent error: ${data.message}`, 'error');
  });

  on('extension_ui_request', (data) => {
    if (chatState._sendFn) {
      chatState.handleExtensionUI(data, chatState._sendFn);
    }
  });

  on('error', (data) => {
    toast(data.message, 'error');
  });
}
