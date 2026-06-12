<template>
  <div>
    <div class="page-header">
      <h2>Saved Reports</h2>
      <button class="btn btn-primary" @click="showSaveModal">💾 Save Current as Report</button>
    </div>

    <div v-if="!viewingReport" class="reports-list">
      <div v-if="!reports.length" class="empty-state">No saved reports yet.</div>
      <div v-for="r in reports" :key="r.name" class="report-card" @click="viewReport(r.name)">
        <h4>{{ r.name }}</h4>
        <div class="report-meta">Saved: {{ new Date(r.modified).toLocaleString() }}</div>
      </div>
    </div>

    <div v-else class="report-viewer">
      <div class="report-viewer-header">
        <button class="btn btn-outline" @click="backToList">← Back to Reports</button>
        <h3>{{ currentReportName }}</h3>
        <div class="report-viewer-actions">
          <button class="btn btn-secondary" @click="downloadReport">📥 Download</button>
          <button class="btn btn-danger" @click="deleteCurrentReport">🗑 Delete</button>
        </div>
      </div>
      <div class="report-content" v-html="reportContent"></div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { renderMarkdownResults } from '../utils.js';

defineEmits(['save-report']);

const reports = ref([]);
const viewingReport = ref(false);
const currentReportName = ref('');
const reportContent = ref('');
const currentReportData = ref(null);

async function loadReports() {
  try {
    const res = await fetch('/api/reports');
    const data = await res.json();
    if (data.success) reports.value = data.data;
  } catch (err) {
    console.error('Failed to load reports:', err.message);
  }
}

async function viewReport(name) {
  try {
    currentReportName.value = name;
    const res = await fetch(`/api/report/${name}`);
    const data = await res.json();
    if (data.success) {
      currentReportData.value = data.data;
      reportContent.value = data.data.mdContent
        ? renderMarkdownResults(data.data.mdContent)
        : '<div class="empty-state">No content available.</div>';
      viewingReport.value = true;
    }
  } catch (err) {
    console.error('Failed to load report:', err.message);
  }
}

function backToList() {
  viewingReport.value = false;
  currentReportName.value = '';
  reportContent.value = '';
  currentReportData.value = null;
}

async function deleteCurrentReport() {
  if (!currentReportName.value || !confirm(`Delete report "${currentReportName.value}"?`)) return;
  try {
    const res = await fetch(`/api/report/${currentReportName.value}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      backToList();
      await loadReports();
    }
  } catch (err) {
    console.error('Failed to delete:', err.message);
  }
}

function downloadReport() {
  if (!currentReportName.value) return;
  const html = reportContent.value;
  const blob = new Blob([`<html><head><title>${currentReportName.value}</title><style>
    body { font-family: -apple-system, sans-serif; padding: 20px; color: #e6edf3; background: #0d1117; }
    table { width: 100%; border-collapse: collapse; margin: 12px 0; }
    th, td { border: 1px solid #30363d; padding: 8px 12px; text-align: left; }
    th { background: #1c2333; }
    h2, h3 { color: #e6edf3; }
    p { color: #8b949e; }
  </style></head><body>${html}</body></html>`], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${currentReportName.value}.html`;
  a.click();
  URL.revokeObjectURL(url);
}

function showSaveModal() {
  const name = prompt('Report name (optional, press Cancel to use default):', '');
  if (name !== null) {
    fetch('/api/save-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim() }),
    })
    .then(r => r.json())
    .then(async data => {
      if (data.success) {
        await loadReports();
      }
    })
    .catch(err => console.error('Failed to save:', err.message));
  }
}

onMounted(() => loadReports());
</script>

<style scoped>
.page-header {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 20px; flex-wrap: wrap; gap: 12px;
}

.btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 8px 16px; border: 1px solid var(--border-color);
  border-radius: 4px; font-size: 0.85rem; font-weight: 500;
  cursor: pointer; transition: all 0.15s;
}
.btn-primary { background: var(--btn-primary-bg); color: #fff; border-color: var(--btn-primary-bg); }
.btn-primary:hover { background: var(--btn-primary-hover); }
.btn-secondary { background: var(--btn-secondary-bg); color: var(--text-primary); }
.btn-secondary:hover { background: var(--btn-secondary-hover); }
.btn-outline { background: transparent; color: var(--text-secondary); }
.btn-outline:hover { background: var(--bg-tertiary); color: var(--text-primary); }
.btn-danger { background: var(--btn-danger-bg); color: #fff; border-color: var(--btn-danger-bg); }
.btn-danger:hover { background: var(--btn-danger-hover); }

.empty-state { color: var(--text-muted); text-align: center; padding: 40px 20px; }

.reports-list {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 12px;
}

.report-card {
  background: var(--bg-card); border: 1px solid var(--border-color);
  border-radius: var(--radius); padding: 16px; cursor: pointer; transition: all 0.15s;
}
.report-card:hover { border-color: var(--accent-blue); background: var(--bg-tertiary); }
.report-card h4 { font-size: 0.95rem; font-weight: 600; color: var(--text-primary); margin-bottom: 6px; }
.report-card .report-meta { font-size: 0.8rem; color: var(--text-muted); }

.report-viewer {
  background: var(--bg-card); border: 1px solid var(--border-color);
  border-radius: var(--radius); padding: 20px;
}
.report-viewer-header {
  display: flex; align-items: center; gap: 12px; margin-bottom: 20px;
  padding-bottom: 16px; border-bottom: 1px solid var(--border-color); flex-wrap: wrap;
}
.report-viewer-header h3 { flex: 1; font-size: 1.1rem; font-weight: 600; color: var(--text-primary); }
.report-viewer-actions { display: flex; gap: 8px; }

.report-content { overflow-x: auto; }
:deep(.results-section) { margin-bottom: 24px; }
:deep(.results-section h2) { color: var(--text-primary); margin: 20px 0 10px; }
:deep(.results-section h3) { color: var(--text-primary); margin: 20px 0 10px; }
:deep(.results-section p) { color: var(--text-secondary); margin-bottom: 8px; }
:deep(table) { width: 100%; border-collapse: collapse; font-size: 0.85rem; margin-bottom: 16px; }
:deep(table th) { background: var(--bg-tertiary); color: var(--text-secondary); font-weight: 600; text-align: left; padding: 8px 12px; border: 1px solid var(--border-color); }
:deep(table td) { padding: 6px 12px; border: 1px solid var(--border-light); color: var(--text-primary); }
</style>
