<script setup>
import { ref, computed, nextTick, onMounted, onUnmounted, watch } from 'vue'
import { usePiChatStore } from '@/stores/pi-chat'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || ''

const store = usePiChatStore()

marked.setOptions({
  breaks: true,
  gfm: true,
})

// Slash commands — mirrors TUI BUILTIN_SLASH_COMMANDS
const SLASH_COMMANDS = [
  { name: 'settings', description: 'Open settings menu' },
  { name: 'model', description: 'Select model' },
  { name: 'scoped-models', description: 'Enable/disable models for Ctrl+P cycling' },
  { name: 'export', description: 'Export session (HTML default, or specify path: .html/.jsonl)' },
  { name: 'import', description: 'Import and resume a session from a JSONL file' },
  { name: 'share', description: 'Share session as a secret GitHub gist' },
  { name: 'copy', description: 'Copy last agent message to clipboard' },
  { name: 'name', description: 'Set session display name' },
  { name: 'session', description: 'Show session info and stats' },
  { name: 'changelog', description: 'Show changelog entries' },
  { name: 'hotkeys', description: 'Show all keyboard shortcuts' },
  { name: 'fork', description: 'Create a new fork from a previous user message' },
  { name: 'clone', description: 'Duplicate the current session at the current position' },
  { name: 'tree', description: 'Navigate session tree (switch branches)' },
  { name: 'trust', description: 'Save project trust decision for future sessions' },
  { name: 'login', description: 'Configure provider authentication' },
  { name: 'logout', description: 'Remove provider authentication' },
  { name: 'new', description: 'Start a new session' },
  { name: 'compact', description: 'Manually compact the session context' },
  { name: 'resume', description: 'Resume a different session' },
  { name: 'reload', description: 'Reload keybindings, extensions, skills, prompts, and themes' },
  { name: 'quit', description: 'Quit pi' },
]

// Slash command autocomplete state
const showSlashMenu = ref(false)
const slashSelectedIndex = ref(0)
const slashMenuRef = ref(null)
const slashPrefix = ref('') // reactive prefix for filtering

// Get the current line text before cursor position in textarea
function getTextBeforeCursor() {
  const el = textareaRef.value
  if (!el) return ''
  const cursorPos = el.selectionStart
  return el.value.slice(0, cursorPos)
}

// Get the current line (from last newline or start) before cursor
function getCurrentLineBeforeCursor() {
  const before = getTextBeforeCursor()
  const lastNewline = before.lastIndexOf('\n')
  return lastNewline === -1 ? before : before.slice(lastNewline + 1)
}

// Check if we're at the start of a line (or after whitespace) typing a /
function isAtStartOfLine() {
  const line = getCurrentLineBeforeCursor()
  return line.trimStart().startsWith('/')
}

// Extract the command prefix after / (e.g. "/com" -> "com")
function extractSlashPrefix() {
  const line = getCurrentLineBeforeCursor()
  const trimmed = line.trimStart()
  if (!trimmed.startsWith('/')) return null
  const afterSlash = trimmed.slice(1)
  const spaceIdx = afterSlash.indexOf(' ')
  return spaceIdx === -1 ? afterSlash : afterSlash.slice(0, spaceIdx)
}

// Filter commands matching the prefix (case-insensitive substring match)
const slashFilteredCommands = computed(() => {
  const prefix = slashPrefix.value
  if (!prefix) return SLASH_COMMANDS
  const lower = prefix.toLowerCase()
  return SLASH_COMMANDS.filter(cmd => cmd.name.toLowerCase().includes(lower))
})

// Combined items: filtered commands + matching skills
const slashAllItems = computed(() => {
  const commands = slashFilteredCommands.value.map(cmd => ({
    type: 'command',
    name: cmd.name,
    description: cmd.description,
    label: '/' + cmd.name,
  }))
  const prefix = slashPrefix.value
  const skillItems = store.skills
    .filter(skill => {
      if (!prefix) return true
      const lower = prefix.toLowerCase()
      const fullLabel = 'skill:' + skill.name
      return fullLabel.toLowerCase().includes(lower) || skill.name.toLowerCase().includes(lower)
    })
    .slice(0, 10)
    .map(skill => ({
      type: 'skill',
      name: skill.name,
      description: skill.description,
      label: '/skill:' + skill.name,
    }))
  return { commands, skills: skillItems, all: [...commands, ...skillItems] }
})

