<template>
  <div class="markdown-content" v-html="renderedHtml"></div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import hljs from 'highlight.js';
import 'highlight.js/styles/github-dark.css';

const customRenderer = new marked.Renderer();
customRenderer.code = function ({ text, lang, escaped }: { text: string; lang?: string; escaped?: boolean }) {
  const highlighted =
    lang && hljs.getLanguage(lang)
      ? hljs.highlight(text, { language: lang }).value
      : hljs.highlightAuto(text).value;
  const langLabel = lang || 'text';
  const escapedCode = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
  return `<div class="code-block">
    <div class="code-header">
      <span class="code-lang">${langLabel}</span>
      <button class="copy-btn" onclick="const code=this.closest('.code-block').querySelector('code').textContent;navigator.clipboard.writeText(code);this.textContent='Copied!';setTimeout(()=>{this.textContent='Copy'},2000)">Copy</button>
    </div>
    <pre><code class="hljs language-${langLabel}">${highlighted}</code></pre>
  </div>`;
};

marked.use({
  breaks: true,
  gfm: true,
  renderer: customRenderer,
});

const props = defineProps<{
  content: string;
}>();

const renderedHtml = computed(() => {
  const html = marked.parse(props.content, { async: false }) as string;
  return DOMPurify.sanitize(html);
});
</script>
