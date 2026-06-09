// === State ===
const state = {
  configs: null,
  originalConfigs: null,
  status: 'idle',
  testRun: 0,
  liveResults: [],
  currentReportName: null,
  sse: null,
  initialized: false,
};

// === Config Schema ===
// Maps JSON paths to UI field definitions
const configSchema = [
  {
    title: 'Server',
    fields: [
      { path: 'llama_host', label: 'Llama Host', type: 'text' },
      { path: 'llama_port', label: 'Llama Port', type: 'number' },
      { path: 'model', label: 'Model File', type: 'text' },
      { path: 'model_directory', label: 'Model Directory', type: 'text' },
      { path: 'llama_cache', label: 'Llama Cache', type: 'text' },
      { path: 'max_sys_mem', label: 'Max System Memory (%)', type: 'number', hint: 'Abort if system memory exceeds this %' },
      { path: 'build_cores', label: 'Build Cores', type: 'number' },
      { path: 'skip_build', label: 'Skip Build', type: 'toggle' },
    ],
  },
  {
    title: 'Build Parameters',
    fields: [
      { path: 'build_make_params.enable_ccache', label: 'Enable ccache', type: 'toggle' },
      { path: 'build_make_params.enable_lto', label: 'Enable LTO', type: 'toggle' },
      { path: 'build_make_params.enable_cuda', label: 'Enable CUDA', type: 'toggle' },
      { path: 'build_make_params.enable_cuda_fa', label: 'Enable CUDA Flash Attention', type: 'toggle' },
      { path: 'build_make_params.enable_cuda_graphs', label: 'Enable CUDA Graphs', type: 'toggle' },
      { path: 'build_make_params.enable_cuda_nccl', label: 'Enable CUDA NCCL', type: 'toggle' },
      { path: 'build_make_params.enable_cuda_per_max_batch_size', label: 'Peer Max Batch Size', type: 'toggle', valuePath: 'build_make_params.peer_batch_size', valueLabel: 'Value' },
      { path: 'build_make_params.enable_cuda_peer_copy', label: 'Enable CUDA Peer Copy', type: 'toggle' },
      { path: 'build_make_params.enable_cuda_custom_arch', label: 'Enable CUDA Custom Arch', type: 'toggle' },
      { path: 'build_make_params.enable_cuda_fa_all_quants', label: 'CUDA FA All Quants', type: 'toggle', valuePath: 'build_make_params.cuda_all_quants', valueLabel: 'Value' },
      { path: 'build_make_params.enable_cuda_fp16', label: 'Enable CUDA FP16', type: 'toggle', valuePath: 'build_make_params.cuda_fp16', valueLabel: 'Value' },
      { path: 'build_make_params.enable_cuda_scheduled_max_copies', label: 'CUDA Scheduled Max Copies', type: 'toggle', valuePath: 'build_make_params.cuda_max_scheduled_copies', valueLabel: 'Value' },
      { path: 'build_make_params.enable_cuda_compression_level', label: 'CUDA Compression Level', type: 'toggle', valuePath: 'build_make_params.cuda_compression_level', valueLabel: 'Value' },
    ],
  },
  {
    title: 'Model Parameters',
    fields: [
      { path: 'model_configs.temp', label: 'Temperature', type: 'number', step: '0.01' },
      { path: 'model_configs.top_p', label: 'Top-P', type: 'number', step: '0.01' },
      { path: 'model_configs.min_p', label: 'Min-P', type: 'number', step: '0.01' },
      { path: 'model_configs.top_k', label: 'Top-K', type: 'number' },
    ],
  },
  {
    title: 'Server Parameters',
    fields: [
      { path: 'server_params.cont_batching', label: 'Continuous Batching', type: 'toggle' },
      { path: 'server_params.flash_attn', label: 'Flash Attention', type: 'toggle', valuePath: 'server_params.flash_attn.value', valueLabel: 'Value' },
      { path: 'server_params.reasoning', label: 'Reasoning', type: 'toggle', valuePath: 'server_params.reasoning.value', valueLabel: 'Value' },
      { path: 'server_params.profiling', label: 'Profiling', type: 'toggle' },
      { path: 'server_params.presence_penalty', label: 'Presence Penalty', type: 'toggle', valuePath: 'server_params.presence_penalty.value', valueLabel: 'Value' },
      { path: 'server_params.reasoning_budget', label: 'Reasoning Budget', type: 'toggle', valuePath: 'server_params.reasoning_budget.value', valueLabel: 'Value' },
      { path: 'server_params.reasoning_budget_message', label: 'Reasoning Budget Message', type: 'toggle', valuePath: 'server_params.reasoning_budget_message.value', valueLabel: 'Value' },
      { path: 'server_params.rope_scaling', label: 'RoPE Scaling', type: 'toggle', valuePath: 'server_params.rope_scaling.value', valueLabel: 'Value' },
      { path: 'server_params.jinja', label: 'Jinja', type: 'toggle' },
      { path: 'server_params.parallel', label: 'Parallel', type: 'toggle', valuePath: 'server_params.parallel.value', valueLabel: 'Value' },
      { path: 'server_params.n_predict', label: 'N Predict', type: 'toggle', valuePath: 'server_params.n_predict.value', valueLabel: 'Value' },
      { path: 'server_params.n_keep', label: 'N Keep', type: 'toggle', valuePath: 'server_params.n_keep.value', valueLabel: 'Value' },
      { path: 'server_params.cache_prompt', label: 'Cache Prompt', type: 'toggle', valuePath: 'server_params.cache_prompt.value', valueLabel: 'Value' },
      { path: 'server_params.gpu_layers', label: 'GPU Layers', type: 'toggle', valuePath: 'server_params.gpu_layers.value', valueLabel: 'Value' },
    ],
  },
  {
    title: 'Split Parameters',
    fields: [
      { path: 'split_params.layer_split', label: 'Layer Split', type: 'toggle', valuePath: 'split_params.layer_split.value', valueLabel: 'Value' },
      { path: 'split_params.tensor_split', label: 'Tensor Split', type: 'toggle', valuePath: 'split_params.tensor_split.value', valueLabel: 'Value' },
      { path: 'split_params.primary_gpu', label: 'Primary GPU', type: 'toggle', valuePath: 'split_params.primary_gpu.value', valueLabel: 'Value' },
    ],
  },
  {
    title: 'Test Parameters',
    fields: [
      { path: 'test_params.context_length', label: 'Context Length (start)', type: 'number' },
      { path: 'test_params.context_length_multiplier', label: 'Context Length Multiplier', type: 'number', step: '0.1' },
      { path: 'test_params.context_length_max', label: 'Context Length (max)', type: 'number' },
      { path: 'test_params.gpu_layer_offload', label: 'GPU Layer Offload (start)', type: 'number' },
      { path: 'test_params.gpu_layer_offload_step', label: 'GPU Layer Offload (step)', type: 'number' },
      { path: 'test_params.gpu_layer_off_max', label: 'GPU Layer Offload (max)', type: 'number' },
      { path: 'test_params.batch_size', label: 'Batch Size (start)', type: 'number' },
      { path: 'test_params.batch_size_step', label: 'Batch Size (step)', type: 'number' },
      { path: 'test_params.batch_size_max', label: 'Batch Size (max)', type: 'number' },
      { path: 'test_params.u_batch_size', label: 'U Batch Size (start)', type: 'number' },
      { path: 'test_params.u_batch_size_step', label: 'U Batch Size (step)', type: 'number' },
      { path: 'test_params.u_batch_size_max', label: 'U Batch Size (max)', type: 'number' },
      { path: 'test_params.cache_ram', label: 'Cache RAM (start, GB)', type: 'number' },
      { path: 'test_params.cache_ram_step', label: 'Cache RAM (step, GB)', type: 'number' },
      { path: 'test_params.cache_ram_max', label: 'Cache RAM (max, GB)', type: 'number' },
    ],
  },
];