function showSlashMenuIfNeeded() {
  const line = getCurrentLineBeforeCursor()
  const trimmed = line.trimStart()
  if (trimmed.startsWith('/') && !store.isStreaming) {
    slashPrefix.value = extractSlashPrefix() || ''
    showSlashMenu.value = true
    slashSelectedIndex.value = 0
  } else {
    showSlashMenu.value = false
    slashPrefix.value = ''
  }
}

function hideSlashMenu() {
  showSlashMenu.value = false
  slashSelectedIndex.value = 0
}

function selectSlashCommand(item) {
  const el = textareaRef.value
  if (!el) return
  const cursorPos = el.selectionStart
  const before = el.value.slice(0, cursorPos)
  const after = el.value.slice(cursorPos)
  // Find the / command on current line and replace it
  const lastNewline = before.lastIndexOf('\n')
  const lineStart = lastNewline + 1
  const currentLine = before.slice(lineStart)
  const trimmed = currentLine.trimStart()
  const indent = currentLine.slice(0, currentLine.length - trimmed.length)
  const afterSlash = trimmed.slice(1)
  const spaceIdx = afterSlash.indexOf(' ')
  const commandPart = spaceIdx === -1 ? afterSlash : afterSlash.slice(0, spaceIdx + 1)
  const remainder = spaceIdx === -1 ? '' : afterSlash.slice(spaceIdx)
  // Replace: indent + /commandPart with /item.name + space
  const newLine = indent + item.label + ' ' + remainder
  el.value = before.slice(0, lineStart) + newLine + after
  // Position cursor after the command name + space
  const newCursorPos = lineStart + newLine.length - remainder.length
  el.value = el.value // trigger v-model update
  input.value = el.value
  nextTick(() => {
    el.focus()
    el.setSelectionRange(newCursorPos, newCursorPos)
  })
  hideSlashMenu()
}

function handleKeydown(e) {
  // Slash command autocomplete
  if (e.key === '/' && !store.isStreaming && getTextBeforeCursor().trimStart() === '') {
    // Typing / at start of line — will trigger showSlashMenuIfNeeded on next input
    return
  }

  if (showSlashMenu.value && slashAllItems.value.all.length > 0) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      slashSelectedIndex.value = (slashSelectedIndex.value + 1) % slashAllItems.value.all.length
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      slashSelectedIndex.value = (slashSelectedIndex.value - 1 + slashAllItems.value.all.length) % slashAllItems.value.all.length
      return
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      hideSlashMenu()
      return
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      const selected = slashAllItems.value.all[slashSelectedIndex.value]
      if (selected) {
        selectSlashCommand(selected)
      }
      return
    }
    if (e.key === 'Tab') {
      e.preventDefault()
      const selected = slashAllItems.value.all[slashSelectedIndex.value]
      if (selected) {
        selectSlashCommand(selected)
      }
      return
    }
  }

  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    hideSlashMenu()
    sendMessage()
  }
}

// Show/hide slash menu on input
function handleInput() {
  autoResize()
  if (isAtStartOfLine() && !store.isStreaming) {
    slashPrefix.value = extractSlashPrefix() || ''
    showSlashMenuIfNeeded()
  } else {
    hideSlashMenu()
  }
}

// Close slash menu on outside click
function handleClickOutside(e) {
  if (showSlashMenu.value) {
    const textarea = textareaRef.value
    const menu = slashMenuRef.value
    if (textarea && menu) {
      if (!textarea.contains(e.target) && !menu.contains(e.target)) {
        hideSlashMenu()
      }
    }
  }
}

// Watch for backspace that might cancel slash context
watch(() => textareaRef.value?.value, () => {
  if (showSlashMenu.value) {
    const prefix = extractSlashPrefix()
    if (!prefix && !isAtStartOfLine()) {
      hideSlashMenu()
    } else {
      slashPrefix.value = prefix || ''
    }
  }
})

const input = ref('')
const messagesRef = ref(null)
const textareaRef = ref(null)
const scrollLock = ref(false)

const allMessages = computed(() => {
  store.tick  // force re-evaluation on nested mutations (content, thinking, toolCalls)
  const msgs = [...store.messages]
  if (store.currentAssistant) {
    msgs.push(store.currentAssistant)
  }
  return msgs
})

