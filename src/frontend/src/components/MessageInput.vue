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
        <button class="image-attach-btn" @click="$refs.fileInput.click()" title="Attach image">
          📷
        </button>
        <input ref="fileInput" type="file" accept="image/*" multiple style="display:none" @change="onFileSelect">

        <div class="image-preview-area" v-if="selectedImages.length">
          <div v-for="(img, i) in selectedImages" :key="i" class="image-preview-item">
            <img :src="img.dataUrl" :alt="img.name">
            <button class="remove-image" @click="removeImage(i)">✕</button>
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
          ➤
        </button>
        <button v-else class="abort-btn" @click="$emit('abort')">■</button>
      </div>

      <div class="input-hint">
        <kbd>Enter</kbd> to send · <kbd>Shift+Enter</kbd> for new line · <kbd>Esc</kbd> to abort · Drag & drop or 📷 for images
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick } from 'vue';
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

const inputEl = ref(null);
const fileInput = ref(null);
const selectedImages = ref([]);
const isDragOver = ref(false);

const placeholder = 'Message Betty... (drag & drop or click 📷 to attach images)';

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
    if (file.size > 10 * 1024 * 1024) {
      // Could show toast here
      return;
    }
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

function clearImages() {
  selectedImages.value = [];
  emit('images-selected', []);
}

function getImages() {
  return selectedImages.value.map(img => {
    const commaIdx = img.dataUrl.indexOf(',');
    const prefix = img.dataUrl.slice(0, commaIdx);
    const base64Data = img.dataUrl.slice(commaIdx + 1);
    const mimeMatch = prefix.match(/data:([^;]+)/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    return { type: 'image', mimeType, data: base64Data };
  });
}

// Expose for parent
defineExpose({ clearImages, getImages });
</script>

<style scoped>
.input-area {
  padding: 16px 20px 20px;
  border-top: 1px solid var(--border);
  background: var(--bg-secondary);
}

.input-container {
  max-width: 800px;
  margin: 0 auto;
  position: relative;
}

.input-wrapper {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 8px 12px;
  transition: border-color 0.15s;
}

.input-wrapper:focus-within {
  border-color: var(--accent);
}

.input-wrapper.streaming {
  border-color: var(--yellow);
}

.input-wrapper.drag-over {
  border-color: var(--accent);
  background: rgba(88, 166, 255, 0.05);
}

.image-attach-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  transition: all 0.15s;
  flex-shrink: 0;
}

.image-attach-btn:hover {
  background: var(--bg-hover);
  color: var(--text-secondary);
}

.image-preview-area {
  display: flex;
  gap: 8px;
  padding: 4px 0;
  flex-wrap: wrap;
  position: absolute;
  bottom: 100%;
  left: 0;
  right: 0;
  margin-bottom: 8px;
}

.image-preview-item {
  position: relative;
  width: 64px;
  height: 64px;
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
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: rgba(0,0,0,0.7);
  color: white;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  line-height: 1;
  opacity: 0;
  transition: opacity 0.15s;
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
  max-height: 200px;
  min-height: 24px;
  line-height: 1.5;
  padding: 2px 0;
}

.message-input::placeholder {
  color: var(--text-muted);
}

.send-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: none;
  background: var(--accent);
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  transition: all 0.15s;
  flex-shrink: 0;
}

.send-btn:hover { background: var(--accent-hover); }
.send-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.abort-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: none;
  background: var(--red);
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  transition: all 0.15s;
  flex-shrink: 0;
}

.abort-btn:hover { background: #da3633; }

.input-hint {
  text-align: center;
  font-size: 11px;
  color: var(--text-muted);
  margin-top: 8px;
}

.input-hint kbd {
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: 3px;
  padding: 1px 5px;
  font-size: 10px;
  font-family: inherit;
}
</style>