// === Utility Functions ===
function getConfigValue(configs, path) {
  const parts = path.split('.');
  let val = configs;
  for (const part of parts) {
    if (val === undefined || val === null) return undefined;
    val = val[part];
  }
  return val;
}

function setConfigValue(configs, path, value) {
  const parts = path.split('.');
  let obj = configs;
  for (let i = 0; i < parts.length - 1; i++) {
    obj = obj[parts[i]];
  }
  obj[parts[parts.length - 1]] = value;
}

function formatBytes(bytes) {
  if (bytes === null || bytes === undefined) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function formatNumber(n) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  return n.toLocaleString();
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.transition = 'opacity 0.3s';
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// === Navigation ===
function setupNavigation() {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const page = btn.dataset.page;
      navigateTo(page);
      // Close sidebar on mobile after navigation
      closeBenchmarkSidebar();
    });
  });
}

// === Chat Sidebar Toggle ===
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  if (!sidebar) return;

  const isMobile = window.innerWidth <= 768;

  if (isMobile) {
    // Mobile: slide in/out with overlay
    sidebar.classList.toggle('open');
    if (overlay) overlay.classList.toggle('active');
  } else {
    // Desktop: collapse/expand
    sidebar.classList.toggle('collapsed');
  }
}

function closeSidebarOverlay() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  if (sidebar) sidebar.classList.remove('open');
  if (overlay) overlay.classList.remove('active');
}

