import {
  WebSocket as WS,
  type WebSocketServer,
} from 'ws';
import type { IncomingMessage } from 'http';
import { createRuntime, type RuntimeOptions } from '../agent/runtime.js';
import { EventRelay } from '../agent/event-relay.js';
import { CommandHandler } from '../agent/command-handler.js';
import { setupHeartbeat } from './heartbeat.js';
import { isValidWSMessage } from './protocol.js';
import {
  type ExtensionUIContext,
  type ExtensionError,
  type ExtensionUIDialogOptions,
  type WorkingIndicatorOptions,
  type ExtensionWidgetOptions,
} from '@earendil-works/pi-coding-agent';
import { ModelRegistry, AuthStorage, SettingsManager } from '@earendil-works/pi-coding-agent';

// Extended WebSocket type with custom properties
interface ExtendedWebSocket extends WS {
  authenticated: boolean;
  heartbeatInterval: ReturnType<typeof setInterval> | null;
  runtime: any;
  eventRelay: EventRelay | null;
  settingsErrorInterval: ReturnType<typeof setInterval> | null;
  pendingExtensionResponses: Map<string, { resolve: Function; reject: Function }>;
  isAlive: boolean;
  commandHandler: CommandHandler | null;
}

export interface WebSocketHandlerOptions {
  wss: WebSocketServer;
  secret: string;
  runtimeOptions?: RuntimeOptions;
}

export class WebSocketHandler {
  private activeConnections = new Map<WS, ConnectionInfo>();
  private authStorage: AuthStorage;
  private modelRegistry: ModelRegistry;

  constructor(private wss: WebSocketServer, private secret: string, private runtimeOptions?: RuntimeOptions) {
    const agentDir = this.runtimeOptions?.agentDir || (process.env.HOME || '/root') + '/.pi/agent';
    this.authStorage = AuthStorage.create(agentDir);
    this.modelRegistry = ModelRegistry.create(this.authStorage, `${agentDir}/models.json`);

    this.wss.on('connection', (ws: WS, request: IncomingMessage) => {
      this.handleConnection(ws, request);
    });
  }

  private async handleConnection(ws: WS, _request: IncomingMessage) {
    const connId = crypto.randomUUID();
    console.log(`[WS] Connection ${connId} opened`);

    const extWs = ws as ExtendedWebSocket;
    extWs.authenticated = false;
    extWs.heartbeatInterval = null;
    extWs.runtime = null;
    extWs.eventRelay = null;
    extWs.settingsErrorInterval = null;
    extWs.pendingExtensionResponses = new Map();
    extWs.isAlive = true;
    extWs.commandHandler = null;

    const connectionInfo: ConnectionInfo = {
      id: connId,
      connectedAt: Date.now(),
    };
    this.activeConnections.set(ws, connectionInfo);

    // Start heartbeat
    extWs.heartbeatInterval = setupHeartbeat(extWs);

    // Auth timeout
    let authTimeout: ReturnType<typeof setTimeout> | null = null;
    const AUTH_TIMEOUT_MS = 5000;

    const clearAuthTimeout = () => {
      if (authTimeout) {
        clearTimeout(authTimeout);
        authTimeout = null;
      }
    };

    authTimeout = setTimeout(() => {
      if (!extWs.authenticated) {
        console.log(`[WS] ${connId} auth timeout, closing`);
        ws.close(4001, 'Authentication timeout');
      }
    }, AUTH_TIMEOUT_MS);

    // First message must be auth
    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());

        // Auth is the first message
        if (!extWs.authenticated) {
          clearAuthTimeout();

          if (message.type === 'auth' && message.payload?.secret) {
            const expectedSecret = process.env.SHARED_SECRET || this.secret;
            if (message.payload.secret === expectedSecret) {
              extWs.authenticated = true;
              clearAuthTimeout();

              // Send auth success
              if (ws.readyState === WS.OPEN) {
                ws.send(JSON.stringify({ type: 'auth_success', data: {} }));
              }

              // Create runtime
              try {
                await this.createRuntime(extWs);
              } catch (err: any) {
                console.error(`[WS] ${connId} Runtime creation failed:`, err.message);
                ws.send(JSON.stringify({ type: 'error', data: { message: err.message || 'Failed to create runtime' } }));
              }
            } else {
              console.log(`[WS] ${connId} auth failed`);
              ws.close(4011, 'Authentication failed');
              return;
            }
          } else {
            console.log(`[WS] ${connId} first message is not auth, closing`);
            ws.close(4011, 'Authentication failed');
            return;
          }
          return;
        }

