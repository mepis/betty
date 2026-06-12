<template>
  <div class="input-area">
    <div class="input-container">
      <CommandPalette
        v-if="showCommandPalette"
        :commands="filteredCommands"
        :selected-index="commandSelectedIndex"
        @select="$emit('select-command', $event)"
        @navigate="(dir) => $emit('navigate-commands', dir)"
        @close="$emit('close-command-palette')"
      />

      <div class="input-wrapper" :class="{ streaming: isStreaming, 'drag-over': isDragOver }"
           @dragover.prevent="isDragOver = true"
           @dragleave.prevent="isDragOver = false"
           @drop.prevent="onDrop">
        <button class="attach-btn" @click="$refs.fileInput.click()" title="Attach image">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <polyline points="21 15 16 10 5 21"/>
          </svg>
        </button>
        <input ref="fileInput" type="file" accept="image/*" multiple style="display:none" @change="onFileSelect">

        <div class="image-preview-area" v-if="selectedImages.length">
          <div v-for="(img, i) in selectedImages" :key="i" class="image-preview-item">
            <img :src="img.dataUrl" :alt="img.name">
            <button class="remove-image" @click="removeImage(i)">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>

        <textarea
          ref="inputEl"
          class="message-input"
          :value="modelValue"
          @input="$emit('update:modelValue', $event.target.value)"
          @keydown="onKeydown"
          :placeholder="placeholder"
          rows="1"
        ></textarea>

        <button v-if="!isStreaming" class="send-btn" :disabled="!connected || (!modelValue.trim() && !selectedImages.length)" @click="$emit('send')">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"/>
            <polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
        <button v-else class="abort-btn" @click="$emit('abort')" title="Stop generation">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="6" width="12" height="12" rx="2"/>
          </svg>
        </button>
      </div>

      <div class="input-hint">
        <span>Enter</span> to send · <span>Shift+Enter</span> new line · <span>/</span> commands · <span>Esc</span> stop
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import CommandPalette from './CommandPalette.vue';

const props = defineProps({
  modelValue: String,
  isStreaming: Boolean,
  connected: Boolean,
  showCommandPalette: Boolean,
  filteredCommands: Array,
  commandSelectedIndex: Number,
});

const emit = defineEmits([
  'update:modelValue',
  'send',
  'abort',
  'select-command',
  'navigate-commands',
  'close-command-palette',
  'images-selected',
]);

const fileInput = ref(null);
const selectedImages = ref([]);
const isDragOver = ref(false);

const placeholder = 'Message Betty...';

function onKeydown(e) {
  if (props.showCommandPalette) {
    if (e.key === 'Escape') {
      e.preventDefault();
      emit('close-command-palette');
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      emit('navigate-commands', 1);
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      emit('navigate-commands', -1);
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (props.filteredCommands[props.commandSelectedIndex]) {
        emit('select-command', props.filteredCommands[props.commandSelectedIndex].name);
      }
      return;
    }
  }

  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    emit('send');
  }
  if (e.key === 'Escape') {
    if (props.isStreaming) {
      emit('abort');
    } else if (props.modelValue) {
      emit('update:modelValue', '');
    }
  }
}

function onFileSelect(event) {
  processFiles(event.target.files);
  event.target.value = '';
}

function onDrop(e) {
  isDragOver.value = false;
  processFiles(e.dataTransfer.files);
}

function processFiles(files) {
  if (!files || files.length === 0) return;

  Array.from(files).forEach(file => {
    if (!file.type.startsWith('image/')) return;
    if (file.size > 10 * 1024 * 1024) return;
    if (selectedImages.value.length >= 10) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_DIM = 1920;
        let width = img.width;
        let height = img.height;

        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) {
            height = (height / width) * MAX_DIM;
            width = MAX_DIM;
          } else {
            width = (width / height) * MAX_DIM;
            height = MAX_DIM;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        selectedImages.value.push({ dataUrl, name: file.name });
        emit('images-selected', [...selectedImages.value]);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function removeImage(index) {
  selectedImages.value.splice(index, 1);
  emit('images-selected', [...selectedImages.value]);
}
</script>

<style scoped>
.input-area {
  padding: 14px 20px 18px;
  border-top: 1px solid var(--border);
  background: var(--bg-secondary);
}

.input-container {
  max-width: 720px;
  margin: 0 auto;
  position: relative;
}

.input-wrapper {
  display: flex;
  align-items: flex-end;
  gap: 6px;
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 8px 10px 8px 8px;
  transition: border-color var(--transition), box-shadow var(--transition);
}

.input-wrapper:focus-within {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-dim-soft);
}

.input-wrapper.streaming {
  border-color: var(--warning);
}

.input-wrapper.drag-over {
  border-color: var(--accent);
  background: var(--accent-dim-soft);
}

.attach-btn {
  width: 30px;
  height: 30px;
  border-radius: 7px;
  border: none;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
  flex-shrink: 0;
}

.attach-btn:hover {
  background: var(--bg-hover);
  color: var(--text-secondary);
}

.image-preview-area {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  position: absolute;
  bottom: 100%;
  left: 0;
  right: 0;
  margin-bottom: 6px;
}

.image-preview-item {
  position: relative;
  width: 56px;
  height: 56px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--border);
  flex-shrink: 0;
}

.image-preview-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.image-preview-item .remove-image {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: rgba(0,0,0,0.75);
  color: white;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity var(--transition-fast);
}

.image-preview-item:hover .remove-image {
  opacity: 1;
}

.message-input {
  flex: 1;
  background: transparent;
  border: none;
  color: var(--text-primary);
  font-size: 14px;
  font-family: inherit;
  resize: none;
  outline: none;
  max-height: 180px;
  min-height: 24px;
  line-height: 1.5;
  padding: 3px 0;
}

.message-input::placeholder {
  color: var(--text-muted);
}

.send-btn {
  width: 30px;
  height: 30px;
  border-radius: 7px;
  border: none;
  background: var(--accent);
  color: var(--btn-primary-text);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
  flex-shrink: 0;
}

.send-btn:hover {
  opacity: 0.9;
  transform: scale(1.02);
}

.send-btn:active {
  transform: scale(0.98);
}

.send-btn:disabled {
  opacity: 0.25;
  cursor: not-allowed;
  transform: none;
}

.abort-btn {
  width: 30px;
  height: 30px;
  border-radius: 7px;
  border: none;
  background: var(--error-dim);
  color: var(--error);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
  flex-shrink: 0;
}

.abort-btn:hover {
  background: rgba(248, 113, 113, 0.15);
}

.input-hint {
  text-align: center;
  font-size: 11px;
  color: var(--text-muted);
  margin-top: 8px;
}

.input-hint span {
  color: var(--text-tertiary);
  font-weight: 500;
}
</style>
