import { marked } from 'marked';
import hljs from 'highlight.js';

// Configure marked with highlight.js
marked.setOptions({
  highlight(code, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(code, { language: lang }).value;
      } catch {
        // Fall through to default
      }
    }
    // Auto-detect language
    try {
      return hljs.highlightAuto(code).value;
    } catch {
      return code;
    }
  },
  gfm: true,
  breaks: false,
});

export function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

export function renderMarkdown(text) {
  if (!text) return '';

  // Use marked for rendering
  const rawHtml = marked.parse(text);

  // Post-process to add our custom classes and copy buttons to code blocks
  return rawHtml
    // Wrap fenced code blocks with our custom container
    .replace(
      /<pre><code class="language-(\w+)?"(?:[^>]*)?>([\s\S]*?)<\/code><\/pre>/g,
      (match, lang, code) => {
        const langLabel = lang || 'code';
        const id = 'code-' + Math.random().toString(36).slice(2, 8);
        return `<div class="code-block">
          <div class="code-header">
            <span>${escapeHtml(langLabel)}</span>
            <button class="code-copy" onclick="copyCode('${id}', this)">Copy</button>
          </div>
          <pre><code id="${id}">${code}</code></pre>
        </div>`;
      }
    )
    // Handle code blocks without language class
    .replace(
      /<pre><code>([\s\S]*?)<\/code><\/pre>/g,
      (match, code) => {
        const id = 'code-' + Math.random().toString(36).slice(2, 8);
        return `<div class="code-block">
          <div class="code-header">
            <span>code</span>
            <button class="code-copy" onclick="copyCode('${id}', this)">Copy</button>
          </div>
          <pre><code id="${id}">${code}</code></pre>
        </div>`;
      }
    );
}

export function formatNumber(n) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  return n.toLocaleString();
}

export function formatBytes(bytes) {
  if (bytes === null || bytes === undefined) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
