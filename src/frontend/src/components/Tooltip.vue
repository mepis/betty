<template>
  <div class="tooltip-wrapper" ref="wrapper">
    <slot></slot>
    <Transition name="tooltip">
      <div v-if="visible" class="tooltip" :class="position">
        {{ text }}
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';

const props = defineProps({
  text: { type: String, required: true },
  position: { type: String, default: 'top' },
});

const visible = ref(false);
let timer = null;
const wrapper = ref(null);

function show() {
  clearTimeout(timer);
  timer = setTimeout(() => { visible.value = true; }, 200);
}

function hide() {
  clearTimeout(timer);
  timer = setTimeout(() => { visible.value = false; }, 100);
}

onMounted(() => {
  const el = wrapper.value;
  el.addEventListener('mouseenter', show);
  el.addEventListener('mouseleave', hide);
});

onUnmounted(() => {
  clearTimeout(timer);
});
</script>

<style scoped>
.tooltip-wrapper {
  position: relative;
  display: inline-flex;
}

.tooltip {
  position: absolute;
  left: 50%;
  transform: translateX(-50%) translateY(4px);
  padding: 5px 10px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 6px;
  font-size: 11.5px;
  color: var(--text-secondary);
  white-space: nowrap;
  pointer-events: none;
  z-index: 200;
  font-weight: 500;
  box-shadow: var(--shadow);
}

.tooltip.top {
  bottom: calc(100% + 6px);
}

.tooltip.bottom {
  top: calc(100% + 6px);
}

.tooltip::after {
  content: '';
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  border: 4px solid transparent;
}

.tooltip.top::after {
  top: 100%;
  border-top-color: var(--border);
}

.tooltip.bottom::after {
  bottom: 100%;
  border-bottom-color: var(--border);
}

.tooltip-enter-active,
.tooltip-leave-active {
  transition: opacity 0.12s ease, transform 0.12s ease;
}

.tooltip-enter-from,
.tooltip-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(2px);
}
</style>
