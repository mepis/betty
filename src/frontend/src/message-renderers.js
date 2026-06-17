import { renderMarkdown, escapeHtml } from './utils.js';

// ─── Constants ───────────────────────────────────────────────────────────

/** Icon mapping for context tools (read, glob, grep, list) */
export const CONTEXT_TOOL_ICONS = {
  read: '📄',
  glob: '🔍',
  grep: '🔎',
  list: '📁',
};

/** Set of tool names that are considered "context" tools */
export const CONTEXT_TOOLS = new Set(['read', 'glob', 'grep', 'list']);

/** Icon mapping for tool call states */
export const TOOL_STATE_ICONS = {
  pending: '⏳',
  running: '⚙️',
  completed: '✅',
  error: '❌',
};

// ─── Helpers ─────────────────────────────────────────────────────────────

/**
 * Safely stringify an object, handling circular references.
 * @param {*} obj
 * @param {number} [indent]
 * @returns {string}
 */
export function safeStringify(obj, indent = 2) {
  const seen = new WeakSet();
  try {
    return JSON.stringify(obj, (key, val) => {
      if (val && typeof val === 'object') {
        if (seen.has(val)) return '[circular]';
        seen.add(val);
      }
      return val;
    }, indent);
  } catch {
    return '[unserializable]';
  }
}

/**
 * Format token usage stats into a human-readable string.
 * @param {{inputTokens?: number, outputTokens?: number, totalTokens?: number}} usage
 * @returns {string}
 */
export function rUsageString(usage) {
  const parts = [];
  if (usage.inputTokens) parts.push(`${usage.inputTokens} in`);
  if (usage.outputTokens) parts.push(`${usage.outputTokens} out`);
  if (usage.totalTokens) parts.push(`${usage.totalTokens} total`);
  return parts.join(', ');
}

/**
 * Check if an image URL is safe to render.
 * @param {string} url
 * @returns {boolean}
 */
export function isSafeImageUrl(url) {
  return url && (url.startsWith('data:') || url.startsWith('/'));
}

/**
 * Group consecutive context tool blocks together.
 * @param {Array<{name: string}>} blocks
 * @returns {Array<{type: 'group', tools: Array} | {type: 'tool', block: Object}>}
 */