async function scrollToBottom() {
  if (!scrollLock.value) {
    await nextTick()
    if (messagesRef.value) {
      messagesRef.value.scrollTop = messagesRef.value.scrollHeight
    }
  }
}

// Throttled auto-scroll: watch message count instead of deep-watching all messages
let scrollRafId = null
function throttledScrollToBottom() {
  if (scrollRafId) return
  scrollRafId = requestAnimationFrame(() => {
    scrollRafId = null
    scrollToBottom()
  })
}
watch(() => store.messages.length, throttledScrollToBottom)
watch(() => store.currentAssistant, (val) => {
  if (val) throttledScrollToBottom()
}, { deep: false })

onMounted(async () => {
  document.addEventListener('click', handleClickOutside)
  // Restore session (validates SSE, auto-fallbacks to createSession on stale sessions)
  await store.restoreSession()
  await scrollToBottom()
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  // Disconnect SSE but keep the session alive for persistence
  store.disconnectSSE()
})

function renderMarkdown(text) {
  if (!text) return ''
  return DOMPurify.sanitize(marked.parse(text), { RETURN_DOM: false })
}

async function sendMessage() {
  const text = input.value.trim()
  if (!text || store.isStreaming) return
  input.value = ''
  await store.sendPrompt(text)
  await nextTick()
  if (textareaRef.value) textareaRef.value.style.height = 'auto'
}

function autoResize() {
  const el = textareaRef.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = Math.min(el.scrollHeight, 160) + 'px'
}

function formatCost(cost) {
  if (cost === 0) return '$0.00'
  return '$' + cost.toFixed(4)
}

function formatTokens(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k'
  return n.toString()
}

const contextUsageText = computed(() => {
  if (!store.contextWindow) return null
  if (store.contextPercent === null || store.contextPercent === undefined) {
    return `?/${formatTokens(store.contextWindow)}`
  }
  return `${store.contextPercent.toFixed(1)}%/${formatTokens(store.contextWindow)}`
})

const contextUsageColor = computed(() => {
  if (store.contextPercent === null || store.contextPercent === undefined) return 'text-text-muted'
  if (store.contextPercent > 90) return 'text-error'
  if (store.contextPercent > 70) return 'text-warning'
  return 'text-text-muted'
})

function toggleToolCall(toolCall) {
  toolCall.expanded = !toolCall.expanded
}

async function handleNewSession() {
  // Dispose the old server session before creating a new one
  if (store.sessionId) {
    store.disconnectSSE()
    try {
      await axios.delete(`${API_BASE}/api/pi/session/${store.sessionId}`)
    } catch {}
  }
  await store.newSession()
  await scrollToBottom()
}

async function handleAbort() {
  await store.abort()
}

function handleScroll() {
  if (!messagesRef.value) return
  const el = messagesRef.value
  const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40
  scrollLock.value = !atBottom
}

function isLastAssistant(msg) {
  if (msg.role !== 'assistant') return false
  const msgs = allMessages.value
  return msgs.length > 0 && msgs[msgs.length - 1] === msg
}
</script>

