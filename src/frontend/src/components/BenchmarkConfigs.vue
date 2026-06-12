<template>
  <div>
    <div class="page-header">
      <h2>Configuration</h2>
      <div class="header-actions">
        <button class="btn btn-primary" @click="$emit('save')">💾 Save Configs</button>
        <button class="btn btn-outline" @click="$emit('reset')">↺ Reset</button>
      </div>
    </div>

    <div class="config-tabs">
      <button
        v-for="(section, idx) in schema"
        :key="idx"
        class="config-tab-btn"
        :class="{ active: activeTab === idx }"
        @click="activeTab = idx"
      >
        {{ section.title }}
      </button>
    </div>

    <div
      v-for="(section, idx) in schema"
      :key="idx"
      v-show="activeTab === idx"
      class="config-tab-panel active"
    >
      <div
        v-for="field in section.fields"
        :key="field.path"
        class="config-field"
      >
        <label>{{ field.label }}</label>

        <div v-if="field.type === 'toggle'" class="toggle-row">
          <input type="checkbox" :id="'cfg-' + field.path.replace(/\./g, '-')"
                 :checked="!!getConfigValue(configs, field.path)"
                 @change="onToggleChange(field, $event.target.checked)">
          <input v-if="field.valuePath" type="text"
                 :value="getConfigValue(configs, field.valuePath) ?? ''"
                 :disabled="!getConfigValue(configs, field.path)"
                 @input="onValueChange(field.valuePath, $event.target.value)">
          <span v-if="field.valueLabel" style="color:var(--text-secondary);font-size:0.8rem;white-space:nowrap;">{{ field.valueLabel }}</span>
        </div>

        <input v-else type="text" :id="'cfg-' + field.path.replace(/\./g, '-')"
               :value="getConfigValue(configs, field.path) ?? ''"
               @input="onInputChange(field, $event.target.value)">

        <span v-if="field.hint" class="hint">{{ field.hint }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const props = defineProps({
  configs: Object,
  schema: Array,
});

const emit = defineEmits(['save', 'reset', 'update:configs']);

const activeTab = ref(0);

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

function onToggleChange(field, checked) {
  if (!props.configs) return;
  setConfigValue(props.configs, field.path, checked);
  emit('update:configs', props.configs);
}

function onValueChange(path, value) {
  if (!props.configs) return;
  setConfigValue(props.configs, path, isNaN(value) ? value : parseFloat(value));
  emit('update:configs', props.configs);
}

function onInputChange(field, value) {
  if (!props.configs) return;
  const val = field.type === 'number' ? (value === '' ? '' : parseFloat(value)) : value;
  setConfigValue(props.configs, field.path, val);
  emit('update:configs', props.configs);
}
</script>

<style scoped>
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 12px;
}

.header-actions { display: flex; gap: 8px; flex-wrap: wrap; }

.btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 8px 16px; border: 1px solid var(--border-color);
  border-radius: 4px; font-size: 0.85rem; font-weight: 500;
  cursor: pointer; transition: all 0.15s;
}
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-primary { background: var(--btn-primary-bg); color: #fff; border-color: var(--btn-primary-bg); }
.btn-primary:hover:not(:disabled) { background: var(--btn-primary-hover); }
.btn-outline { background: transparent; color: var(--text-secondary); }
.btn-outline:hover:not(:disabled) { background: var(--bg-tertiary); color: var(--text-primary); }

.config-tabs {
  display: flex; gap: 2px; border-bottom: 1px solid var(--border-color);
  overflow-x: auto; margin-bottom: 0;
}

.config-tabs::-webkit-scrollbar { display: none; }

.config-tab-btn {
  padding: 10px 20px; background: none; border: none;
  border-bottom: 2px solid transparent; color: var(--text-muted);
  font-size: 0.85rem; font-weight: 500; cursor: pointer;
  white-space: nowrap; transition: all 0.15s;
}
.config-tab-btn:hover { color: var(--text-primary); background: var(--bg-tertiary); }
.config-tab-btn.active { color: var(--accent-blue); border-bottom-color: var(--accent-blue); background: var(--bg-tertiary); }

.config-tab-panel {
  display: none; padding: 20px;
}
.config-tab-panel.active { display: block; }

.config-field {
  display: flex; flex-direction: column; gap: 4px;
}

.config-field label {
  font-size: 0.8rem; color: var(--text-secondary); font-weight: 500;
}

.config-field input[type="text"],
.config-field input[type="number"] {
  padding: 6px 10px; background: var(--bg-primary);
  border: 1px solid var(--border-color); border-radius: 4px;
  color: var(--text-primary); font-size: 0.85rem; font-family: inherit;
}
.config-field input:focus {
  outline: none; border-color: var(--accent-blue);
  box-shadow: 0 0 0 2px rgba(88, 166, 255, 0.2);
}

.config-field input[type="checkbox"] {
  accent-color: var(--accent-blue); width: 16px; height: 16px;
}

.toggle-row {
  display: flex; align-items: center; gap: 10px;
}
.toggle-row input[type="text"] { flex: 1; }

.hint { font-size: 0.75rem; color: var(--text-muted); }
</style>
