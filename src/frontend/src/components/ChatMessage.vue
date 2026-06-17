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
      <span v-if="isStreaming && !hasContent" class="thinking-shimmer">
        <span></span><span></span><span></span>
      </span>
      <span v-else-if="isStreaming" class="typing-indicator">
        <span></span><span></span><span></span>
      </span>
      <span class="message-time" v-if="time">{{ time }}</span>
    </div>
    <div v-if="hasContent || isStreaming" class="message-content" v-html="contentHtml"></div>
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

  // Context tools that should be grouped together
  const CONTEXT_TOOLS = new Set(['read', 'glob', 'grep', 'list']);

  let secondaryHtml = '';
  let textContent = '';
  const toolBlocks = [];

  if (Array.isArray(props.msg.content)) {
    for (const block of props.msg.content) {
      if (block.type === 'thinking') {
        secondaryHtml += `<div class="thinking-block">
          <div class="thinking-header" onclick="toggleThinking(this)">
            🧠 <span>Thinking</span>
            <span style="margin-left:auto; font-size:10px">▼</span>
          </div>
          <div class="thinking-content collapsed">${renderMarkdown(block.thinking)}</div>
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
      secondaryHtml += `<div class="context-tool-group">
        <div class="context-tool-header" onclick="toggleTool(this)">
          <span class="context-tool-icon">📂</span>
          <span>Gathering context (${item.tools.length})</span>
          <span class="context-tool-summary">${summary}</span>
          <span style="margin-left:auto; font-size:10px">▼</span>
        </div>
        <div class="context-tool-content collapsed">${details}</div>
      </div>`;
    } else if (item.type === 'tool') {
      // Individual tool call
      const toolBlock = item.block;
      if (toolBlock.name === 'subagent') {
        // Render as subagent block
        const tc = {
          name: toolBlock.name,
          args: toolBlock.arguments || {},
          status: toolBlock.status || 'completed',
          result: toolBlock.result,
          details: toolBlock.details,
          isError: toolBlock.status === 'error',
        };
        secondaryHtml += renderSubagentBlock(tc);
      } else {
        const stateClass = toolBlock.status ? `tool-${toolBlock.status}` : '';
        const stateIcon = TOOL_STATE_ICONS[toolBlock.status] || '🔧';
        const args = toolBlock.arguments || {};
        const path = args.path || args.file || args.pattern || '';
        const resultText = toolBlock.result !== undefined ? escapeHtml(JSON.stringify(toolBlock.result, null, 2)) : '';
        secondaryHtml += `<div class="tool-call ${stateClass}">
          <div class="tool-header" onclick="toggleTool(this)">
            <span class="tool-state-icon">${stateIcon}</span>
            <span>${escapeHtml(toolBlock.name)}</span>
            ${path ? `<span class="tool-path">${escapeHtml(path)}</span>` : ''}
            <span style="margin-left:auto; font-size:10px">▼</span>
          </div>
          <div class="tool-content collapsed">${escapeHtml(JSON.stringify(args, null, 2))}${resultText ? '\n\n--- Result ---\n' + resultText : ''}</div>
        </div>`;
      }
    }
  }

  if (typeof props.msg.content === 'string' && !Array.isArray(props.msg.content)) {
    textContent = props.msg.content;
  }

  // Render thinking content from top-level `thinking` property (streaming case)
  const thinkingText = getThinkingContent();
  if (thinkingText) {
    secondaryHtml += `<div class="thinking-block">
      <div class="thinking-header" onclick="toggleThinking(this)">
        🧠 <span>Thinking</span>
        <span style="margin-left:auto; font-size:10px">▼</span>
      </div>
      <div class="thinking-content collapsed">${renderMarkdown(thinkingText)}</div>
    </div>`;
  }

  // Render streaming tool calls from msg.toolCalls
  if (Array.isArray(props.msg.toolCalls) && props.msg.toolCalls.length > 0) {
    for (const tc of props.msg.toolCalls) {
      if (tc.name === 'subagent') {
        secondaryHtml += renderSubagentBlock(tc);
      } else {
        const stateClass = tc.status ? `tool-${tc.status}` : '';
        const stateIcon = tc.status === 'running' ? '⏳' : (tc.isError ? '❌' : '✅');
        let resultText = '';
        if (tc.result !== undefined && tc.result !== null) {
          if (typeof tc.result === 'string') {
            resultText = escapeHtml(tc.result);
          } else {
            resultText = escapeHtml(JSON.stringify(tc.result, null, 2));
          }
        }
        secondaryHtml += `<div class="tool-call ${stateClass}">
          <div class="tool-header" onclick="toggleTool(this)">
            <span class="tool-state-icon">${stateIcon}</span>
            <span>${escapeHtml(tc.name)}</span>
            <span style="margin-left:auto; font-size:10px">▼</span>
          </div>
          <div class="tool-content collapsed">${resultText || (tc.status === 'running' ? '<em>Running...</em>' : '<em>No output</em>')}</div>
        </div>`;
      }
    }
  }

  // Primary text first, secondary content (collapsible panels) after
  let primaryHtml = '';
  if (textContent) {
    const primaryClass = props.isStreaming ? 'primary-response streaming-cursor' : 'primary-response';
    primaryHtml = `<div class="${primaryClass}">${renderMarkdown(textContent)}</div>`;
  }
  return primaryHtml + secondaryHtml;
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

function renderSubagentBlock(tc) {
  const stateClass = tc.status ? `tool-${tc.status}` : '';
  const stateIcon = tc.status === 'running' ? '⏳' : (tc.isError ? '❌' : '✅');
  const args = tc.args || {};
  const mode = args.mode || 'single';
  const agent = args.agent || (mode === 'single' ? 'unknown' : '');
  const task = args.task || '';
  const modeLabel = mode === 'single' ? `→ ${escapeHtml(agent)}` : `${mode} (${(args.tasks || []).length || 0})`;
  
  // Extract result text
  let resultText = '';
  if (tc.result !== undefined && tc.result !== null) {
    if (typeof tc.result === 'string') {
      resultText = tc.result;
    } else if (Array.isArray(tc.result)) {
      // content array: [{ type: "text", text: "..." }]
      resultText = tc.result.filter(b => b.type === 'text').map(b => b.text).join('\n');
    } else {
      resultText = JSON.stringify(tc.result, null, 2);
    }
  }
  
  // Extract details
  const details = tc.details;
  let detailsHtml = '';
  if (details && details.results && details.results.length > 0) {
    for (const r of details.results) {
      const rAgent = r.agent || 'unknown';
      const rTask = r.task || '';
      const rStatus = r.exitCode === 0 ? '✅' : '❌';
      const rUsage = r.usage ? `${rUsageString(r.usage)}` : '';
      const rModel = r.model ? ` (${escapeHtml(r.model)})` : '';
      const rStderr = r.stderr ? `<div class="subagent-stderr">${escapeHtml(r.stderr.slice(0, 500))}</div>` : '';
      const rError = r.errorMessage ? `<div class="subagent-error">${escapeHtml(r.errorMessage)}</div>` : '';
      detailsHtml += `<div class="subagent-result-item">
        <div class="subagent-result-header">${rStatus} ${escapeHtml(rAgent)}${rModel}</div>
        <div class="subagent-task">${escapeHtml(rTask)}</div>
        ${rUsage ? `<div class="subagent-usage">${rUsage}</div>` : ''}
        ${rError}
        ${rStderr}
      </div>`;
    }
  }
  
  const contentHtml = resultText ? `<div class="subagent-output">${renderMarkdown(resultText)}</div>` : (tc.status === 'running' ? '<div class="subagent-output"><em>Running...</em></div>' : '');
  
  return `<div class="subagent-block tool-call ${stateClass}">
    <div class="subagent-header" onclick="toggleSubagent(this)">
      <span class="tool-state-icon">${stateIcon}</span>
      <span class="subagent-icon">🤖</span>
      <span>Subagent</span>
      <span class="subagent-mode">${modeLabel}</span>
      ${task ? `<span class="subagent-task-preview">${escapeHtml(task.slice(0, 60))}${task.length > 60 ? '…' : ''}</span>` : ''}
      <span style="margin-left:auto; font-size:10px">▼</span>
    </div>
    <div class="subagent-content collapsed">
      ${task ? `<div class="subagent-task">${escapeHtml(task)}</div>` : ''}
      ${detailsHtml}
      ${contentHtml}
    </div>
  </div>`;
}

function rUsageString(usage) {
  const parts = [];
  if (usage.inputTokens) parts.push(`${usage.inputTokens} in`);
  if (usage.outputTokens) parts.push(`${usage.outputTokens} out`);
  if (usage.totalTokens) parts.push(`${usage.totalTokens} total`);
  return parts.join(', ');
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
