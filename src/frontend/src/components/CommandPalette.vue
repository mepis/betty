<template>
  <div class="command-palette active">
    <div class="command-palette-header">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
      </svg>
      Commands
    </div>
    <div>
      <div
        v-for="(cmd, i) in commands"
        :key="cmd.name"
        class="command-item"
        :class="{ selected: i === selectedIndex }"
        @click="$emit('select', cmd.name)"
      >
        <div class="cmd-icon">{{ cmd.icon || '⚡' }}</div>
        <div class="cmd-info">
          <div class="cmd-name">{{ cmd.name }}</div>
          <div class="cmd-desc">{{ cmd.description || '' }}</div>
        </div>
      </div>
      <div v-if="!commands.length" class="command-item">
        <span class="cmd-icon">🔍</span>
        <span class="cmd-info"><span class="cmd-name">No matching commands</span></span>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  commands: Array,
  selectedIndex: Number,
});

defineEmits(['select', 'navigate', 'close']);
</script>

<style scoped>
.command-palette {
  position: absolute;
  bottom: 100%;
  left: 0;
  right: 0;
  margin-bottom: 6px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  max-height: 280px;
  overflow-y: auto;
  box-shadow: var(--shadow-lg);
  z-index: 10;
}

.command-palette-header {
  padding: 8px 12px;
  font-size: 10.5px;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  color: var(--text-muted);
  border-bottom: 1px solid var(--border);
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 6px;
}

.command-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  cursor: pointer;
  transition: background var(--transition-fast);
  border-left: 2px solid transparent;
}

.command-item:hover,
.command-item.selected {
  background: var(--bg-hover);
  border-left-color: var(--accent);
}

.command-item .cmd-icon {
  width: 26px;
  height: 26px;
  border-radius: 6px;
  background: var(--bg-tertiary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  flex-shrink: 0;
}

.command-item .cmd-info {
  flex: 1;
  min-width: 0;
}

.command-item .cmd-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
}

.command-item .cmd-desc {
  font-size: 11px;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