// === Mobile Sidebar ===
function toggleBenchmarkSidebar() {
  const sidebar = document.getElementById('benchmarkSidebar');
  const overlay = document.getElementById('benchmarkSidebarOverlay');
  if (!sidebar || !overlay) return;
  sidebar.classList.toggle('open');
  overlay.classList.toggle('active');
}

function closeBenchmarkSidebar() {
  const sidebar = document.getElementById('benchmarkSidebar');
  const overlay = document.getElementById('benchmarkSidebarOverlay');
  if (sidebar) sidebar.classList.remove('open');
  if (overlay) overlay.classList.remove('active');
}

function navigateTo(page) {
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.querySelector(`.nav-btn[data-page="${page}"]`).classList.add('active');
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(`page-${page}`).classList.add('active');

  if (page === 'configs') renderConfigs();
  if (page === 'results') loadResults();
  if (page === 'reports') loadReports();
  if (page === 'dashboard') updateDashboard();
}

// === Config Rendering ===
function renderConfigs() {
  if (!state.configs) return;

  const tabsContainer = document.getElementById('config-tabs');
  const panelsContainer = document.getElementById('configs-container');
  tabsContainer.innerHTML = '';
  panelsContainer.innerHTML = '';

  configSchema.forEach((section, idx) => {
    const tabId = `config-tab-${idx}`;
    const panelId = `config-panel-${idx}`;

    // Tab button
    const tab = document.createElement('button');
    tab.className = 'config-tab-btn' + (idx === 0 ? ' active' : '');
    tab.dataset.tab = tabId;
    tab.textContent = section.title;
    tab.addEventListener('click', () => {
      document.querySelectorAll('.config-tab-btn').forEach(b => b.classList.remove('active'));
      tab.classList.add('active');
      document.querySelectorAll('.config-tab-panel').forEach(p => p.classList.remove('active'));
      document.getElementById(panelId).classList.add('active');
    });
    tabsContainer.appendChild(tab);

    // Tab panel
    const panel = document.createElement('div');
    panel.className = 'config-tab-panel' + (idx === 0 ? ' active' : '');
    panel.id = panelId;

    section.fields.forEach(field => {
      const fieldEl = document.createElement('div');
      fieldEl.className = 'config-field';

      const label = document.createElement('label');
      label.textContent = field.label;
      fieldEl.appendChild(label);

      if (field.type === 'toggle') {
        const toggleRow = document.createElement('div');
        toggleRow.className = 'toggle-row';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `cfg-${field.path.replace(/\./g, '-')}`;
        checkbox.checked = !!getConfigValue(state.configs, field.path);
        checkbox.addEventListener('change', (e) => {
          setConfigValue(state.configs, field.path, e.target.checked);
          const valueField = toggleRow.querySelector(`[data-value-field]`);
          if (valueField) valueField.disabled = !e.target.checked;
        });
        toggleRow.appendChild(checkbox);

        if (field.valuePath) {
          const valueInput = document.createElement('input');
          valueInput.type = field.valuePath.includes('true') || field.valuePath.includes('false') || field.valuePath.includes('null') ? 'text' : 'number';
          valueInput.dataset.valueField = field.valuePath;
          valueInput.value = getConfigValue(state.configs, field.valuePath) ?? '';
          valueInput.disabled = !checkbox.checked;
          valueInput.addEventListener('input', (e) => {
            const v = e.target.value;
            setConfigValue(state.configs, field.valuePath, isNaN(v) ? v : parseFloat(v));
          });
          toggleRow.appendChild(valueInput);

          const valueLabel = document.createElement('span');
          valueLabel.style.cssText = 'color: var(--text-secondary); font-size: 0.8rem; white-space: nowrap;';
          valueLabel.textContent = field.valueLabel;
          toggleRow.appendChild(valueLabel);
        }

        fieldEl.appendChild(toggleRow);
      } else {
        const input = document.createElement('input');
        input.type = field.type;
        input.id = `cfg-${field.path.replace(/\./g, '-')}`;
        input.value = getConfigValue(state.configs, field.path) ?? '';
        if (field.step) input.step = field.step;
        input.addEventListener('input', (e) => {
          const val = field.type === 'number' ? (e.target.value === '' ? '' : parseFloat(e.target.value)) : e.target.value;
          setConfigValue(state.configs, field.path, val);
        });
        fieldEl.appendChild(input);
      }

      if (field.hint) {
        const hint = document.createElement('span');
        hint.className = 'hint';
        hint.textContent = field.hint;
        fieldEl.appendChild(hint);
      }

      panel.appendChild(fieldEl);
    });

    panelsContainer.appendChild(panel);
  });
}

