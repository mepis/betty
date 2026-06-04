import {
  type AgentSessionRuntime,
  type ModelRegistry,
} from '@earendil-works/pi-coding-agent';
import { WebSocket } from 'ws';

export interface WSCommand {
  type: string;
  payload?: Record<string, unknown>;
}

export class CommandHandler {
  private authenticated = false;

  constructor(
    private runtime: AgentSessionRuntime,
    private ws: WebSocket,
    private modelRegistry: ModelRegistry,
    private pendingDialogs: Map<string, { resolve: Function; reject: Function }>,
  ) {}

  async handleCommand(command: WSCommand) {
    const { type, payload = {} } = command;

    // Auth command (first message only)
    if (type === 'auth') {
      const { secret } = payload as { secret: string };
      const expectedSecret = process.env.SHARED_SECRET;
      if (!expectedSecret || secret !== expectedSecret) {
        this.ws.close(4011, 'Authentication failed');
        return;
      }
      this.authenticated = true;
      this.ws.send(JSON.stringify({ type: 'auth_success', data: {} }));
      return;
    }

    // Require auth for all other commands
    if (!this.authenticated) {
      this.ws.close(4001, 'Authentication required');
      return;
    }

    try {
      switch (type) {
        case 'prompt': {
          const { text, streamingBehavior } = payload as {
            text: string;
            streamingBehavior?: 'steer' | 'followUp';
          };
          if (!text) {
            this.sendError('Prompt text is required');
            return;
          }
          await this.runtime.session.prompt(text, {
            streamingBehavior,
            source: 'rpc' as any,
          });
          break;
        }

        case 'abort': {
          await this.runtime.session.abort();
          break;
        }

        case 'new_session': {
          const result = await this.runtime.newSession();
          this.sendResponse('new_session', { cancelled: result.cancelled });
          break;
        }

        case 'switch_session': {
          const { sessionPath, cwdOverride } = payload as {
            sessionPath: string;
            cwdOverride?: string;
          };
          if (!sessionPath) {
            this.sendError('sessionPath is required');
            return;
          }
          const result = cwdOverride
            ? await this.runtime.switchSession(sessionPath, { cwdOverride })
            : await this.runtime.switchSession(sessionPath);
          this.sendResponse('switch_session', { cancelled: result.cancelled });
          break;
        }

        case 'fork': {
          const { entryId, position } = payload as {
            entryId: string;
            position?: 'before' | 'at';
          };
          if (!entryId) {
            this.sendError('entryId is required');
            return;
          }
          const result = await this.runtime.fork(entryId, {
            position: position || 'before',
          });
          this.sendResponse('fork', {
            cancelled: result.cancelled,
            text: (result as any).selectedText,
          });
          break;
        }

        case 'clone': {
          const leafId = this.runtime.session.sessionManager.getLeafId();
          if (!leafId) {
            this.sendError('No active branch to clone');
            return;
          }
          const result = await this.runtime.fork(leafId, { position: 'at' });
          this.sendResponse('clone', { cancelled: result.cancelled });
          break;
        }

        case 'navigate_tree': {
          const { targetId, summarize, customInstructions, replaceInstructions, label } =
            payload as {
              targetId: string;
              summarize?: boolean;
              customInstructions?: string;
              replaceInstructions?: boolean;
              label?: string;
            };
          if (!targetId) {
            this.sendError('targetId is required');
            return;
          }
          const result = await this.runtime.session.navigateTree(targetId, {
            summarize,
            customInstructions,
            replaceInstructions,
            label,
          });
          this.sendResponse('navigate_tree', {
            editorText: (result as any).editorText,
            cancelled: result.cancelled,
          });
          break;
        }

        case 'set_session_name': {
          const { name } = payload as { name: string };
          if (!name) {
            this.sendError('name is required');
            return;
          }
          this.runtime.session.setSessionName(name);
          this.sendResponse('set_session_name', {});
          break;
        }

        case 'get_fork_messages': {
          const messages = this.runtime.session.getUserMessagesForForking();
          this.sendResponse('get_fork_messages', { messages });
          break;
        }

        case 'get_messages': {
          const sdkMessages = this.runtime.session.messages;
          const transformed = sdkMessages.map((msg: any) => transformMessage(msg));
          this.sendResponse('get_messages', { messages: transformed });
          break;
        }

        case 'get_last_assistant_text': {
          const text = this.runtime.session.getLastAssistantText();
          this.sendResponse('get_last_assistant_text', { text: text || null });
          break;
        }

        case 'set_model': {
          const { provider, modelId } = payload as { provider: string; modelId: string };
          if (!provider || !modelId) {
            this.sendError('provider and modelId are required');
            return;
          }
          const model = this.modelRegistry.find(provider, modelId);
          if (!model) {
            this.sendResponse('set_model', {
              success: false,
              error: `Model not found: ${provider}/${modelId}`,
            });
            return;
          }
          await this.runtime.session.setModel(model);
          this.sendResponse('set_model', { model: { id: model.id, provider: model.provider } });
          break;
        }

        case 'set_thinking_level': {
          const { level } = payload as { level: string };
          if (!level) {
            this.sendError('level is required');
            return;
          }
          this.runtime.session.setThinkingLevel(level as any);
          this.sendResponse('set_thinking_level', {});
          break;
        }

        case 'compact': {
          const { customInstructions } = payload as { customInstructions?: string };
          const result = await this.runtime.session.compact(customInstructions);
          this.sendResponse('compact', {
            summary: result.summary,
            firstKeptEntryId: result.firstKeptEntryId,
            tokensBefore: result.tokensBefore,
            details: result.details,
          });
          break;
        }

        case 'extension_ui_response': {
          const { id, value, confirmed, cancelled } = payload as {
            id: string;
            value?: string;
            confirmed?: boolean;
            cancelled?: boolean;
          };

          const pending = this.pendingDialogs.get(id);
          if (pending) {
            if (cancelled) {
              pending.reject(new Error('Dialog cancelled'));
            } else {
              // Determine response based on dialog type
              // For select/input: return value
              // For confirm: return confirmed
              pending.resolve({ value, confirmed: confirmed ?? false });
            }
            this.pendingDialogs.delete(id);
          }

          this.sendResponse('extension_ui_response', {});
          break;
        }

        default:
          this.sendError(`Unknown command: ${type}`);
      }
    } catch (err: any) {
      // Handle streaming-related errors
      if (err.message?.includes('streaming') || err.code === 'STREAMING_IN_PROGRESS') {
        this.sendError(
          'Please use "steer" or "followUp" streaming behavior while the agent is active.',
        );
      } else {
        this.sendError(err.message || 'Command failed');
      }
    }
  }

