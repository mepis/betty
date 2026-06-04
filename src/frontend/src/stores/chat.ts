import { defineStore } from 'pinia';

export interface ToolCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
  status: 'running' | 'completed' | 'error';
  result?: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  streaming?: boolean;
  toolCalls?: ToolCall[];
  thinkingContent?: string;
}

export const useChatStore = defineStore('chat', {
  state: () => ({
    // Connection state
    connectionState: 'disconnected' as 'disconnected' | 'connecting' | 'connected' | 'error',
    connectionError: null as string | null,

    // Messages
    messages: [] as Message[],
    currentSessionId: null as string | null,
    autoScroll: true,

    // Session info
    currentModel: null as string | null,
    currentModelProvider: null as string | null,
    currentThinkingLevel: 'off' as string,
    currentSessionName: null as string | null,

    // Streaming state
    isStreaming: false,
    isCompacting: false,
    retryAttempt: 0,
    retryMax: 0,
    lastCompactionResult: null as { tokensBefore: number; tokensAfter?: number } | null,
    sessionStats: null as { tokensUsed: number; cost: number; contextPercentage: number } | null,
    availableThinkingLevels: [] as string[],

    // Queue state
    pendingSteerMessages: 0,
    pendingFollowUpMessages: 0,

    // Current streaming message ID
    currentStreamingMessageId: null as string | null,

    // Event queue for reconnection
    eventQueue: [] as string[],
  }),

  getters: {
    hasMessages: (state) => state.messages.length > 0,
    lastMessage: (state) => state.messages[state.messages.length - 1] || null,
    isIdle: (state) => !state.isStreaming && !state.isCompacting,
    streamingIndicator: (state) => {
      if (state.isCompacting) return { text: 'Compacting conversation...', type: 'compacting' };
      if (state.retryAttempt > 0) return { text: `Retrying (${state.retryAttempt}/${state.retryMax})...`, type: 'retrying' };
      if (state.isStreaming) return { text: 'Working...', type: 'working' };
      return null;
    },
  },

  actions: {
    // Connection actions
    setConnectionState(state: 'disconnected' | 'connecting' | 'connected' | 'error') {
      this.connectionState = state;
    },

    setConnectionError(error: string | null) {
      this.connectionError = error;
    },

    // Message actions
    addUserMessage(text: string) {
      const msg: Message = {
        id: crypto.randomUUID(),
        role: 'user',
        content: text,
        timestamp: Date.now(),
      };
      this.messages.push(msg);
    },

    addAssistantMessage() {
      const msg: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
        streaming: true,
      };
      this.messages.push(msg);
      this.currentStreamingMessageId = msg.id;
      return msg.id;
    },

    updateStreamingMessage(id: string, delta: string) {
      const msg = this.messages.find((m) => m.id === id);
      if (msg) {
        msg.content += delta;
        msg.streaming = true;
      }
    },

    updateThinkingContent(id: string, delta: string) {
      const msg = this.messages.find((m) => m.id === id);
      if (msg) {
        if (!msg.thinkingContent) msg.thinkingContent = '';
        msg.thinkingContent += delta;
      }
    },

    completeStreamingMessage(id: string) {
      const msg = this.messages.find((m) => m.id === id);
      if (msg) {
        msg.streaming = false;
      }
      this.currentStreamingMessageId = null;
    },

    // Tool call actions
    startToolCall(toolCallId: string, toolName: string, args: Record<string, unknown>) {
      // Find the current streaming assistant message
      const msg = this.messages.find((m) => m.id === this.currentStreamingMessageId);
      if (msg) {
        if (!msg.toolCalls) msg.toolCalls = [];
        msg.toolCalls.push({
          id: toolCallId,
          name: toolName,
          args,
          status: 'running',
        });
      }
    },

    updateToolCall(toolCallId: string, partialResult: object) {
      for (const msg of this.messages) {
        if (msg.toolCalls) {
          const tc = msg.toolCalls.find((t) => t.id === toolCallId);
          if (tc) {
            tc.result = JSON.stringify(partialResult, null, 2);
          }
        }
      }
    },

    completeToolCall(toolCallId: string, result: object, isError: boolean) {
      for (const msg of this.messages) {
        if (msg.toolCalls) {
          const tc = msg.toolCalls.find((t) => t.id === toolCallId);
          if (tc) {
            tc.result = JSON.stringify(result, null, 2);
            tc.status = isError ? 'error' : 'completed';
          }
        }
      }
    },

    updateToolCallFromDelta(messageId: string, assistantMessageEvent: any) {
      const msg = this.messages.find((m) => m.id === messageId);
      if (!msg || !assistantMessageEvent?.toolCall) return;

      const tc = assistantMessageEvent.toolCall;
      if (!msg.toolCalls) msg.toolCalls = [];

      let toolCall = msg.toolCalls.find((t) => t.id === tc.toolCallId);
      if (!toolCall) {
        toolCall = {
          id: tc.toolCallId || `tc_${msg.toolCalls.length}`,
          name: tc.toolName || 'unknown',
          args: {},
          status: 'running',
        };
        msg.toolCalls.push(toolCall);
      }

      if (tc.args !== undefined) {
        toolCall.args = tc.args;
      }
    },

    // Session actions
    setSessionInfo(info: { sessionId: string; model: string; thinkingLevel: string; sessionName?: string; provider?: string }) {
      this.currentSessionId = info.sessionId;
      this.currentModel = info.model;
      this.currentModelProvider = info.provider || null;
      this.currentThinkingLevel = info.thinkingLevel;
      if (info.sessionName !== undefined) {
        this.currentSessionName = info.sessionName;
      }
    },

    setModel(model: string) {
      this.currentModel = model;
    },

    setThinkingLevel(level: string) {
      this.currentThinkingLevel = level;
    },

    setAvailableThinkingLevels(levels: string[]) {
      this.availableThinkingLevels = levels;
    },

    setSessionName(name: string) {
      this.currentSessionName = name;
    },

    // Streaming state actions
    startStreaming() {
      this.isStreaming = true;
    },

    stopStreaming() {
      this.isStreaming = false;
      this.completeStreamingMessage(this.currentStreamingMessageId || '');
    },

    startCompacting() {
      this.isCompacting = true;
    },

    stopCompacting(result?: { tokensBefore: number; tokensAfter?: number }) {
      this.isCompacting = false;
      if (result) {
        this.lastCompactionResult = result;
      }
    },

    startRetry(attempt: number, maxAttempts: number) {
      this.retryAttempt = attempt;
      this.retryMax = maxAttempts;
    },

    stopRetry(success: boolean, finalError?: string) {
      this.retryAttempt = 0;
      this.retryMax = 0;
    },

    // Queue actions
    setQueueState(steering: string[], followUp: string[]) {
      this.pendingSteerMessages = steering.length;
      this.pendingFollowUpMessages = followUp.length;
    },

    // Session change (reset state)
    onSessionChanged() {
      this.messages = [];
      this.isStreaming = false;
      this.isCompacting = false;
      this.retryAttempt = 0;
      this.retryMax = 0;
      this.lastCompactionResult = null;
      this.currentStreamingMessageId = null;
      this.pendingSteerMessages = 0;
      this.pendingFollowUpMessages = 0;
    },

    // Reconnection
    onReconnect() {
      // State is preserved, just update connection status
      this.setConnectionState('connected');
    },

    // Load messages from backend (for reconnection/switch)
    loadMessages(transformedMessages: Message[]) {
      this.messages = transformedMessages;
    },
  },
});
