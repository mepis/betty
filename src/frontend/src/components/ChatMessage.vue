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
    <div v-if="hasContent || isStreaming" class="message-content" :class="{ 'streaming-cursor': isStreaming }" v-html="contentHtml"></div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { renderMarkdown } from '../utils.js';

const props = defineProps({
  msg: Object,
  isStreaming: Boolean,
});

const hasContent = computed(() => {
  const text = getTextContent();
  const thinking = getThinkingContent();
  // Tool results always have content (even if empty string)
  if (props.msg.role === 'toolResult') return true;
  // Check for tool call blocks
  if (Array.isArray(props.msg.content)) {
    const hasToolCalls = props.msg.content.some(b => b.type === 'toolCall');
    if (hasToolCalls) return true;
  }
  return text || thinking;
});

function getTextContent() {
  if (Array.isArray(props.msg.content)) {
    return props.msg.content.filter(b => b.type === 'text').map(b => b.text).join('');
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

  // Tool result messages
  if (props.msg.role === 'toolResult') {
    const toolName = props.msg.toolName || (props.msg.name || 'tool');
    const isError = props.msg.isError || props.msg.stopReason === 'error';
    const isRunning = props.msg.status === 'running';
    let resultText = '';
    if (Array.isArray(props.msg.content)) {
      resultText = props.msg.content.filter(b => b.type === 'text').map(b => b.text).join('\n');
    } else if (typeof props.msg.content === 'string') {
      resultText = props.msg.content;
    }
    const stateClass = isRunning ? 'tool-running' : (isError ? 'tool-error' : 'tool-completed');
    const stateIcon = isRunning ? '⏳' : (isError ? '❌' : '✅');
    return `<div class="tool-call ${stateClass}">
      <div class="tool-header" onclick="toggleTool(this)">
        <span class="tool-state-icon">${stateIcon}</span>
        <span>${escapeHtml(toolName)}</span>
        <span style="margin-left:auto; font-size:10px">▼</span>
      </div>
      <div class="tool-content">${resultText ? escapeHtml(resultText) : (isRunning ? '<em>Running...</em>' : '<em>No output</em>')}</div>
    </div>`;
  }

  // Context tools that should be grouped together
  const CONTEXT_TOOLS = new Set(['read', 'glob', 'grep', 'list']);

  let html = '';
  let textContent = '';
  const toolBlocks = [];

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
        toolBlocks.push(block);
      }
    }
  }

  // Group consecutive context tools
  const grouped = groupContextTools(toolBlocks, CONTEXT_TOOLS);

  // Render grouped tools
  for (const item of grouped) {
    if (item.type === 'group') {
      // Context tool group
      const summary = item.tools.map(t => {
        const icon = CONTEXT_TOOL_ICONS[t.name] || '📄';
        return `${icon} ${escapeHtml(t.name)}`;
      }).join(', ');
      const details = item.tools.map(t => {
        const args = t.arguments || {};
        const path = args.path || args.file || args.pattern || args.directory || '';
        return `<div class="context-tool-item">${escapeHtml(path || t.name)}</div>`;
      }).join('');
      html += `<div class="context-tool-group">
        <div class="context-tool-header" onclick="toggleTool(this)">
          <span class="context-tool-icon">📂</span>
          <span>Gathering context (${item.tools.length})</span>
          <span class="context-tool-summary">${summary}</span>
          <span style="margin-left:auto; font-size:10px">▼</span>
        </div>
        <div class="context-tool-content">${details}</div>
      </div>`;
    } else if (item.type === 'tool') {
      // Individual tool call
      const toolBlock = item.block;
      const stateClass = toolBlock.status ? `tool-${toolBlock.status}` : '';
      const stateIcon = TOOL_STATE_ICONS[toolBlock.status] || '🔧';
      const args = toolBlock.arguments || {};
      const path = args.path || args.file || args.pattern || '';
      const resultText = toolBlock.result !== undefined ? escapeHtml(JSON.stringify(toolBlock.result, null, 2)) : '';
      html += `<div class="tool-call ${stateClass}">
        <div class="tool-header" onclick="toggleTool(this)">
          <span class="tool-state-icon">${stateIcon}</span>
          <span>${escapeHtml(toolBlock.name)}</span>
          ${path ? `<span class="tool-path">${escapeHtml(path)}</span>` : ''}
          <span style="margin-left:auto; font-size:10px">▼</span>
        </div>
        <div class="tool-content">${escapeHtml(JSON.stringify(args, null, 2))}${resultText ? '\n\n--- Result ---\n' + resultText : ''}</div>
      </div>`;
    }
  }

  if (typeof props.msg.content === 'string' && !Array.isArray(props.msg.content)) {
    textContent = props.msg.content;
  }

  // Render thinking content from top-level `thinking` property (streaming case)
  const thinkingText = getThinkingContent();
  if (thinkingText) {
    html = `<div class="thinking-block">
      <div class="thinking-header" onclick="toggleThinking(this)">
        🧠 <span>Thinking</span>
        <span style="margin-left:auto; font-size:10px">▼</span>
      </div>
      <div class="thinking-content">${renderMarkdown(thinkingText)}</div>
    </div>` + html;
  }

  return html + renderMarkdown(textContent);
});

// Tool grouping logic
const CONTEXT_TOOL_ICONS = {
  read: '📄',
  glob: '🔍',
  grep: '🔎',
  list: '📁',
};

const TOOL_STATE_ICONS = {
  pending: '⏳',
  running: '⚙️',
  completed: '✅',
  error: '❌',
};

function groupContextTools(blocks, contextTools) {
  const result = [];
  let currentGroup = null;

  for (const block of blocks) {
    const isContext = contextTools.has(block.name);

    if (isContext) {
      if (!currentGroup) {
        currentGroup = { type: 'group', tools: [] };
      }
      currentGroup.tools.push(block);
    } else {
      // Flush current group
      if (currentGroup) {
        result.push(currentGroup);
        currentGroup = null;
      }
      result.push({ type: 'tool', block });
    }
  }

  // Flush remaining group
  if (currentGroup) {
    result.push(currentGroup);
  }

  return result;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Global toggle functions for v-html onclick handlers
window.toggleTool = function(header) {
  const content = header.nextElementSibling;
  if (content && content.classList.contains('tool-content')) {
    content.classList.toggle('collapsed');
  }
};

window.toggleThinking = function(header) {
  const content = header.nextElementSibling;
  if (content && content.classList.contains('thinking-content')) {
    content.classList.toggle('collapsed');
  }
};
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

.message.toolResult .message-avatar {
  background: var(--info-dim);
  color: var(--info);
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
</style>
