<template>
  <div class="command-palette active">
    <div class="command-palette-header">⚡ Commands</div>
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
  margin-bottom: 8px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 10px;
  max-height: 300px;
  overflow-y: auto;
  box-shadow: 0 -4px 16px var(--shadow);
  z-index: 10;
}

.command-palette::-webkit-scrollbar {
  width: 6px;
}

.command-palette::-webkit-scrollbar-track {
  background: transparent;
}

.command-palette::-webkit-scrollbar-thumb {
  background: var(--scrollbar-thumb);
  border-radius: 3px;
}

.command-palette-header {
  padding: 8px 12px;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-muted);
  border-bottom: 1px solid var(--border);
  font-weight: 600;
}

.command-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  cursor: pointer;
  transition: background 0.1s;
  border-left: 2px solid transparent;
}

.command-item:hover,
.command-item.selected {
  background: var(--bg-hover);
  border-left-color: var(--accent);
}

.command-item .cmd-icon {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  background: var(--bg-tertiary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
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
