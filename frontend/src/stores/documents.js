import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import * as api from '../api/llama'

export const useDocumentsStore = defineStore('documents', () => {
  // State
  const documents = ref([])
  const isUploading = ref(false)
  const isProcessing = ref({}) // { documentId: true/false }
  const error = ref(null)
  const searchQuery = ref('')
  const selectedDocument = ref(null)

  // RAG Configuration
  const ragConfig = ref({
    enabled: false,
    topK: 5,
    minSimilarity: 0.7,
  })

  // Getters
  const filteredDocuments = computed(() => {
    if (!searchQuery.value) return documents.value

    const query = searchQuery.value.toLowerCase()
    return documents.value.filter(
      (doc) =>
        doc.filename.toLowerCase().includes(query) ||
        doc.metadata.title?.toLowerCase().includes(query) ||
        doc.metadata.tags?.some((tag) => tag.toLowerCase().includes(query))
    )
  })

  const totalDocuments = computed(() => documents.value.length)

  const hasDocuments = computed(() => documents.value.length > 0)

  const readyDocuments = computed(() =>
    documents.value.filter((doc) => doc.status === 'ready')
  )

  const processingDocuments = computed(() =>
    documents.value.filter((doc) => doc.status === 'processing')
  )

  // Actions
  async function uploadDocument(file, metadata = {}) {
    isUploading.value = true
    error.value = null

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('title', metadata.title || file.name)

      // Send tags as comma-separated string instead of JSON
      if (metadata.tags && metadata.tags.length > 0) {
        formData.append('tags', metadata.tags.join(','))
      }

      const result = await api.uploadDocument(formData)

      // Add to documents list
      documents.value.unshift(result.document)

      // Mark as processing
      isProcessing.value[result.document.id] = true

      // Poll for processing status
      pollDocumentStatus(result.document.id)

      return result.document
    } catch (err) {
      error.value = err.message || 'Failed to upload document'
      throw err
    } finally {
      isUploading.value = false
    }
  }

  async function fetchDocuments() {
    error.value = null

    try {
      const result = await api.fetchDocuments()
      documents.value = result.documents || []
    } catch (err) {
      // Only show error for non-auth issues (auth handled by router)
      if (err.status !== 401) {
        error.value = err.message || 'Failed to fetch documents'
      }
      throw err
    }
  }

  async function deleteDocument(documentId) {
    error.value = null

    try {
      await api.deleteDocument(documentId)

      // Remove from list
      const index = documents.value.findIndex((doc) => doc.id === documentId)
      if (index !== -1) {
        documents.value.splice(index, 1)
      }

      // Clear selection if deleted
      if (selectedDocument.value?.id === documentId) {
        selectedDocument.value = null
      }
    } catch (err) {
      error.value = err.message || 'Failed to delete document'
      throw err
    }
  }

  async function reprocessDocument(documentId) {
    error.value = null
    isProcessing.value[documentId] = true

    try {
      await api.reprocessDocument(documentId)

      // Update document status
      const doc = documents.value.find((d) => d.id === documentId)
      if (doc) {
        doc.status = 'processing'
      }

      // Poll for status
      pollDocumentStatus(documentId)
    } catch (err) {
      error.value = err.message || 'Failed to reprocess document'
      isProcessing.value[documentId] = false
      throw err
    }
  }

  async function searchDocuments(query, options = {}) {
    error.value = null

    try {
      const result = await api.searchDocuments(query, options)
      return result.results || []
    } catch (err) {
      error.value = err.message || 'Failed to search documents'
      throw err
    }
  }

  async function pollDocumentStatus(documentId, maxAttempts = 60) {
    let attempts = 0

    const poll = async () => {
      try {
        const doc = await api.getDocument(documentId)

        // Update document in list
        const index = documents.value.findIndex((d) => d.id === documentId)
        if (index !== -1) {
          documents.value[index] = doc.document
        }

        if (doc.document.status === 'ready' || doc.document.status === 'error') {
          isProcessing.value[documentId] = false
          return
        }

        attempts++
        if (attempts < maxAttempts) {
          setTimeout(poll, 2000) // Poll every 2 seconds
        } else {
          isProcessing.value[documentId] = false
        }
      } catch (err) {
        console.error('Failed to poll document status:', err)
        isProcessing.value[documentId] = false
      }
    }

    poll()
  }

  async function updateRagConfig(updates) {
    Object.assign(ragConfig.value, updates)
  }

  function setSearchQuery(query) {
    searchQuery.value = query
  }

  function selectDocument(document) {
    selectedDocument.value = document
  }

  function clearError() {
    error.value = null
  }

  function setError(message) {
    error.value = message
  }

  return {
    // State
    documents,
    isUploading,
    isProcessing,
    error,
    searchQuery,
    selectedDocument,
    ragConfig,

    // Getters
    filteredDocuments,
    totalDocuments,
    hasDocuments,
    readyDocuments,
    processingDocuments,

    // Actions
    uploadDocument,
    fetchDocuments,
    deleteDocument,
    reprocessDocument,
    searchDocuments,
    updateRagConfig,
    setSearchQuery,
    selectDocument,
    clearError,
    setError,
  }
})
