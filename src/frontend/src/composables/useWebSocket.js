import { ref, reactive } from 'vue';

export function useWebSocket() {
  const ws = ref(null);
  const connected = ref(false);
  const status = ref('disconnected'); // disconnected, connected, streaming

  function connect() {
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    ws.value = new WebSocket(`${protocol}//${location.host}/ws`);

    ws.value.onopen = () => {
      connected.value = true;
      status.value = 'connected';
    };

    ws.value.onclose = () => {
      connected.value = false;
      status.value = 'disconnected';
      setTimeout(connect, 3000);
    };

    ws.value.onerror = () => {
      // onclose will fire after onerror
    };

    ws.value.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (eventHandlers.value.has(data.type)) {
          for (const handler of eventHandlers.value.get(data.type)) {
            handler(data);
          }
        }
        // Also call global handlers
        for (const handler of globalHandlers.value) {
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

  const eventHandlers = reactive(new Map());
  const globalHandlers = reactive([]);

  function on(type, handler) {
    if (!eventHandlers.value.has(type)) {
      eventHandlers.value.set(type, []);
    }
    eventHandlers.value.get(type).push(handler);
  }

  function onAny(handler) {
    globalHandlers.value.push(handler);
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