<template>
  <div class="flex flex-col h-full min-h-0">
    <!-- Messages area -->
    <div
      ref="messagesRef"
      class="flex-1 overflow-y-auto px-6 py-4 space-y-6"
      @scroll="handleScroll"
    >
      <!-- Empty state -->
      <div v-if="allMessages.length === 0" class="flex flex-col items-center justify-center h-full text-center">
        <div class="w-16 h-16 rounded-2xl bg-accent-subtle flex items-center justify-center mb-4">
          <svg class="w-8 h-8 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
          </svg>
        </div>
        <h2 class="text-lg font-semibold text-text-primary mb-1">Chat</h2>
        <p class="text-sm text-text-muted max-w-md">
          Chat with an AI agent powered by Pi SDK. The agent can read files, run commands, edit code, and more.
        </p>
      </div>

      <!-- Messages -->
      <template v-for="msg in allMessages" :key="msg.id">
        <!-- User message -->
        <div v-if="msg.role === 'user'" class="flex justify-end">
          <div class="max-w-[75%]">
            <div class="bg-accent/20 text-accent rounded-2xl rounded-tr-sm px-4 py-3 text-sm break-words">
              {{ msg.content }}
            </div>
          </div>
        </div>

        <!-- Assistant message -->
        <div v-else-if="msg.role === 'assistant'" class="flex justify-start">
          <div class="max-w-[85%] w-full space-y-3">
            <!-- Thinking block -->
            <details
              v-if="msg.thinking"
              class="group"
              :open="false"
            >
              <summary class="flex items-center gap-2 cursor-pointer text-xs text-text-muted hover:text-text-secondary transition-colors select-none">
                <svg class="w-3.5 h-3.5 transition-transform group-open:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
                <span class="font-medium">Thinking</span>
              </summary>
              <div class="mt-2 ml-5 pl-3 border-l-2 border-border/50 text-xs text-text-muted font-mono whitespace-pre-wrap leading-relaxed">
                {{ msg.thinking }}
              </div>
            </details>

            <!-- Tool calls -->
            <template v-for="tool in msg.toolCalls" :key="tool.id">
              <details class="group" :open="tool.expanded">
                <summary class="flex items-center gap-2 cursor-pointer text-xs text-text-muted hover:text-text-secondary transition-colors select-none">
                  <svg class="w-3.5 h-3.5 transition-transform group-open:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                  <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.049.58.025 1.193-.14 1.743" />
                  </svg>
                  <span class="font-medium">{{ tool.name }}</span>
                  <span v-if="tool.success !== null" :class="tool.success ? 'text-success' : 'text-error'">
                    {{ tool.success ? '✓' : '✗' }}
                  </span>
                </summary>
                <div class="mt-2 ml-5 pl-3 border-l-2 border-border/50 space-y-2">
                  <!-- Params -->
                  <div class="text-xs text-text-muted">
                    <span class="font-medium">Input:</span>
                    <pre class="mt-1 bg-bg-tertiary rounded-lg p-2 overflow-x-auto text-xs text-text-secondary font-mono">{{ JSON.stringify(tool.params, null, 2) }}</pre>
                  </div>
                  <!-- Output -->
                  <div v-if="tool.output" class="text-xs text-text-muted">
                    <span class="font-medium">Output:</span>
                    <pre class="mt-1 bg-bg-tertiary rounded-lg p-2 overflow-x-auto max-h-48 text-xs text-text-secondary font-mono whitespace-pre-wrap">{{ tool.output }}</pre>
                  </div>
                </div>
              </details>
            </template>

            <!-- Message content (markdown) -->
            <div
              v-if="msg.content"
              class="text-sm text-text-secondary leading-relaxed"
            >
              <div
                v-if="!isLastAssistant(msg)"
                v-html="renderMarkdown(msg.content)"
                class="pi-prose"
              />
              <template v-else>
                <!-- Streaming message: render markdown for completed part, show cursor for live part -->
                <div v-html="renderMarkdown(msg.content)" class="pi-prose" />
                <span v-if="store.isStreaming" class="inline-block w-2 h-4 bg-accent ml-0.5 animate-pulse" />
              </template>
            </div>
          </div>
        </div>
      </template>

      <!-- Error display -->
      <div v-if="store.error" class="flex justify-start">
        <div class="max-w-[75%]">
          <div class="bg-error/10 border border-error/30 text-error rounded-2xl rounded-tl-sm px-4 py-3 text-sm break-words">
            <div class="flex items-center gap-2">
              <svg class="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              <span>{{ store.error }}</span>
              <button @click="store.clearError()" class="ml-auto text-current opacity-60 hover:opacity-100">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Input area -->
    <div class="flex-shrink-0 border-t border-border bg-bg-secondary px-6 py-3">
      <div class="flex items-end gap-3">
        <div class="flex-1 relative">
          <textarea
            ref="textareaRef"
            v-model="input"
            @keydown="handleKeydown"
            @input="handleInput"
            placeholder="Send a message... (Shift+Enter for new line)"
            rows="1"
            :disabled="store.isStreaming"
            class="w-full bg-bg-tertiary border border-border rounded-xl px-4 py-3 pr-4 text-sm text-text-primary placeholder:text-text-muted resize-none focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150"
          />

          <!-- Slash command autocomplete dropdown -->
          <transition
            enter-active-class="transition duration-150 ease-out"
            enter-from-class="opacity-0 -translate-y-1"
            enter-to-class="opacity-100 translate-y-0"
            leave-active-class="transition duration-100 ease-in"
            leave-from-class="opacity-100 translate-y-0"
            leave-to-class="opacity-0 -translate-y-1"
          >
            <div
              v-if="showSlashMenu"
              ref="slashMenuRef"
              class="absolute bottom-full left-0 right-0 mb-2 bg-bg-secondary border border-border rounded-xl shadow-lg overflow-hidden z-50 max-h-52"
            >
              <div class="overflow-y-auto max-h-44 py-1">
                <!-- Slash Commands section -->
                <template v-if="slashAllItems.commands.length > 0">
                  <div class="px-3 py-1">
                    <span class="text-[10px] font-semibold uppercase tracking-wider text-text-muted">Slash Commands</span>
                  </div>
                  <button
                    v-for="(cmd, idx) in slashAllItems.commands.slice(0, 10)"
                    :key="'cmd-' + cmd.name"
                    type="button"
                    @mousedown.prevent="selectSlashCommand(cmd)"
                    class="w-full flex items-center gap-3 px-3 py-1.5 text-left text-xs transition-colors"
                    :class="idx === slashSelectedIndex ? 'bg-accent/10 text-accent' : 'text-text-secondary hover:bg-bg-tertiary'"
                  >
                    <span class="flex-shrink-0 w-4 text-center">
                      <span v-if="idx === slashSelectedIndex">→</span>
                      <span v-else class="opacity-0">·</span>
                    </span>
                    <span class="flex-shrink-0 font-mono font-medium min-w-[9rem] max-w-[9rem] truncate">
                      {{ cmd.label }}
                    </span>
                    <span class="text-text-muted truncate">{{ cmd.description }}</span>
                  </button>
                </template>

                <!-- Skills section -->
                <template v-if="slashAllItems.skills.length > 0">
                  <div class="px-3 py-1 border-t border-border/50 mt-1">
                    <span class="text-[10px] font-semibold uppercase tracking-wider text-text-muted">Skills</span>
                  </div>
                  <button
                    v-for="(skill, sIdx) in slashAllItems.skills"
                    :key="'skill-' + skill.name"
                    type="button"
                    @mousedown.prevent="selectSlashCommand(skill)"
                    class="w-full flex items-center gap-3 px-3 py-1.5 text-left text-xs transition-colors"
                    :class="slashSelectedIndex >= slashAllItems.commands.length && (slashSelectedIndex - slashAllItems.commands.length) === sIdx ? 'bg-accent/10 text-accent' : 'text-text-secondary hover:bg-bg-tertiary'"
                  >
                    <span class="flex-shrink-0 w-4 text-center">
                      <span v-if="slashSelectedIndex >= slashAllItems.commands.length && (slashSelectedIndex - slashAllItems.commands.length) === sIdx">→</span>
                      <span v-else class="opacity-0">·</span>
                    </span>
                    <span class="flex-shrink-0 font-mono font-medium min-w-[9rem] max-w-[9rem] truncate">
                      {{ skill.label }}
                    </span>
                    <span class="text-text-muted truncate">{{ skill.description }}</span>
                  </button>
                </template>

                <div v-if="slashAllItems.all.length === 0" class="px-3 py-2 text-xs text-text-muted italic">
                  No matching commands
                </div>
              </div>
              <div class="px-3 py-1.5 border-t border-border flex items-center justify-between">
                <span class="text-[10px] text-text-muted">
                  ↑↓ navigate · enter select · esc cancel
                </span>
                <span class="text-[10px] text-text-muted">
                  {{ slashSelectedIndex + 1 }}/{{ slashAllItems.all.length }}
                </span>
              </div>
            </div>
          </transition>
        </div>
        <button
          v-if="!store.isStreaming"
          @click="sendMessage"
          :disabled="!input.trim()"
          class="flex-shrink-0 w-10 h-10 rounded-xl bg-accent text-white flex items-center justify-center hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150"
        >
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
          </svg>
        </button>
        <button
          v-else
          @click="handleAbort"
          class="flex-shrink-0 w-10 h-10 rounded-xl bg-error/20 text-error flex items-center justify-center hover:bg-error/30 transition-all duration-150"
        >
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Status footer -->
    <div class="flex-shrink-0 flex flex-wrap items-center justify-between gap-2 px-6 py-2 border-t border-border bg-bg-secondary text-xs text-text-muted">
      <div class="flex items-center gap-4">
        <button
          @click="handleNewSession"
          :disabled="store.isStreaming"
          class="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:text-text-primary hover:bg-bg-tertiary transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New Session
        </button>
        <span v-if="store.model" class="flex items-center gap-1.5">
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
          </svg>
          {{ store.model }}
        </span>
        <span v-if="store.isStreaming" class="flex items-center gap-1.5 text-accent">
          <span class="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
          Streaming
        </span>
      </div>
      <div class="flex items-center gap-4">
        <span v-if="store.tokens.total > 0">
          ↑{{ formatTokens(store.tokens.input) }} ↓{{ formatTokens(store.tokens.output) }}
        </span>
        <span v-if="store.cost > 0">{{ formatCost(store.cost) }}</span>
        <span v-if="contextUsageText" :class="contextUsageColor">{{ contextUsageText }}</span>
        <span v-if="store.sseConnected" class="text-success">●</span>
        <span v-else class="text-error">●</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Markdown prose styles for Pi chat */