// === Config Save/Load ===
async function loadConfigs() {
  try {
    const res = await fetch('/api/configs');
    const data = await res.json();
    if (data.success) {
      state.configs = JSON.parse(JSON.stringify(data.data));
      state.originalConfigs = JSON.parse(JSON.stringify(data.data));
      updateDashboard();
    }
  } catch (err) {
    showToast('Failed to load configs: ' + err.message, 'error');
  }
}

async function saveConfigs() {
  try {
    const res = await fetch('/api/configs', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state.configs),
    });
    const data = await res.json();
    if (data.success) {
      state.originalConfigs = JSON.parse(JSON.stringify(state.configs));
      showToast('Configs saved', 'success');
    } else {
      showToast('Failed to save: ' + data.error, 'error');
    }
  } catch (err) {
    showToast('Failed to save: ' + err.message, 'error');
  }
}

// === Config Event Listeners ===
function setupConfigListeners() {
  const btnSave = document.getElementById('btn-save-configs');
  const btnReset = document.getElementById('btn-reset-configs');
  if (btnSave) btnSave.addEventListener('click', saveConfigs);
  if (btnReset) btnReset.addEventListener('click', async () => {
    if (state.originalConfigs) {
      state.configs = JSON.parse(JSON.stringify(state.originalConfigs));
      renderConfigs();
      showToast('Configs reset', 'info');
    }
  });
}

// === SSE Connection ===
let sseReconnectTimer = null;
let statusPollTimer = null;

function connectSSE() {
  // Clear any existing reconnect timer
  if (sseReconnectTimer) {
    clearTimeout(sseReconnectTimer);
    sseReconnectTimer = null;
  }

  if (state.sse) {
    state.sse.close();
  }

  state.sse = new EventSource('/api/stream');

  state.sse.addEventListener('log', (e) => {
    const data = JSON.parse(e.data);
    handleLog(data);
  });

  state.sse.addEventListener('results', (e) => {
    const data = JSON.parse(e.data);
    state.liveResults = data.liveResults;
    updateMetrics();
    updateDashboard();
  });

  state.sse.addEventListener('status', (e) => {
    const data = JSON.parse(e.data);
    state.status = data.status;
    state.testRun = data.testRun;
    if (data.liveResults) state.liveResults = data.liveResults;
    updateStatusUI();
    updateDashboard();
    // Clear reconnect timer on successful message
    if (sseReconnectTimer) {
      clearTimeout(sseReconnectTimer);
      sseReconnectTimer = null;
    }
  });

  state.sse.addEventListener('heartbeat', () => {
    // Keep connection alive
    // Clear reconnect timer on heartbeat
    if (sseReconnectTimer) {
      clearTimeout(sseReconnectTimer);
      sseReconnectTimer = null;
    }
  });

  state.sse.onerror = () => {
    console.log('SSE connection lost, reconnecting...');
    // If we haven't received a status update in a while, start polling as fallback
    if (!sseReconnectTimer) {
      sseReconnectTimer = setTimeout(() => {
        sseReconnectTimer = null;
        // SSE will auto-reconnect, but also poll status as backup
        startStatusPolling();
      }, 5000);
    }
  };
}

