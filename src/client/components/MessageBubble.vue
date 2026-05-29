<script setup lang="ts">
import type { Message } from '../../shared/types.js';

defineProps<{ message: Message }>();
const emit = defineEmits<{ fork: [messageId: string] }>();

function formatContent(content: string): string {
  // Basic markdown-like formatting for display
  return content
    .replace(/```(\w*)\n?([\s\S]*?)```/g, '<pre class="bg-slate-900 text-green-400 p-3 rounded-lg overflow-x-auto my-2"><code>$2</code></pre>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/`(.*?)`/g, '<code class="bg-slate-200 px-1.5 py-0.5 rounded text-sm font-mono">$1</code>')
    .split('\n').map(line => {
      if (line.startsWith('- ') || line.startsWith('* ')) return `<li>${line.slice(2)}</li>`;
      if (line.match(/^\d+\./)) return `<li>${line.replace(/^\d+\.\s*/, '')}</li>`;
      return line ? `<p class="mb-1">${line}</p>` : '';
    }).join('');
}

function isStreaming(msg: Message): boolean {
  return msg.id.startsWith('local_assistant_') && !msg.content.includes('\n\n---\n\n[done]');
}
</script>

<template>
  <div class="flex gap-3 px-4 py-4" :class="message.role === 'user' ? 'justify-end' : ''">
    <!-- Avatar (assistant only) -->
    <div v-if="message.role !== 'user'" class="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0 mt-1">
      <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>
    </div>

    <!-- Message bubble -->
    <div class="max-w-[75%]" :class="message.role === 'user' ? 'order-first text-right' : ''">
      <div :class="[
        'rounded-2xl px-4 py-3',
        message.role === 'user'
          ? 'bg-indigo-600 text-white rounded-br-sm'
          : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm shadow-sm'
      ]">
        <div v-if="message.role !== 'user'" class="prose prose-sm max-w-none" v-html="formatContent(message.content)" />
        <p v-else class="whitespace-pre-wrap leading-relaxed">{{ message.content }}</p>

        <!-- Status indicator -->
        <div class="flex items-center justify-end gap-1.5 mt-2">
          <span v-if="message.status === 'pending'" class="text-xs opacity-60 flex items-center gap-1">
            <svg class="animate-spin h-3 w-3" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" fill="none" opacity="0.25"/><path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" fill="currentColor" opacity="0.75"/></svg>
            Sending…
          </span>
          <span v-if="message.status === 'error'" class="text-xs text-red-500">Failed to send</span>
          <span v-if="isStreaming(message)" class="text-xs opacity-60 flex items-center gap-1">
            Typing…
            <svg class="animate-pulse w-3 h-3" fill="currentColor" viewBox="0 0 8 2"><circle cx="2" cy="1" r="1"/><circle cx="6" cy="1" r="1"/></svg>
          </span>
        </div>
      </div>

      <!-- Fork button for assistant messages -->
      <button v-if="message.role === 'assistant'" @click="$emit('fork', message.id)" title="Branch from this response"
        class="mt-1.5 text-xs text-slate-400 hover:text-indigo-600 flex items-center gap-1 transition ml-2">
        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"/></svg>
        Branch
      </button>

      <!-- Timestamp -->
      <p class="text-xs text-slate-400 mt-1 px-1">{{ new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }}</p>
    </div>

    <!-- Avatar (user only) -->
    <div v-if="message.role === 'user'" class="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0 mt-1">
      <span class="text-sm font-medium text-indigo-700">{{ "U" }}</span>
    </div>
  </div>
</template>

<style scoped>
pre { margin: 0; }
code { color: inherit; }
</style>