export function groupContextTools(blocks) {
  const result = [];
  let currentGroup = null;

  for (const block of blocks) {
    const isContext = CONTEXT_TOOLS.has(block.name);

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

// ─── Renderers ───────────────────────────────────────────────────────────

/**
 * Render a thinking block as HTML.
 * @param {string} thinkingText
 * @returns {string}
 */
export function renderThinkingBlock(thinkingText) {
  return `<div class="thinking-block">
    <div class="thinking-header" data-toggle="thinking" role="button" tabindex="0">
      🧠 <span>Thinking</span>
      <span style="margin-left:auto; font-size:10px">▼</span>
    </div>
    <div class="thinking-content collapsed">${renderMarkdown(thinkingText)}</div>
  </div>`;
}

/**
 * Render a tool call block as HTML.
 * @param {Object} tc
 * @param {string} tc.name
 * @param {string} [tc.status]
 * @param {Object} [tc.args]
 * @param {*} [tc.result]
 * @param {boolean} [tc.isError]
 * @returns {string}
 */
export function renderToolCallBlock(tc) {
  const stateClass = tc.status ? `tool-${tc.status}` : '';
  const stateIcon = TOOL_STATE_ICONS[tc.status] || '🔧';
  const args = tc.args || tc.arguments || {};
  const path = args.path || args.file || args.pattern || '';
  let resultText = '';
  if (tc.result !== undefined && tc.result !== null) {
    if (typeof tc.result === 'string') {
      resultText = escapeHtml(tc.result);
    } else {
      resultText = escapeHtml(safeStringify(tc.result));
    }
  }

  return `<div class="tool-call ${stateClass}">
    <div class="tool-header" data-toggle="tool" role="button" tabindex="0">
      <span class="tool-state-icon">${stateIcon}</span>
      <span>${escapeHtml(tc.name)}</span>
      ${path ? `<span class="tool-path">${escapeHtml(path)}</span>` : ''}
      <span style="margin-left:auto; font-size:10px">▼</span>
    </div>
    <div class="tool-content collapsed">${escapeHtml(safeStringify(args))}${resultText ? '\n\n--- Result ---\n' + resultText : ''}</div>
  </div>`;
}

/**
 * Render a subagent call block as HTML.
 * @param {Object} tc
 * @param {string} tc.name
 * @param {Object} [tc.args]
 * @param {string} [tc.status]
 * @param {*} [tc.result]
 * @param {*} [tc.details]
 * @param {boolean} [tc.isError]
 * @returns {string}
 */
export function renderSubagentBlock(tc) {
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
      resultText = safeStringify(tc.result);
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

  const contentHtml = resultText
    ? `<div class="subagent-output">${renderMarkdown(resultText)}</div>`
    : (tc.status === 'running' ? '<div class="subagent-output"><em>Running...</em></div>' : '');

  return `<div class="subagent-block tool-call ${stateClass}">
    <div class="subagent-header" data-toggle="subagent" role="button" tabindex="0">
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

/**
 * Render a group of context tools as HTML.
 * @param {Array<{name: string, arguments: Object}>} tools
 * @returns {string}
 */
export function renderContextToolGroup(tools) {
  const summary = tools.map(t => {
    const icon = CONTEXT_TOOL_ICONS[t.name] || '📄';
    return `${icon} ${escapeHtml(t.name)}`;
  }).join(', ');
  const details = tools.map(t => {
    const args = t.arguments || {};
    const path = args.path || args.file || args.pattern || args.directory || '';
    return `<div class="context-tool-item">${escapeHtml(path || t.name)}</div>`;
  }).join('');

  return `<div class="context-tool-group">
    <div class="context-tool-header" data-toggle="context-tool" role="button" tabindex="0">
      <span class="context-tool-icon">📂</span>
      <span>Gathering context (${tools.length})</span>
      <span class="context-tool-summary">${summary}</span>
      <span style="margin-left:auto; font-size:10px">▼</span>
    </div>
    <div class="context-tool-content collapsed">${details}</div>
  </div>`;
}

/**
 * Render a user message as HTML.
 * @param {Object} msg
 * @param {Array|{}} msg.content
 * @returns {string}
 */
export function renderUserMessage(msg) {
  let content = '';
  const images = [];
  if (Array.isArray(msg.content)) {
    for (const block of msg.content) {
      if (block.type === 'image' && block.imageUrl && isSafeImageUrl(block.imageUrl)) {
        images.push(block.imageUrl);
      } else if (block.type === 'text') {
        content += block.text || '';
      }
    }
  } else if (typeof msg.content === 'string') {
    content = msg.content;
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

/**
 * Render an assistant message as HTML.
 * Handles both streaming (string content) and final (block content) formats.
 * @param {Object} msg
 * @param {boolean} [isStreaming]
 * @returns {string}
 */
export function renderAssistantMessage(msg, isStreaming = false) {
  let secondaryHtml = '';
  let textContent = '';
  const toolBlocks = [];
  let thinkingRenderedFromBlocks = false;

  if (Array.isArray(msg.content)) {
    for (const block of msg.content) {
      if (block.type === 'thinking') {
        thinkingRenderedFromBlocks = true;
        secondaryHtml += renderThinkingBlock(block.thinking);
      } else if (block.type === 'text') {
        textContent += block.text || '';
      } else if (block.type === 'toolCall') {
        toolBlocks.push(block);
      }
    }
  }

  // Group consecutive context tools
  const grouped = groupContextTools(toolBlocks);

  // Render grouped tools
  for (const item of grouped) {
    if (item.type === 'group') {
      secondaryHtml += renderContextToolGroup(item.tools);
    } else if (item.type === 'tool') {
      const toolBlock = item.block;
      if (toolBlock.name === 'subagent') {
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
        const resultText = toolBlock.result !== undefined ? escapeHtml(safeStringify(toolBlock.result)) : '';
        secondaryHtml += `<div class="tool-call ${stateClass}">
          <div class="tool-header" data-toggle="tool" role="button" tabindex="0">
            <span class="tool-state-icon">${stateIcon}</span>
            <span>${escapeHtml(toolBlock.name)}</span>
            ${path ? `<span class="tool-path">${escapeHtml(path)}</span>` : ''}
            <span style="margin-left:auto; font-size:10px">▼</span>
          </div>
          <div class="tool-content collapsed">${escapeHtml(safeStringify(args))}${resultText ? '\n\n--- Result ---\n' + resultText : ''}</div>
        </div>`;
      }
    }
  }

  // Handle string content (streaming case)
  if (typeof msg.content === 'string' && !Array.isArray(msg.content)) {
    textContent = msg.content;
  }

  // Render thinking content from top-level `thinking` property (streaming case)
  const thinkingText = msg.thinking
    ? msg.thinking
    : (Array.isArray(msg.content)
      ? msg.content.find(b => b.type === 'thinking')?.thinking || ''
      : '');
  if (thinkingText && !thinkingRenderedFromBlocks) {
    secondaryHtml += renderThinkingBlock(thinkingText);
  }

  // Render streaming tool calls from msg.toolCalls
  if (Array.isArray(msg.toolCalls) && msg.toolCalls.length > 0) {
    for (const tc of msg.toolCalls) {
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
            resultText = escapeHtml(safeStringify(tc.result));
          }
        }
        secondaryHtml += `<div class="tool-call ${stateClass}">
          <div class="tool-header" data-toggle="tool" role="button" tabindex="0">
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
    const primaryClass = isStreaming ? 'primary-response streaming-cursor' : 'primary-response';
    primaryHtml = `<div class="${primaryClass}">${renderMarkdown(textContent)}</div>`;
  }
  return primaryHtml + secondaryHtml;
}
