<template>
  <div class="benchmark-app">
    <div class="benchmark-sidebar-overlay" :class="{ active: sidebarOpen }" @click="sidebarOpen = false"></div>

    <aside id="benchmarkSidebar" :class="{ open: sidebarOpen }">
      <div class="sidebar-header">
        <button class="benchmark-sidebar-toggle" @click="sidebarOpen = !sidebarOpen">☰</button>
        <h1>⚡ Benchmark</h1>
      </div>
      <nav>
        <button
          v-for="page in pages"
          :key="page.id"
          class="nav-btn"
          :class="{ active: currentPage === page.id }"
          @click="currentPage = page.id; sidebarOpen = false"
        >
          <span class="nav-icon">{{ page.icon }}</span> {{ page.label }}
        </button>
      </nav>
      <div class="sidebar-footer">
        <div class="status-badge" :class="benchStatus">
          <span class="status-dot"></span>
          <span class="status-text">{{ statusLabel }}</span>
        </div>
      </div>
    </aside>

    <main id="benchmarkMain">
      <BenchmarkDashboard
        v-if="currentPage === 'dashboard'"
        :bench-status="benchStatus"
        :test-run="testRun"
        :live-results="liveResults"
        :configs="configs"
        @start="emitStart"
        @stop="emitStop"
        @save-report="emitSaveReport"
      />
      <BenchmarkConfigs
        v-if="currentPage === 'configs'"
        :configs="configs"
        :schema="configSchema"
        @save="emitSaveConfigs"
        @reset="emitResetConfigs"
      />
      <BenchmarkRun
        v-if="currentPage === 'run'"
        :bench-status="benchStatus"
        :test-run="testRun"
        :live-results="liveResults"
        :logs="logs"
        :configs="configs"
        @start="emitStart"
        @stop="emitStop"
        @save-report="emitSaveReport"
        @clear-log="emitClearLog"
      />
      <BenchmarkResults
        v-if="currentPage === 'results'"
        @refresh="emitLoadResults"
        @save-report="emitSaveReport"
      />
      <BenchmarkReports
        v-if="currentPage === 'reports'"
        @save-report="emitSaveReport"
      />
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import BenchmarkDashboard from './BenchmarkDashboard.vue';
import BenchmarkConfigs from './BenchmarkConfigs.vue';
import BenchmarkRun from './BenchmarkRun.vue';
import BenchmarkResults from './BenchmarkResults.vue';
import BenchmarkReports from './BenchmarkReports.vue';

const props = defineProps({
  benchStatus: String,
  testRun: Number,
  liveResults: Array,
  configs: Object,
  logs: Array,
});

const emit = defineEmits([
  'start',
  'stop',
  'save-report',
  'save-configs',
  'reset-configs',
  'clear-log',
  'load-results',
]);

const currentPage = ref('dashboard');
const sidebarOpen = ref(false);

const pages = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'configs', label: 'Configs', icon: '⚙️' },
  { id: 'run', label: 'Run', icon: '▶️' },
  { id: 'results', label: 'Results', icon: '📋' },
  { id: 'reports', label: 'Reports', icon: '📁' },
];

const statusLabel = computed(() => {
  const map = {
    idle: 'Idle',
    building: 'Building...',
    testing: `Testing (Run #${props.testRun})`,
    error: 'Error',
    stopped: 'Stopped',
  };
  return map[props.benchStatus] || 'Idle';
});

// Config schema
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

function emitStart() { emit('start'); }
function emitStop() { emit('stop'); }
function emitSaveReport() { emit('save-report'); }
function emitSaveConfigs() { emit('save-configs'); }
function emitResetConfigs() { emit('reset-configs'); }
function emitClearLog() { emit('clear-log'); }
function emitLoadResults() { emit('load-results'); }
</script>

<style scoped>
.benchmark-app {
  display: flex;
  height: 100vh;
  width: 100%;
}

#benchmarkSidebar {
  width: 220px;
  min-width: 220px;
  background: var(--bg-secondary);
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.sidebar-header {
  padding: 20px 16px;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
}

.sidebar-header h1 {
  font-size: 1.2rem;
  font-weight: 600;
  color: var(--text-primary);
}

.benchmark-sidebar-toggle {
  display: none;
  background: none;
  border: none;
  color: var(--text-primary);
  font-size: 1.2rem;
  cursor: pointer;
  padding: 4px 8px;
  margin-right: 8px;
  line-height: 1;
}

.benchmark-sidebar-toggle:hover {
  color: var(--accent-blue);
}

#benchmarkSidebar nav {
  flex: 1;
  padding: 12px 8px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.nav-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: 0.9rem;
  cursor: pointer;
  border-radius: 4px;
  text-align: left;
  transition: all 0.15s;
  width: 100%;
}

.nav-btn:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.nav-btn.active {
  background: var(--bg-tertiary);
  color: var(--accent-blue);
  font-weight: 500;
}

.nav-icon {
  font-size: 1.1rem;
  width: 24px;
  text-align: center;
}

.sidebar-footer {
  padding: 16px;
  border-top: 1px solid var(--border-color);
}

.status-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 500;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.status-badge.idle {
  background: rgba(139, 148, 158, 0.15);
  color: var(--text-secondary);
}
.status-badge.idle .status-dot { background: var(--text-secondary); }

.status-badge.building {
  background: rgba(210, 153, 34, 0.15);
  color: var(--accent-orange);
}
.status-badge.building .status-dot { background: var(--accent-orange); animation: pulse 1s infinite; }

.status-badge.testing {
  background: rgba(88, 166, 255, 0.15);
  color: var(--accent-blue);
}
.status-badge.testing .status-dot { background: var(--accent-blue); animation: pulse 1s infinite; }

.status-badge.error {
  background: rgba(248, 81, 73, 0.15);
  color: var(--accent-red);
}
.status-badge.error .status-dot { background: var(--accent-red); }

.status-badge.stopped {
  background: rgba(216, 160, 74, 0.15);
  color: var(--accent-orange);
}
.status-badge.stopped .status-dot { background: var(--accent-orange); }

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

#benchmarkMain {
  flex: 1;
  overflow-y: auto;
  padding: 24px 32px;
  background: var(--bg-primary);
}

.benchmark-sidebar-overlay {
  display: none;
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 999;
}

.benchmark-sidebar-overlay.active {
  display: block;
}

@media (max-width: 900px) {
  .benchmark-sidebar-toggle { display: block; }
  #benchmarkSidebar {
    position: fixed;
    left: 0;
    top: 0;
    bottom: 0;
    width: 260px;
    min-width: unset;
    flex-direction: column;
    border-right: 1px solid var(--border-color);
    z-index: 1000;
    transform: translateX(-100%);
    transition: transform 0.2s ease;
    overflow-y: auto;
  }
  #benchmarkSidebar.open { transform: translateX(0); }
  .nav-icon { display: inline; }
}
</style>
