import { ref, reactive } from 'vue';

export function useBenchmark() {
  const configs = ref(null);
  const originalConfigs = ref(null);
  const benchStatus = ref('idle');
  const testRun = ref(0);
  const liveResults = ref([]);
  const logs = ref([]);
  const sse = ref(null);
  const currentReportName = ref(null);
  let sseReconnectTimer = null;
  let statusPollTimer = null;

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

  async function loadConfigs() {
    try {
      const res = await fetch('/api/configs');
      const data = await res.json();
      if (data.success) {
        configs.value = JSON.parse(JSON.stringify(data.data));
        originalConfigs.value = JSON.parse(JSON.stringify(data.data));
      }
    } catch (err) {
      console.error('Failed to load configs:', err.message);
    }
  }

  async function saveConfigs() {
    try {
      const res = await fetch('/api/configs', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(configs.value),
      });
      const data = await res.json();
      if (data.success) {
        originalConfigs.value = JSON.parse(JSON.stringify(configs.value));
      }
      return data;
    } catch (err) {
      console.error('Failed to save configs:', err.message);
      return { success: false, error: err.message };
    }
  }

  async function startBenchmark() {
    try {
      const res = await fetch('/api/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skipBuild: configs.value?.skip_build }),
      });
      return await res.json();
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  async function stopBenchmark() {
    try {
      const res = await fetch('/api/stop', { method: 'POST' });
      return await res.json();
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  async function loadResults() {
    try {
      const res = await fetch('/api/results');
      const data = await res.json();
      return data.success ? data.data : '';
    } catch (err) {
      console.error('Failed to load results:', err.message);
      return '';
    }
  }

  async function loadReports() {
    try {
      const res = await fetch('/api/reports');
      const data = await res.json();
      return data.success ? data.data : [];
    } catch (err) {
      console.error('Failed to load reports:', err.message);
      return [];
    }
  }

  async function loadReport(name) {
    try {
      const res = await fetch(`/api/report/${name}`);
      const data = await res.json();
      return data.success ? data.data : null;
    } catch (err) {
      console.error('Failed to load report:', err.message);
      return null;
    }
  }

  async function deleteReport(name) {
    try {
      const res = await fetch(`/api/report/${name}`, { method: 'DELETE' });
      return await res.json();
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  async function saveReport(name) {
    try {
      const res = await fetch('/api/save-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      return await res.json();
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  function connectSSE(onStatus, onLog, onResults) {
    if (sse.value) {
      sse.value.close();
    }

    sse.value = new EventSource('/api/stream');

    sse.value.addEventListener('log', (e) => {
      const data = JSON.parse(e.data);
      if (onLog) onLog(data);
      if (data.status) benchStatus.value = data.status;
      if (data.testRun !== undefined) testRun.value = data.testRun;
      if (data.liveResults) liveResults.value = data.liveResults;
    });

    sse.value.addEventListener('results', (e) => {
      const data = JSON.parse(e.data);
      if (data.liveResults) liveResults.value = data.liveResults;
      if (onResults) onResults(data);
    });

    sse.value.addEventListener('status', (e) => {
      const data = JSON.parse(e.data);
      benchStatus.value = data.status;
      testRun.value = data.testRun;
      if (data.liveResults) liveResults.value = data.liveResults;
      if (onStatus) onStatus(data);
      if (sseReconnectTimer) {
        clearTimeout(sseReconnectTimer);
        sseReconnectTimer = null;
      }
    });

    sse.value.addEventListener('heartbeat', () => {
      if (sseReconnectTimer) {
        clearTimeout(sseReconnectTimer);
        sseReconnectTimer = null;
      }
    });

    sse.value.onerror = () => {
      console.log('SSE connection lost, reconnecting...');
      if (!sseReconnectTimer) {
        sseReconnectTimer = setTimeout(() => {
          sseReconnectTimer = null;
          startStatusPolling();
        }, 5000);
      }
    };
  }

  function disconnectSSE() {
    if (sse.value) {
      sse.value.close();
      sse.value = null;
    }
  }

  function startStatusPolling() {
    if (statusPollTimer) return;

    statusPollTimer = setInterval(async () => {
      try {
        const res = await fetch('/api/status');
        const data = await res.json();
        if (data.success) {
          benchStatus.value = data.status;
          testRun.value = data.testRun;
          if (data.liveResults) liveResults.value = data.liveResults;
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

  function addLog(text, type = 'stdout') {
    logs.value.push({ text, type, ts: Date.now() });
  }

  function clearLogs() {
    logs.value = [];
  }

  function isRunning() {
    return benchStatus.value === 'building' || benchStatus.value === 'testing';
  }

  return {
    configs,
    originalConfigs,
    benchStatus,
    testRun,
    liveResults,
    logs,
    currentReportName,
    getConfigValue,
    setConfigValue,
    loadConfigs,
    saveConfigs,
    startBenchmark,
    stopBenchmark,
    loadResults,
    loadReports,
    loadReport,
    deleteReport,
    saveReport,
    connectSSE,
    disconnectSSE,
    addLog,
    clearLogs,
    isRunning,
    startStatusPolling,
    stopStatusPolling,
  };
}
