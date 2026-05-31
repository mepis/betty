<template>
  <div class="border-t border-gray-800 bg-gray-900/80 backdrop-blur px-2 sm:px-3 py-2 sm:py-3">
    <div class="max-w-4xl mx-auto flex gap-1.5 sm:gap-2">
      <!-- Text input -->
      <textarea
        v-model="input"
        rows="1"
        placeholder="Ask pi.dev anything..."
        :disabled="disabled"
        @keydown.enter.exact.prevent="send"
        @keydown.tab.prevent="handleTab"
        class="flex-1 min-w-0 bg-gray-800 border border-gray-700 rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base text-gray-100 placeholder-gray-500 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 max-h-[150px] overflow-y-auto"
        ref="textarea"
        @input="autoResize"
      ></textarea>

      <!-- Abort button (shown when agent is busy) -->
      <button
        v-if="!isIdle"
        @click="abort"
        class="flex-shrink-0 bg-red-600 hover:bg-red-500 text-white rounded-lg p-2 sm:px-4 sm:py-2.5 transition-colors"
        title="Abort current operation"
      >
        <!-- Mobile: icon only -->
        <svg class="w-5 h-5 sm:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
        <!-- Desktop: text -->
        <span class="hidden sm:inline font-medium text-sm">✕</span>
      </button>

      <!-- Send button -->
      <button
        @click="send"
        :disabled="disabled || !input.trim()"
        class="flex-shrink-0 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg px-3 sm:px-5 py-2 sm:py-2.5 font-medium transition-colors text-sm sm:text-base"
      >
        <!-- Mobile: icon only -->
        <svg class="w-5 h-5 sm:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19V5m-7 7l7-7 7 7" />
        </svg>
        <!-- Desktop: text -->
        <span class="hidden sm:inline">Send</span>
      </button>
    </div>

    <!-- Steer / Follow-up hint -->
    <div
      v-if="!isIdle"
      class="max-w-4xl mx-auto mt-1.5 sm:mt-2 flex gap-2"
    >
      <button
        @click="steerMode = !steerMode"
        class="text-xs text-gray-400 hover:text-gray-200 underline"
      >
        {{ steerMode ? "Switch to follow-up" : "Steer mid-stream" }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick, computed } from "vue";

const props = defineProps({
  isIdle: { type: Boolean, default: true },
});

const emit = defineEmits(["send", "abort", "steer"]);

const input = ref("");
const textarea = ref(null);
const steerMode = ref(false);

const disabled = computed(() => false);

function autoResize() {
  nextTick(() => {
    const el = textarea.value;
    if (el) {
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 160) + "px";
    }
  });
}

function send() {
  const text = input.value.trim();
  if (!text) return;

  if (steerMode.value && !props.isIdle) {
    emit("steer", text);
  } else {
    emit("send", text);
  }
  input.value = "";
  nextTick(() => {
    if (textarea.value) textarea.value.style.height = "auto";
  });
}

function handleTab() {
  // Insert 2 spaces for indentation (better than Tab key navigation)
  const el = textarea.value;
  if (!el) return;
  const start = el.selectionStart;
  const end = el.selectionEnd;
  input.value = input.value.substring(0, start) + '  ' + input.value.substring(end);
  el.selectionStart = el.selectionEnd = start + 2;
  // Trigger input event for v-model update and autoResize
  el.dispatchEvent(new Event('input', { bubbles: true }));
}
</script>
