<script setup>
const props = defineProps({
  title: { type: String, required: true },
  items: { type: Array, required: true },
  modelValue: { type: Object, required: true },
  modelOptions: { type: Array, default: () => [] },
})

const emit = defineEmits(['update:modelValue'])

const update = (key, value) => {
  const copy = { ...props.modelValue }
  copy[key] = value
  emit('update:modelValue', copy)
}
</script>

<template>
  <div class="space-y-3">
    <h4 class="text-xs font-semibold text-text-muted uppercase tracking-wider">{{ title }}</h4>
    <div v-for="item in items" :key="item.key" class="flex items-center justify-between gap-4">
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
        <select
          :value="modelValue[item.key]"
          @change="update(item.key, $event.target.value)"
          class="input w-40 text-xs"
        >
          <option value="">— Select —</option>
          <option v-for="opt in modelOptions" :key="opt" :value="opt">{{ opt }}</option>
        </select>
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
