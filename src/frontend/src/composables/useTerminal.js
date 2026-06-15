import { ref, watch } from 'vue';
import { useWebSocket } from './useWebSocket.js';

export function useTerminal() {
  const { send, on, connected } = useWebSocket();

  const terminalOpen = ref(false);
  const terminalError = ref(null);
  const terminalDisconnected = ref(false);

  let outputHandler = null;
  let listenersRegistered = false;

  function setupListeners() {
    if (listenersRegistered) return;
    listenersRegistered = true;

    on('terminal', (data) => {
      switch (data.action) {
        case 'opened':
          terminalOpen.value = true;
          terminalError.value = null;
          terminalDisconnected.value = false;
          break;
        case 'output':
          if (outputHandler) {
            // Data is base64-encoded on the backend for binary safety
            outputHandler(data.data);
          }
          break;
        case 'error':
          terminalError.value = data.message;
          break;
        case 'closed':
          terminalOpen.value = false;
          break;
      }
    });
  }

  // Watch WebSocket connection state — clean up terminal on disconnect
  watch(connected, (isConnected) => {
    if (!isConnected && terminalOpen.value) {
      terminalDisconnected.value = true;
      terminalError.value = 'Connection lost — terminal will be destroyed on reconnect';
    }
  });

  function reset() {
    listenersRegistered = false;
    outputHandler = null;
    terminalOpen.value = false;
    terminalError.value = null;
    terminalDisconnected.value = false;
  }

  function open(cols = 80, rows = 24) {
    setupListeners();
    send({ type: 'terminal', action: 'open', cols, rows });
  }

  function close() {
    send({ type: 'terminal', action: 'close' });
    reset();
  }

  function sendInput(data) {
    if (!terminalOpen.value || terminalDisconnected.value) {
      return;
    }
    send({ type: 'terminal', action: 'input', data });
  }

  function resize(cols, rows) {
    if (!terminalOpen.value || terminalDisconnected.value) {
      return;
    }
    send({ type: 'terminal', action: 'resize', cols, rows });
  }

  function setOutputHandler(handler) {
    outputHandler = handler;
  }

  return {
    terminalOpen,
    terminalError,
    terminalDisconnected,
    open,
    close,
    sendInput,
    resize,
    setOutputHandler,
  };
}