        // Subsequent messages are commands
        if (!isValidWSMessage(message)) {
          ws.send(JSON.stringify({ type: 'error', data: { message: 'Invalid message format' } }));
          return;
        }

        if (!extWs.runtime) {
          ws.send(JSON.stringify({ type: 'error', data: { message: 'Runtime not initialized' } }));
          return;
        }

        const commandHandler = extWs.commandHandler;
        if (commandHandler) {
          await commandHandler.handleCommand(message);
        }
      } catch (err: any) {
        console.error(`[WS] ${connId} Message handling error:`, err.message);
        if (ws.readyState === WS.OPEN) {
          ws.send(JSON.stringify({ type: 'error', data: { message: err.message || 'Unknown error' } }));
        }
      }
    });

    ws.on('close', async (code, reason) => {
      console.log(`[WS] Connection ${connId} closed (code: ${code})`);

      // Dispose runtime
      if (extWs.runtime) {
        try {
          await extWs.runtime.dispose();
        } catch (err) {
          console.error(`[WS] ${connId} Runtime dispose error:`, err);
        }
      }

      // Clean up event relay
      if (extWs.eventRelay) {
        extWs.eventRelay.destroy();
      }

      // Clean up heartbeat
      if (extWs.heartbeatInterval) {
        clearInterval(extWs.heartbeatInterval);
      }

      // Clean up settings error interval
      if (extWs.settingsErrorInterval) {
        clearInterval(extWs.settingsErrorInterval);
      }

      this.activeConnections.delete(ws);
    });

    ws.on('error', (err) => {
      console.error(`[WS] ${connId} Error:`, err.message);
    });
  }

  private async createRuntime(ws: ExtendedWebSocket) {
    try {
      const { runtime, diagnostics } = await createRuntime(this.runtimeOptions);

      ws.runtime = runtime;

      // Send diagnostics (SDK uses 'type' field: info|warning|error, not 'level')
      for (const diag of diagnostics) {
        if (ws.readyState === WS.OPEN) {
          ws.send(JSON.stringify({
            type: 'diagnostic',
            data: {
              level: diag.type,
              message: diag.message,
            },
          }));
        }
      }

      // Check model fallback message
      if (runtime.modelFallbackMessage && ws.readyState === WS.OPEN) {
        ws.send(JSON.stringify({
          type: 'diagnostic',
          data: {
            level: 'warning',
            message: runtime.modelFallbackMessage,
          },
        }));
      }

      // Create extension UI context matching SDK's ExtensionUIContext interface
      let dialogCounter = 0;
      const pendingDialogs = new Map<string, { resolve: Function; reject: Function }>();

      const uiContext: ExtensionUIContext = {
        select: async (title: string, options: string[], opts?: ExtensionUIDialogOptions) => {
          const id = `dialog_${++dialogCounter}`;
          return new Promise<string | undefined>((resolve, reject) => {
            pendingDialogs.set(id, { resolve, reject });

            if (ws.readyState === WS.OPEN) {
              ws.send(JSON.stringify({
                type: 'extension_ui_request',
                data: {
                  id,
                  method: 'select',
                  title,
                  options,
                  timeout: opts?.timeout,
                },
              }));
            }

            if (opts?.timeout) {
              setTimeout(() => {
                pendingDialogs.delete(id);
                reject(new Error(`Dialog ${id} timed out`));
              }, opts.timeout);
            }
          });
        },
        confirm: async (title: string, message: string, opts?: ExtensionUIDialogOptions) => {
          const id = `dialog_${++dialogCounter}`;
          return new Promise<boolean>((resolve, reject) => {
            pendingDialogs.set(id, { resolve, reject });

            if (ws.readyState === WS.OPEN) {
              ws.send(JSON.stringify({
                type: 'extension_ui_request',
                data: {
                  id,
                  method: 'confirm',
                  title,
                  message,
                  timeout: opts?.timeout,
                },
              }));
            }

            if (opts?.timeout) {
              setTimeout(() => {
                pendingDialogs.delete(id);
                reject(new Error(`Dialog ${id} timed out`));
              }, opts.timeout);
            }
          });
        },
        input: async (title: string, placeholder?: string, opts?: ExtensionUIDialogOptions) => {
          const id = `dialog_${++dialogCounter}`;
          return new Promise<string | undefined>((resolve, reject) => {
            pendingDialogs.set(id, { resolve, reject });

            if (ws.readyState === WS.OPEN) {
              ws.send(JSON.stringify({
                type: 'extension_ui_request',
                data: {
                  id,
                  method: 'input',
                  title,
                  placeholder,
                  timeout: opts?.timeout,
                },
              }));
            }

            if (opts?.timeout) {
              setTimeout(() => {
                pendingDialogs.delete(id);
                reject(new Error(`Dialog ${id} timed out`));
              }, opts.timeout);
            }
          });
        },
        notify: (message: string, type?: 'info' | 'warning' | 'error') => {
          if (ws.readyState === WS.OPEN) {
            ws.send(JSON.stringify({
              type: 'extension_ui_request',
              data: {
                method: 'notify',
                notifyType: type || 'info',
                message,
              },
            }));
          }
        },
        onTerminalInput: () => {
          // Not applicable for WebSocket mode - return no-op unsubscribe
          return () => {};
        },
        setStatus: (key: string, text: string | undefined) => {
          if (ws.readyState === WS.OPEN) {
            ws.send(JSON.stringify({
              type: 'extension_ui_request',
              data: {
                method: 'setStatus',
                statusKey: key,
                statusText: text,
              },
            }));
          }
        },
        setWorkingMessage: (message?: string) => {
          if (ws.readyState === WS.OPEN) {
            ws.send(JSON.stringify({
              type: 'extension_ui_request',
              data: {
                method: 'setWorkingMessage',
                workingMessage: message,
              },
            }));
          }
        },
        setWorkingVisible: (visible: boolean) => {
          if (ws.readyState === WS.OPEN) {
            ws.send(JSON.stringify({
              type: 'extension_ui_request',
              data: {
                method: 'setWorkingVisible',
                workingVisible: visible,
              },
            }));
          }
        },
        setWorkingIndicator: (options?: WorkingIndicatorOptions) => {
          if (ws.readyState === WS.OPEN) {
            ws.send(JSON.stringify({
              type: 'extension_ui_request',
              data: {
                method: 'setWorkingIndicator',
                workingIndicator: options,
              },
            }));
          }
        },
        setHiddenThinkingLabel: (label?: string) => {
          if (ws.readyState === WS.OPEN) {
            ws.send(JSON.stringify({
              type: 'extension_ui_request',
              data: {
                method: 'setHiddenThinkingLabel',
                label,
              },
            }));
          }
        },
        setWidget: (key: string, content: string[] | ((...args: any[]) => any) | undefined, options?: ExtensionWidgetOptions) => {
          if (ws.readyState === WS.OPEN) {
            if (Array.isArray(content)) {
              ws.send(JSON.stringify({
                type: 'extension_ui_request',
                data: {
                  method: 'setWidget',
                  widgetKey: key,
                  widgetLines: content,
                  widgetPlacement: options?.placement,
                },
              }));
            }
            // Function-based widgets not supported in WebSocket mode
          }
        },
        setFooter: () => {
          // Not applicable for WebSocket mode
        },
        setHeader: () => {
          // Not applicable for WebSocket mode
        },
        setTitle: (title: string) => {
          if (ws.readyState === WS.OPEN) {
            ws.send(JSON.stringify({
              type: 'extension_ui_request',
              data: {
                method: 'setTitle',
                title,
              },
            }));
          }
        },
        custom: () => {
          // Not applicable for WebSocket mode - return a no-op that resolves with undefined
          return Promise.resolve(undefined as any);
        },
        pasteToEditor: (text: string) => {
          if (ws.readyState === WS.OPEN) {
            ws.send(JSON.stringify({
              type: 'extension_ui_request',
              data: {
                method: 'pasteToEditor',
                text,
              },
            }));
          }
        },
        setEditorText: (text: string) => {
          if (ws.readyState === WS.OPEN) {
            ws.send(JSON.stringify({
              type: 'extension_ui_request',
              data: {
                method: 'setEditorText',
                text,
              },
            }));
          }
        },
        getEditorText: (): string => {
          // Not applicable for WebSocket mode - return empty string
          return '';
        },
        editor: async (title: string, prefill?: string): Promise<string | undefined> => {
          const id = `dialog_${++dialogCounter}`;
          return new Promise<string | undefined>((resolve, reject) => {
            pendingDialogs.set(id, { resolve, reject });

            if (ws.readyState === WS.OPEN) {
              ws.send(JSON.stringify({
                type: 'extension_ui_request',
                data: {
                  id,
                  method: 'editor',
                  title,
                  prefill,
                },
              }));
            }
          });
        },
        addAutocompleteProvider: () => {
          // Not applicable for WebSocket mode
        },
        setEditorComponent: () => {
          // Not applicable for WebSocket mode
        },
        getEditorComponent: (): any => {
          return undefined;
        },
        getAllThemes: () => [],
        getTheme: () => ({
          name: 'default',
          label: 'Default',
          bgColors: {},
          mode: 'dark' as any,
          fg: () => '',
          bg: () => '',
          border: () => '',
          highlight: () => '',
          dim: () => '',
          accent: () => '',
          error: () => '',
          warning: () => '',
          success: () => '',
          bold: () => '',
          italic: () => '',
          underline: () => '',
          inverse: () => '',
          strikethrough: () => '',
          blink: () => '',
          getFgAnsi: (str: string) => str,
          getBgAnsi: (str: string) => str,
          getColorMode: () => 'dark' as any,
          getThinkingBorderColor: () => (str: string) => str,
          getBashModeBorderColor: () => (str: string) => str,
        }) as any,
        setTheme: () => ({ success: true }),
        getToolsExpanded: () => false,
        setToolsExpanded: () => {},
        theme: null as any,
      };

      // Create error listener
      const onError = (error: ExtensionError) => {
        if (ws.readyState === WS.OPEN) {
          ws.send(JSON.stringify({
            type: 'extension_error',
            data: {
              extensionPath: error.extensionPath,
              event: error.event,
              error: error.error,
              stack: error.stack,
            },
          }));
        }
      };

      // Bind extensions
      runtime.session.bindExtensions({
        uiContext,
        onError,
      });

      // Create event relay
      const eventRelay = new EventRelay(runtime.session, ws);
      ws.eventRelay = eventRelay;

      // Create command handler
      const commandHandler = new CommandHandler(runtime, ws, this.modelRegistry, pendingDialogs);
      ws.commandHandler = commandHandler;

      // Set up rebind session callback
      runtime.setRebindSession(async (session) => {
        eventRelay.subscribe();
        runtime.session.bindExtensions({
          uiContext,
          onError,
        });
      });

      // Send session info
      if (ws.readyState === WS.OPEN) {
        const model = runtime.session.model;
        ws.send(JSON.stringify({
          type: 'session_info',
          data: {
            sessionId: runtime.session.sessionId,
            sessionFile: runtime.session.sessionFile,
            model: model ? model.id : 'unknown',
            provider: model ? model.provider : 'unknown',
            thinkingLevel: runtime.session.thinkingLevel,
            sessionName: runtime.session.sessionName,
          },
        }));
      }

      // Periodic settings drain errors (Fix for Issue #16)
      const settingsManager: SettingsManager = runtime.services.settingsManager;
      ws.settingsErrorInterval = setInterval(() => {
        const errors = settingsManager.drainErrors();
        for (const err of errors) {
          if (ws.readyState === WS.OPEN) {
            ws.send(JSON.stringify({
              type: 'settings_error',
              data: {
                message: err.error.message,
                scope: err.scope,
              },
            }));
          }
        }
      }, 5000);

    } catch (err: any) {
      console.error('Failed to create runtime:', err);
      throw err;
    }
  }

  getActiveConnectionCount(): number {
    return this.activeConnections.size;
  }
}

interface ConnectionInfo {
  id: string;
  connectedAt: number;
}
