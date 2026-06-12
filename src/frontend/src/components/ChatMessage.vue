<template>
  <div class="message" :class="msg.role">
    <div class="message-header">
      <div class="message-avatar">{{ avatar }}</div>
      <span class="message-role">{{ role }}</span>
      <span class="message-time">{{ time }}</span>
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

const avatar = computed(() => props.msg.role === 'user' ? 'Y' : 'B');
const role = computed(() => props.msg.role === 'user' ? 'You' : 'Betty');
const time = computed(() => {
  if (props.msg.timestamp) return new Date(props.msg.timestamp).toLocaleTimeString();
  return 'just now';
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
          <img src="${url}" style="max-width:100%; max-height:300px; display:block; object-fit:contain; background:var(--bg-tertiary);">
        </div>`
      ).join('');
      return content ? imagesHtml + '<br>' + escapeHtml(content) : imagesHtml;
    }
    return escapeHtml(content);
  }

  // Assistant message
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
  margin-bottom: 20px;
  max-width: 800px;
  animation: fadeIn 0.2s ease;
}

.message.user {
  align-self: flex-end;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

.message-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.message.user .message-header {
  flex-direction: row-reverse;
  margin-bottom: 4px;
}

.message-avatar {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 600;
  flex-shrink: 0;
}

.message.user .message-avatar {
  background: var(--green-dim);
  color: var(--green);
}

.message.assistant .message-avatar {
  background: var(--accent);
  color: white;
}

.message-role {
  font-size: 13px;
  font-weight: 600;
}

.message-time {
  font-size: 11px;
  color: var(--text-muted);
}

.message-content {
  padding-left: 36px;
  font-size: 14px;
  line-height: 1.65;
}

.message.user .message-content {
  background: var(--user-bubble);
  padding: 12px 16px;
  border-radius: 12px;
  border-top-right-radius: 4px;
  border: 1px solid var(--border);
  padding-left: 16px;
}

.message.user .message-content img {
  cursor: pointer;
}

.streaming-cursor::after {
  content: '▋';
  animation: blink 1s infinite;
  color: var(--accent);
}

@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}
</style>
