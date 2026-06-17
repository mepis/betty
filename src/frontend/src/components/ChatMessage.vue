<template>
  <div class="message" :class="msg.role">
    <div class="message-header">
      <div class="message-avatar" :class="msg.role">
        <span v-if="msg.role === 'user'">Y</span>
        <span v-else-if="msg.role === 'toolResult'">🔧</span>
        <svg v-else width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
          <path d="M12 2L2 7l10 5 10-5-10-5z"/>
          <path d="M2 17l10 5 10-5"/>
          <path d="M2 12l10 5 10-5"/>
        </svg>
      </div>
      <span class="message-role">{{ role }}</span>
      <span v-if="isStreaming && !hasContent" class="thinking-shimmer">
        <span></span><span></span><span></span>
      </span>
      <span v-else-if="isStreaming" class="typing-indicator">
        <span></span><span></span><span></span>
      </span>
      <span class="message-time" v-if="time">{{ time }}</span>
    </div>
    <div v-if="hasContent || isStreaming" class="message-content" v-html="contentHtml" @click.capture="handleContentInteraction" @keydown.capture="handleContentInteraction"></div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { renderUserMessage, renderAssistantMessage } from '../message-renderers.js';

// Event delegation for toggle buttons and copy buttons in v-html content
function handleContentInteraction(e) {
  const target = e.target;

  // Handle toggle buttons (thinking, tool, context-tool, subagent)
  const toggleHeader = target.closest('[data-toggle]');
  if (toggleHeader && (e.type === 'click' || (e.type === 'keydown' && e.key === 'Enter') || (e.type === 'keydown' && e.key === ' '))) {
    e.preventDefault();
    const content = toggleHeader.nextElementSibling;
    const arrow = toggleHeader.querySelector('span:last-child');
    if (content) {
      content.classList.toggle('collapsed');
      if (arrow) {
        arrow.textContent = content.classList.contains('collapsed') ? '\u25BC' : '\u25B2';
      }
    }
    return;
  }

  // Handle copy buttons
  const copyBtn = target.closest('.code-copy');
  if (copyBtn && e.type === 'click') {
    e.preventDefault();
    const codeBlock = copyBtn.closest('.code-block');
    const codeEl = codeBlock ? codeBlock.querySelector('code') : null;
    if (codeEl) {
      navigator.clipboard.writeText(codeEl.textContent)
        .then(() => {
          copyBtn.textContent = 'Copied!';
          copyBtn.classList.add('copied');
          setTimeout(() => {
            copyBtn.textContent = 'Copy';
            copyBtn.classList.remove('copied');
          }, 2000);
        })
        .catch(() => {
          copyBtn.textContent = 'Failed';
          setTimeout(() => { copyBtn.textContent = 'Copy'; copyBtn.classList.remove('copied'); }, 2000);
        });
    }
    return;
  }
}

const props = defineProps({
  msg: { type: Object, default: () => ({}) },
  isStreaming: Boolean,
});

const hasContent = computed(() => {
  const text = getTextContent();
  const thinking = getThinkingContent();
  // Check for tool call blocks
  if (Array.isArray(props.msg.content)) {
    const hasToolCalls = props.msg.content.some(b => b.type === 'toolCall');
    if (hasToolCalls) return true;
  }
  // Check for streaming tool calls
  if (Array.isArray(props.msg.toolCalls) && props.msg.toolCalls.length > 0) return true;
  return text || thinking;
});

function getTextContent() {
  if (Array.isArray(props.msg.content)) {
    return props.msg.content.filter(b => b.type === 'text').map(b => b.text || '').join('');
  }
  if (typeof props.msg.content === 'string') return props.msg.content;
  return '';
}

function getThinkingContent() {
  if (props.msg.thinking) return props.msg.thinking;
  if (Array.isArray(props.msg.content)) {
    const block = props.msg.content.find(b => b.type === 'thinking');
    return block ? block.thinking : '';
  }
  return '';
}

const role = computed(() => {
  if (props.msg.role === 'user') return 'You';
  if (props.msg.role === 'toolResult') return 'Tool Result';
  return 'Betty';
});
const time = ref('');
watch(() => props.msg?.timestamp, (ts) => {
  time.value = ts ? new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
}, { immediate: true });

// Thin wrapper — delegates to pure rendering functions
const contentHtml = computed(() => {
  if (props.msg.role === 'user') {
    return renderUserMessage(props.msg);
  }
  return renderAssistantMessage(props.msg, props.isStreaming);
});

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

/* Typing indicator */
.typing-indicator {
  display: flex;
  align-items: center;
  gap: 3px;
  margin-left: 4px;
}

.typing-indicator span {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--accent);
  animation: typing 1.4s ease infinite;
}

.typing-indicator span:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-indicator span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes typing {
  0%, 60%, 100% { opacity: 0.3; transform: translateY(0); }
  30% { opacity: 1; transform: translateY(-2px); }
}

/* Thinking shimmer — shown when assistant is thinking but hasn't started outputting text */
.thinking-shimmer {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: 4px;
}

.thinking-shimmer span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--accent);
  animation: shimmer 1.4s ease-in-out infinite;
}

.thinking-shimmer span:nth-child(2) {
  animation-delay: 0.2s;
}

