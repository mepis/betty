import { ref, computed, onMounted, onUnmounted } from 'vue';
import { WebSocketService, type WSEvent, type ConnectionStatus } from '@/services/websocket';
import { useChatStore } from '@/stores/chat';
import { useSessionStore } from '@/stores/sessions';
import { useSettingsStore } from '@/stores/settings';
import { useToast } from './useToast';

let service: WebSocketService | null = null;

export function useWebSocket() {
  const isConnected = ref(false);
  const isConnecting = ref(false);
  const connectionError = ref<string | null>(null);
  const chatStore = useChatStore();
  const sessionStore = useSessionStore();
  const settingsStore = useSettingsStore();
  const { showToast } = useToast();

  function handleEvent(event: WSEvent) {
    switch (event.type) {
      case 'agent_start':
        chatStore.startStreaming();
        break;

      case 'agent_end':
        chatStore.stopStreaming();
        if (event.data?.willRetry) {
          showToast('info', 'Retrying after compaction...');
        }
        break;

      case 'turn_start':
        // Update streaming indicator to "Working..."
        break;

      case 'turn_end':
        break;

      case 'message_start':
        chatStore.addAssistantMessage();
        break;

      case 'message_update': {
        const { type, delta, assistantMessageEvent } = (event.data as any) || {};
        const messageId = (event.data as any)?.message?.id || chatStore.currentStreamingMessageId;
        if (!messageId) break;

        if (type === 'text_delta') {
          chatStore.updateStreamingMessage(messageId, delta);
        } else if (type === 'thinking_delta') {
          chatStore.updateThinkingContent(messageId, delta);
        } else if (type === 'toolcall_delta') {
          chatStore.updateToolCallFromDelta(messageId, assistantMessageEvent);
        } else if (type === 'error') {
          const errorMsg = (assistantMessageEvent as any)?.reason || 'Streaming error';
          chatStore.updateStreamingMessage(messageId, `[Error: ${errorMsg}]`);
        }
        break;
      }

      case 'message_end':
        chatStore.completeStreamingMessage(chatStore.currentStreamingMessageId || '');
        break;

      case 'tool_execution_start': {
        const d = event.data as any;
        chatStore.startToolCall(d.toolCallId, d.toolName, d.args || {});
        break;
      }

      case 'tool_execution_update': {
        const d = event.data as any;
        chatStore.updateToolCall(d.toolCallId, d.partialResult || {});
        break;
      }

      case 'tool_execution_end': {
        const d = event.data as any;
        chatStore.completeToolCall(d.toolCallId, d.result || {}, d.isError || false);
        break;
      }

      case 'queue_update': {
        const d = event.data as any;
        chatStore.setQueueState(d.steering || [], d.followUp || []);
        break;
      }

      case 'compaction_start':
        chatStore.startCompacting();
        break;

      case 'compaction_end': {
        const d = event.data as any;
        if (d.result) {
          chatStore.stopCompacting({
            tokensBefore: d.result.tokensBefore,
            tokensAfter: d.result.tokensAfter,
          });
          if (d.result.tokensAfter !== undefined) {
            const saved = d.result.tokensBefore - d.result.tokensAfter;
            showToast('success', `Compacted: ${saved} tokens saved (${d.result.tokensBefore} → ${d.result.tokensAfter})`);
          } else {
            showToast('success', `Compacted: ${d.result.tokensBefore} tokens before compaction`);
          }
        } else if (d.aborted || d.errorMessage) {
          chatStore.stopCompacting();
          if (d.errorMessage) {
            showToast('error', `Compaction failed: ${d.errorMessage}`);
          }
        }
        break;
      }

      case 'auto_retry_start': {
        const d = event.data as any;
        chatStore.startRetry(d.attempt, d.maxAttempts);
        break;
      }

      case 'auto_retry_end': {
        const d = event.data as any;
        chatStore.stopRetry(d.success, d.finalError);
        if (d.finalError) {
          showToast('error', `Retry exhausted: ${d.finalError}`);
        }
        break;
      }

      case 'session_info': {
        const d = event.data as any;
        chatStore.setSessionInfo({
          sessionId: d.sessionId,
          model: d.model,
          thinkingLevel: d.thinkingLevel,
          sessionName: d.sessionName,
          provider: d.provider,
        });
        if (d.sessionId && d.sessionFile) {
          sessionStore.updateSessionFile(d.sessionId, d.sessionFile);
        }
        break;
      }

      case 'session_changed':
        chatStore.onSessionChanged();
        break;

      case 'session_info_changed': {
        const d = event.data as any;
        chatStore.setSessionName(d.name || '');
        break;
      }

      case 'thinking_level_changed': {
        const d = event.data as any;
        chatStore.setThinkingLevel(d.level);
        break;
      }

      case 'model_select': {
        const d = event.data as any;
        chatStore.setModel(d.model || '');
        break;
      }

      case 'extension_ui_request': {
        const d = event.data as any;
        // Emit event for App.vue to handle
        window.dispatchEvent(new CustomEvent('extension-ui-request', { detail: d }));
        break;
      }

      case 'extension_error': {
        const d = event.data as any;
        showToast('error', `Extension error: ${d.error}`);
        break;
      }

      case 'error': {
        const d = event.data as any;
        showToast('error', d.message || 'An error occurred');
        break;
      }

      case 'diagnostic': {
        const d = event.data as any;
        if (d.level === 'warning') {
          showToast('warning', d.message);
        } else if (d.level === 'error') {
          showToast('error', d.message);
        }
        break;
      }

      case 'settings_error': {
        const d = event.data as any;
        showToast('warning', `Settings error: ${d.message}`);
        break;
      }
    }
  }

  function handleStatusChange(status: ConnectionStatus) {
    isConnected.value = status === 'connected';
    isConnecting.value = status === 'connecting';
    chatStore.setConnectionState(status);

    if (status === 'error') {
      connectionError.value = 'Connection lost';
      showToast('error', 'Connection lost. Reconnecting...');
    } else if (status === 'connected') {
      connectionError.value = null;
      chatStore.onReconnect();
      // On reconnect, load messages
      sendCommand('get_messages', {}).catch(() => {});
    }
  }

  const wsUrl = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`;

  function init() {
    service = new WebSocketService(
      wsUrl,
      settingsStore.sharedSecret || 'dev-secret',
      handleEvent,
      handleStatusChange,
    );
    service.startHeartbeat();
    service.connect();
  }

  function sendCommand(type: any, payload: any) {
    if (!service) {
      return Promise.reject(new Error('WebSocket not initialized'));
    }
    return service.sendCommand(type, payload);
  }

  onMounted(() => {
    init();
  });

  onUnmounted(() => {
    service?.disconnect();
  });

  return {
    isConnected,
    isConnecting,
    connectionError,
    sendCommand,
  };
}
