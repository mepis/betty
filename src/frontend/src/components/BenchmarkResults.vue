<template>
  <div>
    <div class="page-header">
      <h2>Results</h2>
      <div class="header-actions">
        <button class="btn btn-outline" @click="loadResults">↻ Refresh</button>
        <button class="btn btn-secondary" @click="$emit('save-report')">💾 Save Report</button>
      </div>
    </div>
    <div v-if="resultsHtml" v-html="resultsHtml"></div>
    <div v-else class="empty-state">No results yet. Run a benchmark to see results here.</div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { renderMarkdownResults } from '../utils.js';

defineEmits(['refresh', 'save-report']);

const resultsHtml = ref('');

async function loadResults() {
  try {
    const res = await fetch('/api/results');
    const data = await res.json();
    if (data.success) {
      resultsHtml.value = renderMarkdownResults(data.data);
    }
  } catch (err) {
    console.error('Failed to load results:', err.message);
  }
}

onMounted(() => {
  loadResults();
});
</script>

<style scoped>
.page-header {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 20px; flex-wrap: wrap; gap: 12px;
}
.header-actions { display: flex; gap: 8px; flex-wrap: wrap; }

.btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 8px 16px; border: 1px solid var(--border-color);
  border-radius: 4px; font-size: 0.85rem; font-weight: 500;
  cursor: pointer; transition: all 0.15s;
}
.btn-outline { background: transparent; color: var(--text-secondary); }
.btn-outline:hover { background: var(--bg-tertiary); color: var(--text-primary); }
.btn-secondary { background: var(--btn-secondary-bg); color: var(--text-primary); }
.btn-secondary:hover { background: var(--btn-secondary-hover); }

.empty-state {
  color: var(--text-muted); text-align: center; padding: 40px 20px;
}

:deep(.results-section) { margin-bottom: 24px; }
:deep(.results-section h2) { color: var(--text-primary); margin: 0 0 10px; font-size: 1.5rem; }
:deep(.results-section h3) { color: var(--text-primary); margin: 0 0 12px; font-size: 1.1rem; padding-bottom: 8px; border-bottom: 1px solid var(--border-color); }
:deep(.results-section p) { color: var(--text-secondary); margin-bottom: 8px; }

:deep(.results-table-container) { overflow-x: auto; margin-bottom: 20px; }
:deep(.results-table) { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
:deep(.results-table th) {
  background: var(--bg-tertiary); color: var(--text-secondary); font-weight: 600;
  text-align: left; padding: 10px 12px; border: 1px solid var(--border-color);
}
:deep(.results-table td) { padding: 8px 12px; border: 1px solid var(--border-light); color: var(--text-primary); }
:deep(.results-table tr:hover td) { background: rgba(88, 166, 255, 0.05); }
:deep(.results-table .highlight-row td) { background: rgba(63, 185, 80, 0.08); }
:deep(.results-table .aborted-row td) { color: var(--accent-red); font-style: italic; }
</style>