.thinking-shimmer span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes shimmer {
  0%, 100% { opacity: 0.2; transform: scale(0.8); }
  50% { opacity: 1; transform: scale(1.2); }
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

/* Thinking blocks */
.thinking-block {
  margin: 10px 0;
  border-radius: var(--radius);
  border: 1px solid var(--border);
  background: var(--bg-card);
  overflow: hidden;
}

.thinking-header {
  padding: 8px 14px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border);
  font-size: 12px;
  color: var(--text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  user-select: none;
  font-weight: 500;
  transition: background var(--transition-fast);
}

.thinking-header:hover {
  background: var(--bg-tertiary);
}

.thinking-content {
  padding: 10px 14px;
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.6;
}

.thinking-content.collapsed {
  display: none;
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

/* Primary response — the main LLM text, not wrapped in a panel */
.primary-response {
  font-size: 14.5px;
  line-height: 1.7;
  color: var(--text-primary);
}

/* Context tool group — collapsed consecutive context tools */
.context-tool-group {
  margin: 10px 0;
  border-radius: var(--radius);
  border: 1px solid var(--border);
  background: var(--bg-card);
  overflow: hidden;
}

.context-tool-header {
  padding: 8px 14px;
  background: var(--info-dim);
  border-bottom: 1px solid var(--border);
  font-size: 12px;
  color: var(--info);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  user-select: none;
  font-weight: 500;
  transition: background var(--transition-fast);
}

.context-tool-header:hover {
  background: rgba(96, 165, 250, 0.12);
}

.context-tool-icon {
  font-size: 14px;
}

.context-tool-summary {
  font-size: 11px;
  color: var(--text-muted);
  font-weight: 400;
}

.context-tool-content {
  padding: 8px 14px;
  font-size: 12px;
  color: var(--text-secondary);
  font-family: 'JetBrains Mono', 'Fira Code', Consolas, monospace;
  line-height: 1.5;
  max-height: 200px;
  overflow-y: auto;
}

.context-tool-content.collapsed {
  display: none;
}

.context-tool-item {
  padding: 2px 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Improved tool call rendering */
.tool-call {
  margin: 10px 0;
  border-radius: var(--radius);
  border: 1px solid var(--border);
  background: var(--bg-card);
  overflow: hidden;
}

.tool-call.tool-running {
  border-color: var(--warning);
}

.tool-call.tool-error {
  border-color: var(--error);
}

.tool-call.tool-completed {
  border-color: var(--success);
}

.tool-header {
  padding: 8px 14px;
  background: var(--accent-dim-soft);
  border-bottom: 1px solid var(--border);
  font-size: 12px;
  color: var(--accent);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  user-select: none;
  font-weight: 500;
  transition: background var(--transition-fast);
}

.tool-header:hover {
  background: var(--accent-dim);
}

.tool-state-icon {
  font-size: 12px;
}

.tool-path {
  font-size: 11px;
  color: var(--text-muted);
  font-family: 'JetBrains Mono', 'Fira Code', Consolas, monospace;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 200px;
}

.tool-content {
  padding: 10px 14px;
  font-size: 12px;
  color: var(--text-secondary);
  font-family: 'JetBrains Mono', 'Fira Code', Consolas, monospace;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 150px;
  overflow-y: auto;
  line-height: 1.5;
}

.tool-content.collapsed {
  display: none;
}

/* Subagent block */
.subagent-block {
  margin: 10px 0;
  border-radius: var(--radius);
  border: 1px solid var(--border);
  background: var(--bg-card);
  overflow: hidden;
}

.subagent-header {
  padding: 8px 14px;
  background: var(--accent-dim-soft);
  border-bottom: 1px solid var(--border);
  font-size: 12px;
  color: var(--accent);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  user-select: none;
  font-weight: 500;
  transition: background var(--transition-fast);
}

.subagent-header:hover {
  background: var(--accent-dim);
}

.subagent-icon {
  font-size: 14px;
}

.subagent-mode {
  font-size: 11px;
  color: var(--text-muted);
  font-weight: 400;
}

.subagent-task-preview {
  font-size: 11px;
  color: var(--text-muted);
  font-style: italic;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.subagent-content {
  padding: 10px 14px;
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.6;
  max-height: 300px;
  overflow-y: auto;
}

.subagent-content.collapsed {
  display: none;
}

.subagent-task {
  margin-bottom: 8px;
  font-size: 12px;
  color: var(--text-secondary);
  font-style: italic;
  padding: 4px 0;
  border-bottom: 1px solid var(--border);
}

.subagent-result-item {
  padding: 6px 0;
  border-bottom: 1px solid var(--border-subtle);
}

.subagent-result-item:last-child {
  border-bottom: none;
}

.subagent-result-header {
  font-size: 11px;
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: 2px;
}

.subagent-usage {
  font-size: 10px;
  color: var(--text-muted);
  font-family: 'JetBrains Mono', 'Fira Code', Consolas, monospace;
  margin-top: 2px;
}

.subagent-stderr {
  font-size: 11px;
  color: var(--warning);
  font-family: 'JetBrains Mono', 'Fira Code', Consolas, monospace;
  margin-top: 4px;
  white-space: pre-wrap;
  word-break: break-all;
}

.subagent-error {
  font-size: 11px;
  color: var(--error);
  font-family: 'JetBrains Mono', 'Fira Code', Consolas, monospace;
  margin-top: 4px;
}

.subagent-output {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--border);
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.6;
}
</style>
