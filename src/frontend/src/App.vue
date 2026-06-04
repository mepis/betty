<template>
  <div class="chat-layout">
    <!-- Mobile sidebar overlay -->
    <div
      v-if="sidebarOpen && isMobile"
      class="sidebar-overlay"
      @click="sidebarOpen = false"
    />

    <!-- Session Sidebar -->
    <SessionSidebar
      :class="{ 'hidden': !sidebarOpen && isMobile }"
      @toggle="sidebarOpen = !sidebarOpen"
    />

    <!-- Main Chat Area -->
    <div class="chat-main">
      <!-- Connection Bar -->
      <ConnectionBar @openSettings="showSettings = true" />

      <!-- Chat View -->
      <ChatView />

      <!-- Input Area -->
      <InputArea />
    </div>

    <!-- Settings Panel -->
    <SettingsPanel
      v-if="showSettings"
      @close="showSettings = false"
    />

    <!-- Toast Container -->
    <ToastContainer />

    <!-- Extension Dialog -->
    <ExtensionDialog
      v-if="activeExtensionDialog"
      :dialog="activeExtensionDialog"
      @confirm="handleExtensionConfirm"
      @cancel="handleExtensionCancel"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { useChatStore } from '@/stores/chat';
import { useSessionStore } from '@/stores/sessions';
import { useSettingsStore } from '@/stores/settings';
import { useWebSocket } from '@/composables/useWebSocket';
import { useToast } from '@/composables/useToast';
import SessionSidebar from '@/components/SessionSidebar.vue';
import ChatView from '@/components/ChatView.vue';
import InputArea from '@/components/InputArea.vue';
import ConnectionBar from '@/components/ConnectionBar.vue';
import SettingsPanel from '@/components/SettingsPanel.vue';
import ToastContainer from '@/components/Toast.vue';
import ExtensionDialog from '@/components/ExtensionDialog.vue';

const chatStore = useChatStore();
const sessionStore = useSessionStore();
const settingsStore = useSettingsStore();
const { sendCommand } = useWebSocket();
const { showToast } = useToast();

const showSettings = ref(false);
const sidebarOpen = ref(true);
const isMobile = ref(window.innerWidth < 768);
const activeExtensionDialog = ref<{
  id: string;
  method: string;
  title?: string;
  options?: string[];
  message?: string;
  placeholder?: string;
  prefill?: string;
} | null>(null);

// Handle window resize
function handleResize() {
  isMobile.value = window.innerWidth < 768;
}

// Handle keyboard shortcuts
function handleKeyDown(event: KeyboardEvent) {
  const inputArea = document.querySelector('.chat-input') as HTMLTextAreaElement;
  const isInputFocused = document.activeElement === inputArea;

  // Ctrl+Enter or Cmd+Enter: send message
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter' && !isInputFocused) {
    event.preventDefault();
    // Trigger send via custom event or direct call
    const sendBtn = document.querySelector('.send-btn') as HTMLButtonElement;
    if (sendBtn && !sendBtn.disabled) {
      sendBtn.click();
    }
  }

  // Escape: abort current operation
  if (event.key === 'Escape' && chatStore.isStreaming) {
    event.preventDefault();
    sendCommand('abort', {});
  }
}

// Handle extension dialog confirm
async function handleExtensionConfirm(response: { value?: string; confirmed?: boolean; cancelled?: boolean }) {
  if (!activeExtensionDialog.value) return;
  const { id } = activeExtensionDialog.value;
  try {
    await sendCommand('extension_ui_response', {
      id,
      value: response.value,
      confirmed: response.confirmed,
      cancelled: response.cancelled,
    });
  } catch (err: any) {
    showToast('error', `Failed to respond to extension: ${err.message}`);
  }
  activeExtensionDialog.value = null;
}

// Handle extension dialog cancel
async function handleExtensionCancel() {
  if (!activeExtensionDialog.value) return;
  const { id } = activeExtensionDialog.value;
  try {
    await sendCommand('extension_ui_response', {
      id,
      cancelled: true,
    });
  } catch (err: any) {
    showToast('error', `Failed to cancel extension: ${err.message}`);
  }
  activeExtensionDialog.value = null;
}

// Handle fill-input event (from ChatView suggestions)
function handleFillInput(event: Event) {
  const customEvent = event as CustomEvent;
  // Dispatch to InputArea via a global ref approach
  // We'll use a simple approach: set the input via a custom event
  const inputArea = document.querySelector('.chat-input') as HTMLTextAreaElement;
  if (inputArea) {
    inputArea.value = customEvent.detail;
    inputArea.dispatchEvent(new Event('input', { bubbles: true }));
    inputArea.focus();
  }
}

// Load settings from localStorage
onMounted(() => {
  settingsStore.loadFromLocalStorage();
  window.addEventListener('resize', handleResize);
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('fill-input', handleFillInput);
  window.addEventListener('extension-ui-request', handleExtensionRequest);
  isMobile.value = window.innerWidth < 768;
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  window.removeEventListener('keydown', handleKeyDown);
  window.removeEventListener('fill-input', handleFillInput);
  window.removeEventListener('extension-ui-request', handleExtensionRequest);
});

// Handle extension UI requests from the WebSocket
function handleExtensionRequest(event: Event) {
  const customEvent = event as CustomEvent;
  const data = customEvent.detail;
  activeExtensionDialog.value = {
    id: data.id,
    method: data.method,
    title: data.title,
    options: data.options,
    message: data.message,
    placeholder: data.placeholder,
    prefill: data.prefill,
  };
}
</script>
