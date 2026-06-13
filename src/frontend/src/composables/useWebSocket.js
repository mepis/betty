import { ref } from 'vue';
import { authStore } from '../stores/auth.js';

export function useWebSocket() {
  const ws = ref(null);
  const connected = ref(false);
  const status = ref('disconnected'); // disconnected, connected, streaming

  const eventHandlers = new Map();
  const globalHandlers = [];

  function connect() {
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    // Include auth token in WebSocket URL
    const token = authStore.user ? '' : '';
    // We don't have direct access to the token cookie from JS,
    // but the server-side auth middleware handles cookie-based auth
    // For WebSocket, we use the cookie automatically via credentials
    ws.value = new WebSocket(`${protocol}//${location.host}/ws`);

    ws.value.onopen = () => {
      connected.value = true;
      status.value = 'connected';
    };

    ws.value.onclose = (event) => {
      connected.value = false;
      status.value = 'disconnected';
      // If closed with 401, redirect to login
      if (event.code === 401) {
        authStore.logout();
        window.location.href = '/login';
        return;
      }
      setTimeout(connect, 3000);
    };

    ws.value.onerror = () => {
      // onclose will fire after onerror
    };

    ws.value.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (eventHandlers.has(data.type)) {
          for (const handler of eventHandlers.get(data.type)) {
            handler(data);
          }
        }
        // Also call global handlers
        for (const handler of globalHandlers) {
          handler(data);
        }
      } catch (e) {
        console.error('Failed to parse message:', e);
      }
    };
  }

  function send(msg) {
    if (ws.value && ws.value.readyState === WebSocket.OPEN) {
      ws.value.send(JSON.stringify(msg));
    }
  }

  function on(type, handler) {
    if (!eventHandlers.has(type)) {
      eventHandlers.set(type, []);
    }
    eventHandlers.get(type).push(handler);
  }

  function onAny(handler) {
    globalHandlers.push(handler);
  }

  function disconnect() {
    if (ws.value) {
      ws.value.close();
    }
  }

  return {
    ws,
    connected,
    status,
    connect,
    send,
    on,
    onAny,
    disconnect,
  };
}