  private sendResponse(command: string, data: Record<string, unknown>) {
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: 'response',
          command,
          success: true,
          data,
        }),
      );
    }
  }

  private sendError(message: string) {
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: 'response',
          command: 'unknown',
          success: false,
          error: message,
        }),
      );
    }
  }
}

function transformMessage(msg: any): any {
  let content = '';
  const toolCalls: any[] = [];
  let thinkingContent = '';

  const evt = msg.assistantMessageEvent;
  if (evt) {
    // Assemble text from text deltas
    if (evt.textDeltas) {
      content = evt.textDeltas.join('');
    }
    // Extract tool calls from toolcall deltas
    if (evt.toolcallDeltas) {
      evt.toolcallDeltas.forEach((tc: any) => {
        toolCalls.push({
          id: tc.toolCallId || `tc_${toolCalls.length}`,
          name: tc.toolName || 'unknown',
          args: tc.args || {},
          status: tc.status || 'running',
        });
      });
    }
    // Extract thinking content
    if (evt.thinkingDeltas) {
      thinkingContent = evt.thinkingDeltas.join('');
    }
  }

  return {
    id: msg.id || crypto.randomUUID(),
    role: msg.role === 'user' ? 'user' : 'assistant',
    content,
    timestamp: msg.timestamp || Date.now(),
    toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
    thinkingContent: thinkingContent || undefined,
  };
}