/* Force text wrapping on the entire prose container */
:deep(.pi-prose) {
  overflow-wrap: break-word;
  word-wrap: break-word;
  word-break: break-word;
  max-width: 100%;
}

:deep(.pi-prose h1) {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-text-primary);
  margin-bottom: 1rem;
}

:deep(.pi-prose h2) {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-text-primary);
  margin-top: 1.25rem;
  margin-bottom: 0.75rem;
}

:deep(.pi-prose h3) {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--color-text-primary);
  margin-top: 1rem;
  margin-bottom: 0.5rem;
}

:deep(.pi-prose p) {
  margin-bottom: 0.75rem;
  overflow-wrap: break-word;
  word-break: break-word;
}

:deep(.pi-prose a) {
  color: var(--color-accent);
  text-decoration: underline;
  text-decoration-color: color-mix(in srgb, var(--color-accent) 30%, transparent);
}

:deep(.pi-prose ul) {
  list-style-type: disc;
  padding-left: 1.5rem;
  margin-bottom: 0.75rem;
}

:deep(.pi-prose ol) {
  list-style-type: decimal;
  padding-left: 1.5rem;
  margin-bottom: 0.75rem;
}

:deep(.pi-prose li) {
  color: var(--color-text-secondary);
  margin-bottom: 0.25rem;
}

