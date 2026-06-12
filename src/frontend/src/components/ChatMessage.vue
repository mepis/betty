<template>
  <div class="message" :class="msg.role">
    <div class="message-header">
      <div class="message-avatar" :class="msg.role">
        <span v-if="msg.role === 'user'">Y</span>
        <svg v-else width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
          <path d="M12 2L2 7l10 5 10-5-10-5z"/>
          <path d="M2 17l10 5 10-5"/>
          <path d="M2 12l10 5 10-5"/>
        </svg>
      </div>
      <span class="message-role">{{ role }}</span>
      <span class="message-time" v-if="time">{{ time }}</span>
    </div>
    <div class="message-content" :class="{ 'streaming-cursor': isStreaming }" v-html="contentHtml"></div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { renderMarkdown } from '../utils.js';

const props = defineProps({
  msg: Object,
  isStreaming: Boolean,
});

const role = computed(() => props.msg.role === 'user' ? 'You' : 'Betty');
const time = computed(() => {
  if (props.msg.timestamp) return new Date(props.msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return '';
});

const contentHtml = computed(() => {
  if (props.msg.role === 'user') {
    let content = '';
    const images = [];
    if (Array.isArray(props.msg.content)) {
      for (const block of props.msg.content) {
        if (block.type === 'image' && block.imageUrl) {
          images.push(block.imageUrl);
        } else if (block.type === 'text') {
          content += block.text;
        }
      }
    } else if (typeof props.msg.content === 'string') {
      content = props.msg.content;
    }

    if (images.length > 0) {
      const imagesHtml = images.map(url =>
        `<div style="margin-bottom:8px; border-radius:8px; overflow:hidden; border:1px solid var(--border); display:inline-block;">
          <img src="${url}" style="max-width:100%; max-height:280px; display:block; object-fit:contain; background:var(--bg-tertiary);">
        </div>`
      ).join('');
      return content ? imagesHtml + '<br>' + escapeHtml(content) : imagesHtml;
    }
    return escapeHtml(content);
  }

  let html = '';
  let textContent = '';

  if (Array.isArray(props.msg.content)) {
    for (const block of props.msg.content) {
      if (block.type === 'thinking') {
        html += `<div class="thinking-block">
          <div class="thinking-header" onclick="toggleThinking(this)">
            🧠 <span>Thinking</span>
            <span style="margin-left:auto; font-size:10px">▼</span>
          </div>
          <div class="thinking-content">${renderMarkdown(block.thinking)}</div>
        </div>`;
      } else if (block.type === 'text') {
        textContent += block.text;
      } else if (block.type === 'toolCall') {
        html += `<div class="tool-call">
          <div class="tool-header" onclick="toggleTool(this)">
            🔧 <span>${escapeHtml(block.name)}</span>
            <span style="margin-left:auto; font-size:10px">▼</span>
          </div>
          <div class="tool-content">${escapeHtml(JSON.stringify(block.arguments || {}, null, 2))}</div>
        </div>`;
      }
    }
  } else if (typeof props.msg.content === 'string') {
    textContent = props.msg.content;
  }

  return html + renderMarkdown(textContent);
});

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
</script>

<style scoped>
.message {
  width: 100%;
  max-width: 720px;
  margin-bottom: 24px;
  animation: fadeIn 0.25s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}

.message-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  padding-left: 0;
}

.message.user .message-header {
  justify-content: flex-end;
}

.message-avatar {
  width: 26px;
  height: 26px;
  border-radius: 7px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  flex-shrink: 0;
}

.message.user .message-avatar {
  background: var(--success-dim);
  color: var(--success);
}

.message.assistant .message-avatar {
  background: var(--accent-dim);
  color: var(--accent);
}

.message-role {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--text-secondary);
}

.message.user .message-role {
  order: 1;
}

.message-time {
  font-size: 11px;
  color: var(--text-muted);
  font-weight: 400;
}

.message-content {
  font-size: 14.5px;
  line-height: 1.7;
  color: var(--text-primary);
  padding-left: 0;
}

.message.user .message-content {
  background: var(--user-bubble);
  padding: 12px 16px;
  border-radius: 12px 12px 4px 12px;
  border: 1px solid var(--border);
  max-width: 85%;
}

.message.user .message-content img {
  cursor: pointer;
}

.message.user .message-header {
  flex-direction: row-reverse;
}

.streaming-cursor::after {
  content: '▋';
  animation: blink 1s infinite;
  color: var(--accent);
  margin-left: 2px;
}

@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}
</style>
