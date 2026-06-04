export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface WSEvent {
  type: string;
  data?: Record<string, unknown>;
}

export interface WSResponse {
  type: 'response';
  command: string;
  success: boolean;
  data?: unknown;
  error?: string;
}

export type WSCommandType =
  | 'auth'
  | 'prompt'
  | 'abort'
  | 'new_session'
  | 'switch_session'
  | 'fork'
  | 'clone'
  | 'navigate_tree'
  | 'set_model'
  | 'set_thinking_level'
  | 'set_session_name'
  | 'compact'
  | 'get_fork_messages'
  | 'get_messages'
  | 'get_last_assistant_text'
  | 'extension_ui_response';

export class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private commandIdCounter = 0;
  // Map from command type to array of pending promises
  private pendingCommands: Map<string, Array<{ resolve: Function; reject: Function }>> = new Map();

  constructor(
    private url: string,
    private secret: string,
    private onEvent: (event: WSEvent) => void,
    private onStatusChange: (status: ConnectionStatus) => void,
  ) {}

  connect() {
    if (this.ws && (this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.OPEN)) {
      return;
    }

    this.onStatusChange('connecting');

    try {
      this.ws = new WebSocket(this.url);
    } catch (err) {
      console.error('WebSocket connection failed:', err);
      this.onStatusChange('error');
      this.reconnect();
      return;
    }

    this.ws.onopen = () => {
      this.authenticate();
    };

    this.ws.onmessage = (event) => {
      this.handleMessage(event.data);
    };

    this.ws.onclose = (event) => {
      this.onStatusChange('disconnected');
      // Don't reconnect on auth failures or intentional closes
      if (event.code !== 4001 && event.code !== 4011 && event.code !== 1000) {
        this.reconnect();
      }
    };

    this.ws.onerror = () => {
      this.onStatusChange('error');
    };
  }

  disconnect() {
    this.reconnectAttempts = 0;
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    // Reject all pending commands
    for (const [, promises] of this.pendingCommands) {
      for (const p of promises) {
        p.reject(new Error('Connection closed'));
      }
    }
    this.pendingCommands.clear();
    this.onStatusChange('disconnected');
  }

  sendCommand(type: WSCommandType, payload: Record<string, unknown>): Promise<WSResponse> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        reject(new Error('WebSocket is not connected'));
        return;
      }

      const commandId = `cmd_${++this.commandIdCounter}`;
      const command = {
        type,
        payload: { ...payload, _id: commandId },
      };

      // Store pending promise
      if (!this.pendingCommands.has(type)) {
        this.pendingCommands.set(type, []);
      }
      this.pendingCommands.get(type)!.push({ resolve, reject });

      try {
        this.ws.send(JSON.stringify(command));
      } catch (err: any) {
        const pending = this.pendingCommands.get(type);
        if (pending) {
          const idx = pending.findIndex((p) => p.resolve === resolve);
          if (idx >= 0) pending.splice(idx, 1);
        }
        reject(err);
      }

      // Timeout after 30 seconds
      setTimeout(() => {
        const pending = this.pendingCommands.get(type);
        if (pending) {
          const idx = pending.findIndex((p) => p.resolve === resolve);
          if (idx >= 0) {
            pending.splice(idx, 1);
            reject(new Error(`Command ${type} timed out`));
          }
        }
      }, 30000);
    });
  }

  private authenticate() {
    if (!this.ws) return;
    this.ws.send(
      JSON.stringify({
        type: 'auth',
        payload: { secret: this.secret },
      }),
    );
  }

  private handleMessage(data: string) {
    let message: WSEvent | WSResponse;
    try {
      message = JSON.parse(data);
    } catch (err) {
      console.error('Failed to parse WebSocket message:', err);
      return;
    }

    if (message.type === 'response') {
      this.handleResponse(message as WSResponse);
    } else {
      this.onEvent(message as WSEvent);
    }
  }

  private handleResponse(response: WSResponse) {
    const pending = this.pendingCommands.get(response.command);
    if (pending && pending.length > 0) {
      const { resolve, reject } = pending.shift()!;
      if (response.success) {
        resolve(response.data);
      } else {
        reject(new Error(response.error || 'Unknown error'));
      }
    }
  }

  private reconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.onStatusChange('error');
      return;
    }

    const delay = this.getBackoffDelay();
    this.reconnectAttempts++;

    setTimeout(() => {
      this.connect();
    }, delay);
  }

  private getBackoffDelay(): number {
    return Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 30000);
  }

  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000);
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  get isConnecting(): boolean {
    return this.ws?.readyState === WebSocket.CONNECTING;
  }
}
