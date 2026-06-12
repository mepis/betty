export function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

export function renderMarkdown(text) {
  if (!text) return '';

  let html = escapeHtml(text);

  // Code blocks (fenced)
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
    const langLabel = lang || 'code';
    const id = 'code-' + Math.random().toString(36).slice(2, 8);
    return `<div class="code-block">
      <div class="code-header">
        <span>${escapeHtml(langLabel)}</span>
        <button class="code-copy" onclick="copyCode('${id}', this)">Copy</button>
      </div>
      <pre><code id="${id}">${code.trim()}</code></pre>
    </div>`;
  });

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Headers
  html = html.replace(/^###### (.+)$/gm, '<h6>$1</h6>');
  html = html.replace(/^##### (.+)$/gm, '<h5>$1</h5>');
  html = html.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

  // Bold and italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');

  // Blockquotes
  html = html.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>');

  // Horizontal rule
  html = html.replace(/^---$/gm, '<hr>');

  // Unordered lists
  html = html.replace(/^[\-\*] (.+)$/gm, '<li>$1</li>');
  html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, '<ul>$1</ul>');

  // Ordered lists
  html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');

  // Paragraphs
  html = html.replace(/\n\n/g, '</p><p>');
  html = html.replace(/\n/g, '<br>');

  if (!html.startsWith('<')) {
    html = '<p>' + html + '</p>';
  }

  // Clean up
  html = html.replace(/<p><\/p>/g, '');
  html = html.replace(/<p>(<h[1-6]>)/g, '$1');
  html = html.replace(/(<\/h[1-6]>)<\/p>/g, '$1');
  html = html.replace(/<p>(<ul>)/g, '$1');
  html = html.replace(/(<\/ul>)<\/p>/g, '$1');
  html = html.replace(/<p>(<blockquote>)/g, '$1');
  html = html.replace(/(<\/blockquote>)<\/p>/g, '$1');
  html = html.replace(/<p>(<div class="code-block">)/g, '$1');
  html = html.replace(/(<\/div>)<\/p>/g, '$1');
  html = html.replace(/<p>(<hr>)<\/p>/g, '$1');

  return html;
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

export function renderMarkdownResults(md) {
  if (!md || md.trim() === '') return '<div class="empty-state">No results yet. Run a benchmark to see results here.</div>';

  const sections = md.split(/^## /m);
  let html = '';

  sections.forEach((section, i) => {
    if (i === 0) {
      const lines = section.trim().split('\n');
      html += `<div class="results-section">`;
      html += `<h2>${lines[0]}</h2>`;
      if (lines[1]) html += `<p>${lines[1]}</p>`;
      if (lines[2]) html += `<p>${lines[2]}</p>`;
      html += `</div>`;
      return;
    }

    const lines = section.trim().split('\n');
    const title = lines[0];

    let inTable = false;
    let headerParsed = false;

    for (let j = 1; j < lines.length; j++) {
      const line = lines[j].trim();
      if (line.startsWith('|') && line.endsWith('|')) {
        if (!inTable) {
          inTable = true;
          if (line.includes('---')) {
            headerParsed = true;
            continue;
          }
          if (!headerParsed) {
            const headers = line.split('|').filter(c => c.trim()).map(c => c.trim());
            html += `<div class="results-section"><h3>${title}</h3><div class="results-table-container"><table><thead><tr>`;
            headers.forEach(h => { html += `<th>${h}</th>`; });
            html += `</tr></thead><tbody>`;
            continue;
          }
        }
        if (inTable && headerParsed) {
          const cells = line.split('|').filter(c => c.trim()).map(c => c.trim());
          const isAborted = line.includes('Aborted') || line.includes('*Aborted');
          html += `<tr class="${isAborted ? 'aborted-row' : ''}">`;
          cells.forEach(c => { html += `<td>${c}</td>`; });
          html += `</tr>`;
        }
      } else {
        if (inTable) {
          html += `</tbody></table></div></div>`;
          inTable = false;
          headerParsed = false;
        }
        if (line && !line.startsWith('#')) {
          html += `<p>${line}</p>`;
        }
      }
    }

    if (inTable) {
      html += `</tbody></table></div></div>`;
    }
  });

  return html;
}
