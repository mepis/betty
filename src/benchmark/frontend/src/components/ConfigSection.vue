<script setup>
import { ref } from 'vue'

const props = defineProps({
  title: { type: String, required: true },
  items: { type: Array, required: true },
  modelValue: { type: Object, required: true },
  modelOptions: { type: Array, default: () => [] },
  queueOptions: { type: Array, default: () => ['1x', '4x', '8x'] },
})

const emit = defineEmits(['update:modelValue'])

const update = (key, value) => {
  const copy = { ...props.modelValue }
  copy[key] = value
  emit('update:modelValue', copy)
}

// Custom dropdown state
const openDropdown = ref(null)

const toggleDropdown = (key) => {
  openDropdown.value = openDropdown.value === key ? null : key
}

const selectOption = (key, value) => {
  update(key, value)
  openDropdown.value = null
}

const closeDropdown = () => {
  openDropdown.value = null
}
</script>

<template>
  <div class="space-y-3">
    <h4 class="text-base font-semibold text-text-muted uppercase tracking-wider">{{ title }}</h4>
    <div v-for="item in items" :key="item.key" class="flex items-center justify-between gap-4 rounded-lg px-3 py-2 transition-colors hover:bg-bg-tertiary">
      <label class="text-sm text-text-secondary min-w-[180px]">{{ item.label }}</label>
      <template v-if="item.type === 'boolean'">
        <button
          @click="update(item.key, !modelValue[item.key])"
          class="relative w-10 h-5 rounded-full transition-colors"
          :class="modelValue[item.key] ? 'bg-accent' : 'bg-bg-tertiary'"
        >
          <span
            class="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform"
            :class="modelValue[item.key] ? 'translate-x-5' : ''"
          />
        </button>
      </template>
      <template v-else-if="item.type === 'select'">
        <div class="relative max-w-[50%]">
          <button
            @click="toggleDropdown(item.key)"
            class="input w-full text-xs flex items-center justify-between"
          >
            <span :class="modelValue[item.key] ? 'text-text-primary' : 'text-text-muted'">
              {{ modelValue[item.key] || '— Select —' }}
            </span>
            <svg
              class="w-3.5 h-3.5 text-text-muted transition-transform flex-shrink-0"
              :class="openDropdown === item.key ? 'rotate-180' : ''"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          <Transition name="dropdown">
            <div
              v-if="openDropdown === item.key"
              class="absolute z-50 mt-1 w-full bg-bg-card border border-border rounded-lg shadow-lg overflow-hidden"
            >
              <div class="max-h-48 overflow-auto py-1">
                <button
                  @click="selectOption(item.key, '')"
                  class="w-full text-left px-3 py-1.5 text-xs text-text-muted hover:bg-bg-card-hover transition-colors"
                >
                  — Select —
                </button>
                <button
                  v-for="opt in item.key === 'CUDA_SCALE_LAUNCH_QUEUES' ? queueOptions : modelOptions"
                  :key="opt"
                  @click="selectOption(item.key, opt)"
                  class="w-full text-left px-3 py-1.5 text-xs transition-colors"
                  :class="modelValue[item.key] === opt ? 'bg-accent-subtle text-accent' : 'text-text-secondary hover:bg-bg-card-hover'"
                >
                  {{ opt }}
                </button>
              </div>
            </div>
          </Transition>
        </div>
      </template>
      <template v-else>
        <input
          :type="item.type === 'number' ? 'number' : 'text'"
          :value="modelValue[item.key]"
          @input="update(item.key, item.type === 'number' ? Number($event.target.value) : $event.target.value)"
          class="input w-40 text-xs"
        />
      </template>
    </div>
  </div>
</template>

<style scoped>
.dropdown-enter-active,
.dropdown-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
