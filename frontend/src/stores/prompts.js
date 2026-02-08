import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import * as api from '../api/llama'

export const usePromptsStore = defineStore('prompts', () => {
  // State
  const prompts = ref([])
  const selectedPrompt = ref(null)
  const isLoading = ref(false)
  const isSaving = ref(false)
  const error = ref(null)
  const searchQuery = ref('')
  const filterType = ref('')
  const filterTag = ref('')

  // Getters
  const filteredPrompts = computed(() => {
    let result = prompts.value

    if (filterType.value) {
      result = result.filter((p) => p.type === filterType.value)
    }

    if (filterTag.value) {
      result = result.filter((p) => p.tags?.includes(filterTag.value))
    }

    if (searchQuery.value) {
      const query = searchQuery.value.toLowerCase()
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.content.toLowerCase().includes(query) ||
          p.description?.toLowerCase().includes(query)
      )
    }

    return result
  })

  const systemPrompts = computed(() =>
    prompts.value.filter((p) => p.type === 'system')
  )

  const userPrompts = computed(() =>
    prompts.value.filter((p) => p.type === 'user')
  )

  const templatePrompts = computed(() =>
    prompts.value.filter((p) => p.type === 'template')
  )

  const allTags = computed(() => {
    const tags = new Set()
    prompts.value.forEach((p) => {
      p.tags?.forEach((tag) => tags.add(tag))
    })
    return Array.from(tags).sort()
  })

  // Actions
  async function fetchPrompts(filters = {}) {
    isLoading.value = true
    error.value = null

    try {
      const result = await api.getPrompts(filters)
      prompts.value = result.prompts
      return result.prompts
    } catch (err) {
      error.value = err.message || 'Failed to fetch prompts'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function createPrompt(data) {
    isSaving.value = true
    error.value = null

    try {
      const result = await api.createPrompt(data)
      prompts.value.unshift(result.prompt)
      return result.prompt
    } catch (err) {
      error.value = err.message || 'Failed to create prompt'
      throw err
    } finally {
      isSaving.value = false
    }
  }

  async function updatePrompt(id, data) {
    isSaving.value = true
    error.value = null

    try {
      const result = await api.updatePrompt(id, data)
      const index = prompts.value.findIndex((p) => p.id === id)
      if (index !== -1) {
        prompts.value[index] = result.prompt
      }
      if (selectedPrompt.value?.id === id) {
        selectedPrompt.value = result.prompt
      }
      return result.prompt
    } catch (err) {
      error.value = err.message || 'Failed to update prompt'
      throw err
    } finally {
      isSaving.value = false
    }
  }

  async function deletePrompt(id) {
    error.value = null

    try {
      await api.deletePrompt(id)
      prompts.value = prompts.value.filter((p) => p.id !== id)
      if (selectedPrompt.value?.id === id) {
        selectedPrompt.value = null
      }
    } catch (err) {
      error.value = err.message || 'Failed to delete prompt'
      throw err
    }
  }

  async function duplicatePrompt(id) {
    isSaving.value = true
    error.value = null

    try {
      const result = await api.duplicatePrompt(id)
      prompts.value.unshift(result.prompt)
      return result.prompt
    } catch (err) {
      error.value = err.message || 'Failed to duplicate prompt'
      throw err
    } finally {
      isSaving.value = false
    }
  }

  function selectPrompt(prompt) {
    selectedPrompt.value = prompt
  }

  function clearSelection() {
    selectedPrompt.value = null
  }

  function setSearchQuery(query) {
    searchQuery.value = query
  }

  function setFilterType(type) {
    filterType.value = type
  }

  function setFilterTag(tag) {
    filterTag.value = tag
  }

  function clearFilters() {
    searchQuery.value = ''
    filterType.value = ''
    filterTag.value = ''
  }

  function clearError() {
    error.value = null
  }

  return {
    // State
    prompts,
    selectedPrompt,
    isLoading,
    isSaving,
    error,
    searchQuery,
    filterType,
    filterTag,

    // Getters
    filteredPrompts,
    systemPrompts,
    userPrompts,
    templatePrompts,
    allTags,

    // Actions
    fetchPrompts,
    createPrompt,
    updatePrompt,
    deletePrompt,
    duplicatePrompt,
    selectPrompt,
    clearSelection,
    setSearchQuery,
    setFilterType,
    setFilterTag,
    clearFilters,
    clearError,
  }
})
