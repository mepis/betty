import {
  type AgentSession,
  type AgentSessionEvent,
} from '@earendil-works/pi-coding-agent';
import { WebSocket } from 'ws';

export class EventRelay {
  private unsubscribe: (() => void) | null = null;

  constructor(
    private session: AgentSession,
    private ws: WebSocket,
  ) {
    this.subscribe();
  }

  subscribe() {
    if (this.unsubscribe) {
      this.unsubscribe();
    }

    this.unsubscribe = this.session.subscribe((event: AgentSessionEvent) => {
      if (this.ws.readyState !== WebSocket.OPEN) return;

      switch (event.type) {
        case 'agent_start':
          this.send({ type: 'agent_start', data: {} });
          break;

        case 'agent_end':
          this.send({
            type: 'agent_end',
            data: { messages: event.messages, willRetry: event.willRetry },
          });
          break;

        case 'turn_start':
          this.send({ type: 'turn_start', data: {} });
          break;

        case 'turn_end':
          this.send({
            type: 'turn_end',
            data: { message: event.message, toolResults: event.toolResults },
          });
          break;

        case 'message_start':
          this.send({ type: 'message_start', data: { message: event.message } });
          break;

        case 'message_update':
          this.send({
            type: 'message_update',
            data: {
              message: event.message,
              assistantMessageEvent: event.assistantMessageEvent,
            },
          });
          break;

        case 'message_end':
          this.send({ type: 'message_end', data: { message: event.message } });
          break;

        case 'tool_execution_start':
          this.send({
            type: 'tool_execution_start',
            data: {
              toolCallId: event.toolCallId,
              toolName: event.toolName,
              args: event.args,
            },
          });
          break;

        case 'tool_execution_update':
          this.send({
            type: 'tool_execution_update',
            data: {
              toolCallId: event.toolCallId,
              toolName: event.toolName,
              partialResult: event.partialResult,
            },
          });
          break;

        case 'tool_execution_end':
          this.send({
            type: 'tool_execution_end',
            data: {
              toolCallId: event.toolCallId,
              toolName: event.toolName,
              result: event.result,
              isError: event.isError,
            },
          });
          break;

        case 'queue_update':
          this.send({
            type: 'queue_update',
            data: { steering: event.steering, followUp: event.followUp },
          });
          break;

        case 'compaction_start':
          this.send({ type: 'compaction_start', data: { reason: event.reason } });
          break;

        case 'compaction_end':
          this.send({
            type: 'compaction_end',
            data: {
              reason: event.reason,
              result: event.result,
              aborted: event.aborted,
              willRetry: event.willRetry,
              errorMessage: event.errorMessage,
            },
          });
          break;

        case 'auto_retry_start':
          this.send({
            type: 'auto_retry_start',
            data: {
              attempt: event.attempt,
              maxAttempts: event.maxAttempts,
              delayMs: event.delayMs,
              errorMessage: event.errorMessage,
            },
          });
          break;

        case 'auto_retry_end':
          this.send({
            type: 'auto_retry_end',
            data: {
              success: event.success,
              attempt: event.attempt,
              finalError: event.finalError,
            },
          });
          break;

        case 'session_info_changed':
          this.send({ type: 'session_info_changed', data: { name: event.name } });
          break;

        case 'thinking_level_changed':
          this.send({ type: 'thinking_level_changed', data: { level: event.level } });
          break;
      }
    });
  }

  private send(data: Record<string, unknown>) {
    if (this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(data));
      } catch {
        // Connection closing, skip
      }
    }
  }

  destroy() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }
}