:deep(.pi-prose code) {
  background-color: var(--color-bg-tertiary);
  color: var(--color-accent);
  padding: 0.125rem 0.375rem;
  border-radius: 0.375rem;
  font-size: 0.8125rem;
  font-family: var(--font-mono);
  overflow-wrap: break-word;
  word-break: break-word;
}

:deep(.pi-prose pre) {
  background-color: var(--color-bg-tertiary);
  border: 1px solid var(--color-border);
  border-radius: 0.75rem;
  padding: 0.75rem;
  margin-bottom: 0.75rem;
  overflow-x: auto;
  max-width: 100%;
}

:deep(.pi-prose pre code) {
  white-space: pre;
  overflow-wrap: normal;
  word-break: normal;
  background: transparent;
  color: var(--color-text-secondary);
  padding: 0;
  font-size: 0.8125rem;
}

:deep(.pi-prose blockquote) {
  border-left: 3px solid color-mix(in srgb, var(--color-accent) 50%, transparent);
  padding: 0.5rem 1rem;
  margin-bottom: 0.75rem;
  background-color: color-mix(in srgb, var(--color-accent-subtle) 20%, transparent);
  border-radius: 0 0.5rem 0.5rem 0;
  color: var(--color-text-muted);
}

:deep(.pi-prose table) {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 0.75rem;
  table-layout: fixed;
}

:deep(.pi-prose td),
:deep(.pi-prose th) {
  overflow-wrap: break-word;
  word-break: break-word;
}

:deep(.pi-prose th) {
  text-align: left;
  padding: 0.5rem 0.75rem;
  background-color: var(--color-bg-tertiary);
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-text-muted);
  border-bottom: 1px solid var(--color-border);
}

:deep(.pi-prose td) {
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid color-mix(in srgb, var(--color-border) 50%, transparent);
  color: var(--color-text-secondary);
  font-size: 0.875rem;
}

:deep(.pi-prose hr) {
  border: none;
  border-top: 1px solid var(--color-border);
  margin-top: 1rem;
  margin-bottom: 1rem;
}
</style>