// === Status Polling Fallback ===
// Used when SSE connection drops during long benchmarks
function startStatusPolling() {
  if (statusPollTimer) return; // Already polling

  statusPollTimer = setInterval(async () => {
    try {
      const res = await fetch('/api/status');
      const data = await res.json();
      if (data.success) {
        const wasRunning = state.status === 'building' || state.status === 'testing';
        const isNowRunning = data.status === 'building' || data.status === 'testing';

        if (wasRunning && !isNowRunning) {
          // Benchmark finished while polling was active
          state.status = data.status;
          state.testRun = data.testRun;
          if (data.liveResults) state.liveResults = data.liveResults;
          updateStatusUI();
          updateDashboard();
          // Stop polling once benchmark is done
          stopStatusPolling();
          return;
        }

        // Update UI if benchmark is still running
        if (isNowRunning) {
          state.status = data.status;
          state.testRun = data.testRun;
          if (data.liveResults) state.liveResults = data.liveResults;
          updateStatusUI();
          updateDashboard();
        }
      }
    } catch (err) {
      console.log('Status poll failed:', err.message);
    }
  }, 5000);
}

function stopStatusPolling() {
  if (statusPollTimer) {
    clearInterval(statusPollTimer);
    statusPollTimer = null;
  }
}

// === Log Handling ===
function handleLog(data) {
  const logOutput = document.getElementById('log-output');
  const line = document.createElement('div');
  line.className = 'log-line';

  if (data.type === 'stdout') {
    line.classList.add('log-stdout');
  } else {
    line.classList.add('log-stderr');
  }

  // Colorize certain patterns
  let text = data.text;
  if (text.includes('==========') || text.includes('===')) {
    line.classList.add('log-highlight');
  }
  if (text.toLowerCase().includes('error') || text.toLowerCase().includes('failure')) {
    line.classList.add('log-stderr');
  }
  if (text.toLowerCase().includes('success') || text.toLowerCase().includes('complete')) {
    line.classList.add('log-success');
  }
  if (text.toLowerCase().includes('warning') || text.toLowerCase().includes('deprecated')) {
    line.classList.add('log-warning');
  }

  line.textContent = text;
  logOutput.appendChild(line);
  logOutput.scrollTop = logOutput.scrollHeight;
}

// === Run Control Event Listeners ===
function setupRunListeners() {
  const btnClear = document.getElementById('btn-clear-log');
  if (btnClear) btnClear.addEventListener('click', () => {
    document.getElementById('log-output').innerHTML = '';
  });

  const btnRun = document.getElementById('btn-run');
  const btnStop = document.getElementById('btn-stop');
  const btnRunDash = document.getElementById('btn-run-dashboard');
  const btnStopDash = document.getElementById('btn-stop-dashboard');
  if (btnRun) btnRun.addEventListener('click', startBenchmark);
  if (btnStop) btnStop.addEventListener('click', stopBenchmark);
  if (btnRunDash) btnRunDash.addEventListener('click', startBenchmark);
  if (btnStopDash) btnStopDash.addEventListener('click', stopBenchmark);
}

// === Run Control ===
async function startBenchmark() {
  try {
    const res = await fetch('/api/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ skipBuild: state.configs?.skip_build }),
    });
    const data = await res.json();
    if (data.success) {
      showToast('Benchmark started', 'success');
      updateButtons();
    } else {
      showToast('Failed to start: ' + data.error, 'error');
    }
  } catch (err) {
    showToast('Failed to start: ' + err.message, 'error');
  }
}

