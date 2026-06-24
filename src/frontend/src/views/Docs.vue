<script setup>
import { ref, onMounted, onUnmounted, nextTick, computed } from 'vue'
import axios from 'axios'
import { marked } from 'marked'

const API_BASE = import.meta.env.VITE_API_URL || ''

const docs = ref([])
const currentDoc = ref(null)
const htmlContent = ref('')
const loading = ref(false)
const error = ref(null)
const contentRef = ref(null)
const view = ref('index') // 'index' | 'doc'
const refreshing = ref(false)
const lastRefreshed = ref(null)
let refreshTimer = null

const docCount = computed(() => docs.value.length)

// Configure marked for security and styling
marked.setOptions({
  breaks: true,
  gfm: true,
})

function renderMarkdown(md) {
  return marked.parse(md)
}

async function loadDocs() {
  error.value = null
  try {
    const res = await axios.get(`${API_BASE}/api/docs`)
    if (res.data.success) {
      docs.value = res.data.data
      lastRefreshed.value = new Date().toLocaleTimeString()
    }
  } catch (e) {
    error.value = e.message || 'Failed to load docs'
  }
}

async function refreshDocs() {
  refreshing.value = true
  await loadDocs()
  refreshing.value = false
}

function showIndex() {
  view.value = 'index'
  currentDoc.value = null
  htmlContent.value = ''
}

async function loadDoc(filename) {
  loading.value = true
  error.value = null
  try {
    const res = await axios.get(`${API_BASE}/api/docs/${filename}`)
    if (res.data.success) {
      currentDoc.value = docs.value.find(d => d.filename === filename)
      view.value = 'doc'
      htmlContent.value = renderMarkdown(res.data.data)
    } else {
      error.value = res.data.error || 'Failed to load doc'
    }
  } catch (e) {
    error.value = e.message || 'Failed to load doc'
  }
  loading.value = false
  await nextTick()
  scrollToTop()
}

function scrollToTop() {
  const main = document.querySelector('main')
  if (main) main.scrollTop = 0
}

// Intercept clicks on links rendered from markdown
function handleContentClick(e) {
  const link = e.target.closest('a')
  if (!link) return

  const href = link.getAttribute('href')
  if (!href) return

  // Check if it's a local doc link (ends in .md)
  if (href.endsWith('.md')) {
    e.preventDefault()
    e.stopPropagation()
    const filename = href.split('/').pop()
    loadDoc(filename)
    return
  }

  // External links — let browser handle normally
  if (href.startsWith('http://') || href.startsWith('https://')) {
    return // let default behavior proceed
  }
}

// Auto-refresh every 60 seconds
onMounted(() => {
  loadDocs()
  // Load index.md by default
  const indexDoc = docs.value.find(d => d.filename === 'index.md')
  if (indexDoc) {
    loadDoc(indexDoc.filename)
  }
  refreshTimer = setInterval(loadDocs, 60000)
})

onUnmounted(() => {
  if (refreshTimer) clearInterval(refreshTimer)
})
</script>

<template>
  <div class="m-2 flex gap-6 h-[calc(100vh-8rem)]">
    <!-- Sidebar -->
    <aside class="w-56 flex-shrink-0 overflow-y-auto pr-2">
      <div class="flex items-center justify-between mb-3 px-2">
        <h2 class="text-xs font-semibold text-text-muted uppercase tracking-wider">
          Docs
        </h2>
        <div class="flex items-center gap-1">
          <button
            @click="refreshDocs"
            :disabled="refreshing"
            class="p-1 rounded text-text-muted hover:text-text-primary hover:bg-bg-tertiary transition-colors disabled:opacity-40"
            title="Refresh doc list"
          >
            <svg class="w-3.5 h-3.5" :class="refreshing ? 'animate-spin' : ''" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          <button
            v-if="view !== 'index'"
            @click="showIndex"
            class="text-xs text-text-muted hover:text-text-primary transition-colors"
            title="Back to index"
          >
            ←
          </button>
        </div>
      </div>
      <div class="space-y-0.5">
        <button
          v-for="doc in docs"
          :key="doc.filename"
          @click="loadDoc(doc.filename)"
          class="w-full text-left px-3 py-2 rounded-lg text-sm transition-all duration-150"
          :class="
            currentDoc?.filename === doc.filename && view !== 'index'
              ? 'bg-accent-subtle text-accent font-medium'
              : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
          "
        >
          {{ doc.title }}
        </button>
      </div>
      <div v-if="lastRefreshed" class="mt-3 px-2 text-xs text-text-muted/50">
        Updated {{ lastRefreshed }}
      </div>
    </aside>

    <!-- Content -->
    <main class="flex-1 overflow-y-auto">
      <!-- Index view — dynamic doc table -->
      <div v-if="view === 'index'" class="prose prose-invert max-w-none">
        <div class="mb-6">
          <h1>Documentation</h1>
          <p class="text-text-muted">
            {{ docCount }} document{{ docCount !== 1 ? 's' : '' }} in
            <code>docs/</code> — automatically updated when new docs are added.
          </p>
        </div>

        <!-- Docs table -->
        <div v-if="docs.length > 0">
          <table>
            <thead>
              <tr>
                <th style="width: 30%">Document</th>
                <th style="width: 40%">Description</th>
                <th>Tags</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="doc in docs"
                :key="doc.filename"
                class="cursor-pointer hover:bg-bg-tertiary/50"
                @click="loadDoc(doc.filename)"
              >
                <td class="text-accent font-medium">{{ doc.title }}</td>
                <td class="text-text-muted text-xs">{{ doc.description || '—' }}</td>
                <td>
                  <div class="flex flex-wrap gap-1">
                    <span
                      v-for="tag in (doc.tags || []).slice(0, 4)"
                      :key="tag"
                      class="text-xs px-1.5 py-0.5 rounded bg-bg-tertiary text-text-muted"
                    >
                      {{ tag }}
                    </span>
                    <span v-if="(doc.tags || []).length > 4" class="text-xs text-text-muted">
                      +{{ (doc.tags || []).length - 4 }}
                    </span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Empty state -->
        <div v-else class="card flex flex-col items-center justify-center h-64">
          <svg class="w-10 h-10 mb-3 text-text-muted/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <p class="text-sm text-text-muted">No documentation found yet.</p>
          <p class="text-xs text-text-muted/50 mt-1">Add markdown docs to <code>docs/</code> to get started.</p>
        </div>
      </div>

      <!-- Loading -->
      <div v-else-if="loading" class="flex items-center justify-center h-full">
        <svg class="w-6 h-6 animate-spin text-accent" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>

      <!-- Error -->
      <div v-else-if="error" class="card flex flex-col items-center justify-center h-64">
        <svg class="w-10 h-10 mb-3 text-error/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
        </svg>
        <p class="text-sm text-error">{{ error }}</p>
      </div>

      <!-- Doc content -->
      <div v-else-if="htmlContent" class="prose prose-invert max-w-none">
        <div v-if="currentDoc" class="flex gap-2 mb-6">
          <button
            @click="showIndex"
            class="px-3 py-1.5 text-xs rounded-lg bg-bg-tertiary text-text-secondary hover:bg-bg-quaternary transition-colors"
          >
            ← All Docs
          </button>
        </div>

        <div
          ref="contentRef"
          v-html="htmlContent"
          class="text-text-secondary leading-relaxed"
          @click="handleContentClick"
        />
      </div>

      <div v-else class="card flex items-center justify-center h-64">
        <p class="text-sm text-text-muted">No documentation loaded</p>
      </div>
    </main>
  </div>
