<template>
  <main class="terminal-page">
    <div class="terminal-container">
      <div class="terminal-header">
        <div class="terminal-title">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="4 17 10 11 4 5"/>
            <line x1="12" y1="19" x2="20" y2="19"/>
          </svg>
          <span>Terminal</span>
        </div>
        <button class="terminal-close" @click="$emit('close')" title="Close terminal">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      <div ref="terminalEl" class="terminal-content"></div>
      <div v-if="terminalDisconnected" class="terminal-disconnected">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <span>Connection lost — terminal destroyed. Close and reopen to restore.</span>
      </div>
      <div v-else-if="terminalError" class="terminal-error">
        {{ terminalError }}
      </div>
    </div>
  </main>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue';
import { useTerminal } from '../composables/useTerminal.js';

const emit = defineEmits(['close']);

const terminalEl = ref(null);
const { terminalOpen, terminalError, terminalDisconnected, open, close, sendInput, resize, setOutputHandler } = useTerminal();

let terminal = null;
let fitAddon = null;
let resizeObserver = null;

onMounted(async () => {
  await nextTick();

  // Dynamically import xterm to avoid SSR/build issues
  const xtermModule = await import('@xterm/xterm');
  const { Terminal } = xtermModule;
  const fitAddonModule = await import('@xterm/addon-fit');
  const { FitAddon } = fitAddonModule;

  fitAddon = new FitAddon();
  terminal = new Terminal({
    fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', Consolas, monospace",
    fontSize: 13,
    cursorBlink: true,
    cursorStyle: 'block',
    allowProposedApi: true,
    theme: {
      background: '#09090b',
      foreground: '#f4f4f5',
      cursor: '#a78bfa',
      cursorAccent: '#09090b',
      selectionBackground: 'rgba(167, 139, 250, 0.3)',
      selectionInactiveBackground: 'rgba(167, 139, 250, 0.15)',
      black: '#09090b',
      red: '#f87171',
      green: '#34d399',
      yellow: '#fbbf24',
      blue: '#60a5fa',
      magenta: '#c084fc',
      cyan: '#22d3ee',
      white: '#f4f4f5',
      brightBlack: '#52525a',
      brightRed: '#fca5a5',
      brightGreen: '#6ee7b7',
      brightYellow: '#fde68a',
      brightBlue: '#93c5fd',
      brightMagenta: '#d8b4fe',
      brightCyan: '#67e8f9',
      brightWhite: '#ffffff',
    },
  });

  terminal.loadAddon(fitAddon);
  terminal.open(terminalEl.value);

  // Set up output handler from WebSocket (data is base64-encoded for binary safety)
  setOutputHandler((base64Data) => {
    // Decode base64 to Uint8Array for binary-safe terminal output
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    terminal.write(bytes);
  });

  // Handle terminal input (keystrokes)
  terminal.onData((data) => {
    sendInput(data);
  });

  // Initial fit
  fitAddon.fit();

  // Observe container resize for auto-fit
  resizeObserver = new ResizeObserver(() => {
    try {
      fitAddon.fit();
      // Notify backend of new dimensions
      resize(fitAddon.cols, fitAddon.rows);
    } catch {}
  });
  resizeObserver.observe(terminalEl.value);

  // Open the terminal PTY
  open(fitAddon.cols, fitAddon.rows);
});

onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect();
  }
  close();
  if (terminal) {
    terminal.dispose();
    terminal = null;
  }
});
</script>

<style scoped>
.terminal-page {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  background: var(--bg-primary);
}

.terminal-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: var(--bg-primary);
}

.terminal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 14px;
  border-bottom: 1px solid var(--border);
  background: var(--bg-secondary);
  flex-shrink: 0;
}

.terminal-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: -0.01em;
}

.terminal-title svg {
  color: var(--text-muted);
}

.terminal-close {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
}

.terminal-close:hover {
  background: var(--bg-hover);
  color: var(--text-secondary);
}

.terminal-content {
  flex: 1;
  overflow: hidden;
  padding: 4px;
  background: var(--bg-primary);
}

.terminal-disconnected {
  padding: 8px 14px;
  background: var(--warning-dim);
  border-top: 1px solid var(--warning);
  font-size: 12px;
  color: var(--warning);
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.terminal-disconnected svg {
  flex-shrink: 0;
}

.terminal-error {
  padding: 8px 14px;
  background: var(--error-dim);
  border-top: 1px solid var(--error);
  font-size: 12px;
  color: var(--error);
  flex-shrink: 0;
}

/* xterm.js overrides within scoped styles */
:deep(.xterm) {
  padding: 4px;
}

:deep(.xterm-viewport) {
  border-radius: 4px;
}

:deep(.xterm-screen) {
  padding: 0;
}

:deep(.xterm-helper-textarea) {
  position: absolute;
  opacity: 0;
  outline: none;
}

:deep(.xterm-decoration-container) {
  display: none;
}
</style>
