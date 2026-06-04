<template>
  <div class="extension-dialog-overlay" @click.self="$emit('cancel')">
    <div class="extension-dialog">
      <h3>{{ dialog.title || 'Extension Request' }}</h3>

      <!-- Select dialog -->
      <div v-if="dialog.method === 'select'">
        <p>{{ dialog.message }}</p>
        <select v-model="selectedOption">
          <option v-for="opt in dialog.options" :key="opt" :value="opt">
            {{ opt }}
          </option>
        </select>
        <button @click="handleConfirm({ value: selectedOption })" class="btn-primary">Confirm</button>
        <button @click="$emit('cancel')" class="btn-secondary">Cancel</button>
      </div>

      <!-- Confirm dialog -->
      <div v-if="dialog.method === 'confirm'">
        <p>{{ dialog.message }}</p>
        <button @click="handleConfirm({ confirmed: true })" class="btn-primary">Yes</button>
        <button @click="handleConfirm({ confirmed: false })" class="btn-secondary">No</button>
      </div>

      <!-- Input dialog -->
      <div v-if="dialog.method === 'input'">
        <p>{{ dialog.message }}</p>
        <input
          v-model="inputValue"
          :placeholder="dialog.placeholder"
          @keyup.enter="handleConfirm({ value: inputValue })"
        />
        <button @click="handleConfirm({ value: inputValue })" class="btn-primary">Confirm</button>
        <button @click="$emit('cancel')" class="btn-secondary">Cancel</button>
      </div>

      <!-- Editor dialog -->
      <div v-if="dialog.method === 'editor'">
        <p>{{ dialog.message }}</p>
        <textarea v-model="editorText" :placeholder="dialog.prefill" />
        <button @click="handleConfirm({ value: editorText })" class="btn-primary">Confirm</button>
        <button @click="$emit('cancel')" class="btn-secondary">Cancel</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const props = defineProps<{
  dialog: {
    id: string;
    method: string;
    title?: string;
    options?: string[];
    message?: string;
    placeholder?: string;
    prefill?: string;
  };
}>();

const emit = defineEmits<{
  confirm: [response: { value?: string; confirmed?: boolean; cancelled?: boolean }];
  cancel: [];
}>();

const selectedOption = ref(props.dialog.options?.[0] || '');
const inputValue = ref('');
const editorText = ref(props.dialog.prefill || '');

const handleConfirm = (response: { value?: string; confirmed?: boolean; cancelled?: boolean }) => {
  emit('confirm', response);
};
</script>