</template>

<style scoped>
/* Markdown prose styles */
:deep(h1) {
  font-size: 1.875rem;
  font-weight: 700;
  color: var(--color-text-primary);
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--color-border);
}

:deep(h2) {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--color-text-primary);
  margin-top: 2rem;
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid color-mix(in srgb, var(--color-border) 50%, transparent);
}

:deep(h3) {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-text-primary);
  margin-top: 1.5rem;
  margin-bottom: 0.75rem;
}

:deep(h4) {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--color-text-primary);
  margin-top: 1.25rem;
  margin-bottom: 0.75rem;
}

:deep(p) {
  margin-bottom: 1rem;
}

:deep(a) {
  color: var(--color-accent);
  text-decoration: underline;
  text-decoration-color: color-mix(in srgb, var(--color-accent) 30%, transparent);
  transition: text-decoration-color 0.2s;
  cursor: pointer;
}

:deep(a:hover) {
  color: var(--color-accent-hover);
  text-decoration-color: var(--color-accent);
}

:deep(ul) {
  list-style-type: disc;
  padding-left: 1.5rem;
  margin-bottom: 1rem;
}

:deep(ol) {
  list-style-type: decimal;
  padding-left: 1.5rem;
  margin-bottom: 1rem;
}

:deep(li) {
  color: var(--color-text-secondary);
  margin-bottom: 0.25rem;
}

:deep(li > ul),
:deep(li > ol) {
  margin-top: 0.25rem;
  margin-bottom: 0;
}

:deep(code) {
  background-color: var(--color-bg-tertiary);
  color: var(--color-accent);
  padding: 0.125rem 0.375rem;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-family: var(--font-mono);
}

:deep(pre) {
  background-color: var(--color-bg-tertiary);
  border: 1px solid var(--color-border);
  border-radius: 0.75rem;
  padding: 1rem;
  margin-bottom: 1rem;
  overflow-x: auto;
}

:deep(pre code) {
  background: transparent;
  color: var(--color-text-secondary);
  padding: 0;
  font-size: 0.875rem;
  font-family: var(--font-mono);
}

:deep(blockquote) {
  border-left: 4px solid color-mix(in srgb, var(--color-accent) 50%, transparent);
  padding: 0.5rem 1rem;
  margin-top: 1rem;
  margin-bottom: 1rem;
  background-color: color-mix(in srgb, var(--color-accent-subtle) 30%, transparent);
  border-radius: 0 0.5rem 0.5rem 0;
}

:deep(blockquote p) {
  margin-bottom: 0;
  color: var(--color-text-muted);
}

:deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 1rem;
}

:deep(th) {
  text-align: left;
  padding: 0.5rem 0.75rem;
  background-color: var(--color-bg-tertiary);
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 1px solid var(--color-border);
}

:deep(td) {
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid color-mix(in srgb, var(--color-border) 50%, transparent);
  color: var(--color-text-secondary);
}

:deep(tr:hover td) {
  background-color: color-mix(in srgb, var(--color-bg-tertiary) 50%, transparent);
}

:deep(hr) {
  border: none;
  border-top: 1px solid var(--color-border);
  margin-top: 2rem;
  margin-bottom: 2rem;
}

:deep(img) {
  border-radius: 0.5rem;
  max-width: 100%;
}
</style>