async function stopBenchmark() {
  try {
    const res = await fetch('/api/stop', { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      showToast('Benchmark stopping...', 'info');
      updateButtons();
    } else {
      showToast('Failed to stop: ' + data.error, 'error');
    }
  } catch (err) {
    showToast('Failed to stop: ' + err.message, 'error');
  }
}

function updateButtons() {
  const isRunning = state.status === 'building' || state.status === 'testing';
  const isStopped = state.status === 'stopped';

  document.getElementById('btn-run').disabled = isRunning;
  document.getElementById('btn-stop').disabled = !isRunning && !isStopped;
  document.getElementById('btn-run-dashboard').disabled = isRunning;
  document.getElementById('btn-stop-dashboard').disabled = !isRunning && !isStopped;
}

// === Status UI ===
function updateStatusUI() {
  const statusEl = document.getElementById('run-status');
  const statusText = document.getElementById('dash-status');
  const statusBadge = document.getElementById('benchmarkStatusIndicator');

  const statusMap = {
    idle: { icon: '⏸', label: 'Ready', badgeClass: 'idle' },
    building: { icon: '🔨', label: 'Building...', badgeClass: 'building' },
    testing: { icon: '🧪', label: `Testing (Run #${state.testRun})`, badgeClass: 'testing' },
    error: { icon: '❌', label: 'Error', badgeClass: 'error' },
    stopped: { icon: '⏹', label: 'Stopped', badgeClass: 'stopped' },
  };

  const info = statusMap[state.status] || statusMap.idle;

  statusEl.innerHTML = `
    <span class="status-icon">${info.icon}</span>
    <span class="status-label">${info.label}</span>
  `;

  statusText.textContent = info.label;

  statusBadge.className = `status-badge ${info.badgeClass}`;
  statusBadge.innerHTML = `
    <span class="status-dot"></span>
    <span class="status-text">${info.label}</span>
  `;

  // Update run details
  document.getElementById('run-num').textContent = state.testRun || '—';

  // Stop polling when benchmark is no longer running
  if (state.status !== 'building' && state.status !== 'testing') {
    stopStatusPolling();
  }

  updateButtons();
}

function updateMetrics() {
  const lastResult = state.liveResults[state.liveResults.length - 1];
  if (lastResult) {
    document.getElementById('metric-prompt').textContent = lastResult.avgPromptTokensPerSec ? formatNumber(lastResult.avgPromptTokensPerSec) : '—';
    document.getElementById('metric-gen').textContent = lastResult.avgGenTokensPerSec ? formatNumber(lastResult.avgGenTokensPerSec) : '—';
    document.getElementById('metric-total-gen').textContent = lastResult.totalGenTokens ? formatNumber(lastResult.totalGenTokens) : '—';
    document.getElementById('metric-total-time').textContent = lastResult.totalTimeMs ? formatNumber(lastResult.totalTimeMs) : '—';
  }
}

// === Dashboard ===
function updateDashboard() {
  if (!state.configs) return;

  document.getElementById('dash-model').textContent = `${state.configs.model_directory}/${state.configs.model}`;
  document.getElementById('dash-status').textContent = state.status.charAt(0).toUpperCase() + state.status.slice(1);
  document.getElementById('dash-runs').textContent = state.liveResults.length;

  // Best metrics
  if (state.liveResults.length > 0) {
    const bestGen = Math.max(...state.liveResults.map(r => r.avgGenTokensPerSec || 0));
    const bestPrompt = Math.max(...state.liveResults.map(r => r.avgPromptTokensPerSec || 0));
    const lastResult = state.liveResults[state.liveResults.length - 1];

    document.getElementById('dash-best').textContent = bestGen ? `${formatNumber(bestGen)} tok/s` : '—';
    document.getElementById('dash-best-prompt').textContent = bestPrompt ? `${formatNumber(bestPrompt)} tok/s` : '—';
    document.getElementById('dash-last-time').textContent = lastResult?.totalTimeMs ? `${formatNumber(lastResult.totalTimeMs)} ms` : '—';
  } else {
    document.getElementById('dash-best').textContent = '—';
    document.getElementById('dash-best-prompt').textContent = '—';
    document.getElementById('dash-last-time').textContent = '—';
  }

  // Recent results
  const recentContainer = document.getElementById('dash-recent-results');
  if (state.liveResults.length > 0) {
    const recent = state.liveResults.slice(-3);
    let html = '<table class="results-table"><thead><tr>';
    html += '<th>Run</th><th>Prompt Tok/s</th><th>Gen Tok/s</th><th>Total Gen</th><th>Total Time</th>';
    html += '</tr></thead><tbody>';
    recent.forEach(r => {
      html += `<tr>
        <td>#${r.testRunId}</td>
        <td>${r.avgPromptTokensPerSec ? r.avgPromptTokensPerSec : '—'}</td>
        <td>${r.avgGenTokensPerSec ? r.avgGenTokensPerSec : '—'}</td>
        <td>${r.totalGenTokens ? formatNumber(r.totalGenTokens) : '—'}</td>
        <td>${r.totalTimeMs ? formatNumber(r.totalTimeMs) : '—'}</td>
      </tr>`;
    });
    html += '</tbody></table>';
    recentContainer.innerHTML = html;
  } else {
    recentContainer.innerHTML = '<p class="empty-state">No results yet. Start a benchmark to see results here.</p>';
  }
}

// === Results ===
async function loadResults() {
  try {
    const res = await fetch('/api/results');
    const data = await res.json();
    if (data.success) {
      renderMarkdownResults(data.data);
    }
  } catch (err) {
    showToast('Failed to load results: ' + err.message, 'error');
  }
}

// === Results Event Listeners ===
function setupResultsListeners() {
  const btnRefresh = document.getElementById('btn-refresh-results');
  if (btnRefresh) btnRefresh.addEventListener('click', loadResults);
}

function renderMarkdownResults(md) {
  const container = document.getElementById('results-container');

  if (!md || md.trim() === '') {
    container.innerHTML = '<div class="empty-state">No results yet. Run a benchmark to see results here.</div>';
    return;
  }

  // Parse markdown tables and render them
  const sections = md.split(/^## /m);
  let html = '';

  sections.forEach((section, i) => {
    if (i === 0) {
      // First section is the header
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

    // Find table rows
    let tableRows = [];
    let inTable = false;
    let headerParsed = false;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('|') && line.endsWith('|')) {
        if (!inTable) {
          inTable = true;
          // Check if it's a separator line
          if (line.includes('---')) {
            headerParsed = true;
            continue;
          }
          if (!headerParsed) {
            // This is the header
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

  container.innerHTML = html;
}

// === Reports ===
async function loadReports() {
  try {
    const res = await fetch('/api/reports');
    const data = await res.json();
    if (data.success) {
      renderReportsList(data.data);
    }
  } catch (err) {
    showToast('Failed to load reports: ' + err.message, 'error');
  }
}

function renderReportsList(reports) {
  const container = document.getElementById('reports-list');
  const viewer = document.getElementById('report-viewer');

  viewer.style.display = 'none';
  container.style.display = 'grid';

  if (reports.length === 0) {
    container.innerHTML = '<div class="empty-state">No saved reports yet.</div>';
    return;
  }

  container.innerHTML = reports.map(r => `
    <div class="report-card" data-name="${r.name}">
      <h4>${r.name}</h4>
      <div class="report-meta">Saved: ${new Date(r.modified).toLocaleString()}</div>
    </div>
  `).join('');

  container.querySelectorAll('.report-card').forEach(card => {
    card.addEventListener('click', () => loadReport(card.dataset.name));
  });
}

async function loadReport(name) {
  try {
    state.currentReportName = name;
    const res = await fetch(`/api/report/${name}`);
    const data = await res.json();
    if (data.success) {
      renderReportViewer(data.data);
    } else {
      showToast('Failed to load report: ' + data.error, 'error');
    }
  } catch (err) {
    showToast('Failed to load report: ' + err.message, 'error');
  }
}

function renderReportViewer(report) {
  const container = document.getElementById('reports-list');
  const viewer = document.getElementById('report-viewer');

  container.style.display = 'none';
  viewer.style.display = 'block';

  document.getElementById('report-viewer-title').textContent = report.name;

  // Render the markdown content
  const contentEl = document.getElementById('report-content');
  if (report.mdContent) {
    renderMarkdownResults(report.mdContent);
    contentEl.innerHTML = document.getElementById('results-container').innerHTML;
  } else {
    contentEl.innerHTML = '<div class="empty-state">No content available.</div>';
  }
}

// === Reports Event Listeners ===
function setupReportsListeners() {
  const btnBack = document.getElementById('btn-back-reports');
  if (btnBack) btnBack.addEventListener('click', loadReports);

  const btnDelete = document.getElementById('btn-delete-report');
  if (btnDelete) btnDelete.addEventListener('click', async () => {
    if (!state.currentReportName) return;
    if (!confirm(`Delete report "${state.currentReportName}"?`)) return;

    try {
      const res = await fetch(`/api/report/${state.currentReportName}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showToast('Report deleted', 'success');
        loadReports();
      } else {
        showToast('Failed to delete: ' + data.error, 'error');
      }
    } catch (err) {
      showToast('Failed to delete: ' + err.message, 'error');
    }
  });

  const btnDownload = document.getElementById('btn-download-report');
  if (btnDownload) btnDownload.addEventListener('click', () => {
    if (!state.currentReportName) return;
    const report = document.getElementById('report-content').innerHTML;
    if (!report) return;

    const blob = new Blob([`<html><head><title>${state.currentReportName}</title><style>
      body { font-family: -apple-system, sans-serif; padding: 20px; color: #e6edf3; background: #0d1117; }
      table { width: 100%; border-collapse: collapse; margin: 12px 0; }
      th, td { border: 1px solid #30363d; padding: 8px 12px; text-align: left; }
      th { background: #1c2333; }
      h2, h3 { color: #e6edf3; }
      p { color: #8b949e; }
    </style></head><body>${report}</body></html>`], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${state.currentReportName}.html`;
    a.click();
    URL.revokeObjectURL(url);
  });
}

// === Save Report ===
function showSaveReportModal() {
  const name = prompt('Report name (optional, press Cancel to use default):', '');
  if (name !== null) {
    saveReport(name.trim());
  }
}

function saveReport(name) {
  fetch('/api/save-report', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  })
  .then(r => r.json())
  .then(data => {
    if (data.success) {
      showToast(`Report saved as "${data.message.replace('Report saved as ', '')}"`, 'success');
    } else {
      showToast('Failed to save: ' + data.error, 'error');
    }
  })
  .catch(err => {
    showToast('Failed to save: ' + err.message, 'error');
  });
}

// === Save Report Event Listeners ===
function setupSaveReportListeners() {
  const btnSave = document.getElementById('btn-save-report');
  const btnSaveDash = document.getElementById('btn-save-report-dash');
  const btnSaveResults = document.getElementById('btn-save-report-results');
  const btnSaveReports = document.getElementById('btn-save-report-reports');

  if (btnSave) btnSave.addEventListener('click', showSaveReportModal);
  if (btnSaveDash) btnSaveDash.addEventListener('click', showSaveReportModal);
  if (btnSaveResults) btnSaveResults.addEventListener('click', showSaveReportModal);
  if (btnSaveReports) btnSaveReports.addEventListener('click', showSaveReportModal);
}

// === Dashboard Event Listeners ===
function setupDashboardListeners() {
  const btnRefresh = document.getElementById('btn-refresh-dash');
  if (btnRefresh) btnRefresh.addEventListener('click', () => {
    updateDashboard();
  });
}

// === Init ===
// Export init for external callers (main app calls it when benchmark tab is opened)
window.initBenchmarkApp = async function() {
  // Prevent duplicate initialization
  if (state.initialized) {
    // Just refresh the current page data
    if (state.sse) {
      state.sse.close();
    }
    // Stop any existing polling
    stopStatusPolling();
    connectSSE();
    // If benchmark appears to be running, start polling as backup
    if (state.status === 'building' || state.status === 'testing') {
      startStatusPolling();
    }
    updateDashboard();
    return;
  }
  state.initialized = true;

  // Setup event listeners (DOM must exist first)
  setupNavigation();
  setupConfigListeners();
  setupRunListeners();
  setupResultsListeners();
  setupReportsListeners();
  setupSaveReportListeners();
  setupDashboardListeners();

  // Load initial state
  await loadConfigs();
  connectSSE();
  updateStatusUI();
  updateDashboard();

  // If benchmark is running on load, start polling as backup
  if (state.status === 'building' || state.status === 'testing') {
    startStatusPolling();
  }

  // Auto-refresh dashboard every 5 seconds
  setInterval(() => {
    if (document.getElementById('page-dashboard').classList.contains('active')) {
      updateDashboard();
    }
  }, 5000);
};
