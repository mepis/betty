const BASE_URL = ''

class ApiError extends Error {
  constructor(message, status, data) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
  }
}

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`

  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include', // CRITICAL: Include cookies for authentication
    ...options,
  }

  try {
    const response = await fetch(url, config)
    const data = await response.json()

    if (!response.ok) {
      // Handle authentication errors
      if (response.status === 401) {
        // Not authenticated - throw error and let router handle redirect
        throw new ApiError(
          data.error?.message || 'Authentication required',
          response.status,
          data
        )
      }

      // Handle permission errors
      if (response.status === 403) {
        throw new ApiError(
          data.error?.message || 'Insufficient permissions',
          response.status,
          data
        )
      }

      throw new ApiError(
        data.error?.message || 'Request failed',
        response.status,
        data
      )
    }

    return data
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }

    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new ApiError('Unable to connect to server', 0, null)
    }

    throw new ApiError(error.message || 'Unknown error', 0, null)
  }
}

export async function getChatCompletion(messages, options = {}) {
  return request('/v1/chat/completions', {
    method: 'POST',
    body: JSON.stringify({
      messages,
      max_tokens: options.maxTokens || 512,
      temperature: options.temperature || 0.7,
      top_p: options.topP || 0.95,
      ...options,
    }),
  })
}

export async function getCompletion(prompt, options = {}) {
  return request('/v1/completions', {
    method: 'POST',
    body: JSON.stringify({
      prompt,
      max_tokens: options.maxTokens || 512,
      temperature: options.temperature || 0.7,
      top_p: options.topP || 0.95,
      ...options,
    }),
  })
}

export async function getModels() {
  return request('/v1/models')
}

export async function getHealth() {
  return request('/health')
}

// Model Management API

export async function getModelCatalog() {
  return request('/api/models/catalog')
}

export async function getActiveModel() {
  return request('/api/models/active')
}

export async function downloadModel(modelId) {
  return request('/api/models/download', {
    method: 'POST',
    body: JSON.stringify({ modelId }),
  })
}

export async function downloadCustomModel(url, name) {
  return request('/api/models/download/custom', {
    method: 'POST',
    body: JSON.stringify({ url, name }),
  })
}

export async function cancelDownload(downloadId) {
  return request(`/api/models/download/${downloadId}`, {
    method: 'DELETE',
  })
}

export async function switchModel(filename) {
  return request('/api/models/switch', {
    method: 'POST',
    body: JSON.stringify({ filename }),
  })
}

export async function deleteModel(filename) {
  return request(`/api/models/${filename}`, {
    method: 'DELETE',
  })
}

// Document Management API

export async function uploadDocument(formData) {
  const url = `${BASE_URL}/api/documents/upload`

  try {
    const response = await fetch(url, {
      method: 'POST',
      credentials: 'include', // Include cookies for authentication
      body: formData, // Don't set Content-Type for FormData
    })

    // Try to parse response as JSON, fallback to text if it fails
    let data
    try {
      data = await response.json()
    } catch (jsonError) {
      // If JSON parsing fails, try to get text for better error message
      const text = await response.text()
      throw new ApiError(
        `Server error: ${text || 'Invalid response format'}`,
        response.status,
        null
      )
    }

    if (!response.ok) {
      // Handle authentication errors
      if (response.status === 401) {
        throw new ApiError(
          data.error?.message || 'Authentication required',
          response.status,
          data
        )
      }

      throw new ApiError(
        data.error?.message || 'Upload failed',
        response.status,
        data
      )
    }

    return data
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    throw new ApiError(error.message || 'Upload failed', 0, null)
  }
}

export async function fetchDocuments(filter = {}) {
  const params = new URLSearchParams()
  if (filter.type) params.append('type', filter.type)
  if (filter.tag) params.append('tag', filter.tag)
  if (filter.status) params.append('status', filter.status)

  const queryString = params.toString()
  const endpoint = `/api/documents${queryString ? '?' + queryString : ''}`

  return request(endpoint)
}

export async function getDocument(documentId) {
  return request(`/api/documents/${documentId}`)
}

export async function deleteDocument(documentId) {
  return request(`/api/documents/${documentId}`, {
    method: 'DELETE',
  })
}

export async function reprocessDocument(documentId, options = {}) {
  return request(`/api/documents/${documentId}/reprocess`, {
    method: 'POST',
    body: JSON.stringify(options),
  })
}

export async function getDocumentChunks(documentId) {
  return request(`/api/documents/${documentId}/chunks`)
}

// RAG API

export async function searchDocuments(query, options = {}) {
  return request('/api/rag/search', {
    method: 'POST',
    body: JSON.stringify({
      query,
      topK: options.topK,
      minSimilarity: options.minSimilarity,
      documentIds: options.documentIds,
    }),
  })
}

export async function getRagConfig() {
  return request('/api/rag/config')
}

export async function updateRagConfig(config) {
  return request('/api/rag/config', {
    method: 'PUT',
    body: JSON.stringify(config),
  })
}

export async function getRagStats() {
  return request('/api/rag/stats')
}

// Authentication API

export async function login(username, password) {
  return request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })
}

export async function logout() {
  return request('/api/auth/logout', {
    method: 'POST',
  })
}

export async function getCurrentUser() {
  return request('/api/auth/me')
}

export async function checkFirstSetup() {
  return request('/api/auth/setup')
}

export async function setupAdmin(username, email, password) {
  return request('/api/auth/setup', {
    method: 'POST',
    body: JSON.stringify({ username, email, password }),
  })
}

// User Management API (Admin only)

export async function getUsers() {
  return request('/api/auth/users')
}

export async function createUser(username, email, password, role = 'user') {
  return request('/api/auth/users', {
    method: 'POST',
    body: JSON.stringify({ username, email, password, role }),
  })
}

export async function updateUser(userId, updates) {
  return request(`/api/auth/users/${userId}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  })
}

export async function updateUserPassword(userId, password) {
  return request(`/api/auth/users/${userId}/password`, {
    method: 'PUT',
    body: JSON.stringify({ password }),
  })
}

export async function deleteUser(userId) {
  return request(`/api/auth/users/${userId}`, {
    method: 'DELETE',
  })
}

// Server Management API (Admin only)

export async function shutdownServer() {
  return request('/api/shutdown', {
    method: 'POST',
  })
}

// Settings API

export async function getSettings() {
  return request('/api/settings')
}

export async function updateSettings(settings) {
  return request('/api/settings', {
    method: 'PUT',
    body: JSON.stringify(settings),
  })
}

// Embedding Settings API

export async function getEmbeddingStatus() {
  return request('/api/settings/embedding/status')
}

export async function updateEmbeddingSettings(settings) {
  return request('/api/settings/embedding', {
    method: 'PUT',
    body: JSON.stringify(settings),
  })
}

// Google Drive API

export async function getGoogleDriveStatus() {
  return request('/api/google-drive/status')
}

export async function configureGoogleDrive(clientId, clientSecret, redirectUri) {
  return request('/api/google-drive/configure', {
    method: 'POST',
    body: JSON.stringify({ clientId, clientSecret, redirectUri }),
  })
}

export async function getGoogleDriveAuthUrl() {
  return request('/api/google-drive/auth-url')
}

export async function disconnectGoogleDrive() {
  return request('/api/google-drive/disconnect', {
    method: 'POST',
  })
}

export async function getGoogleDriveSharedDrives() {
  return request('/api/google-drive/shared-drives')
}

export async function getGoogleDriveFiles(folderId = 'root', driveId = null) {
  const params = new URLSearchParams()
  if (folderId) params.append('folderId', folderId)
  if (driveId) params.append('driveId', driveId)
  return request(`/api/google-drive/files?${params.toString()}`)
}

export async function importFromGoogleDrive(files, tags = []) {
  return request('/api/google-drive/import', {
    method: 'POST',
    body: JSON.stringify({ files, tags }),
  })
}

// Prompts API

export async function getPrompts(filters = {}) {
  const params = new URLSearchParams()
  if (filters.type) params.append('type', filters.type)
  if (filters.tag) params.append('tag', filters.tag)
  if (filters.search) params.append('search', filters.search)
  const query = params.toString()
  return request(`/api/prompts${query ? `?${query}` : ''}`)
}

export async function getPrompt(id) {
  return request(`/api/prompts/${id}`)
}

export async function createPrompt(data) {
  return request('/api/prompts', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updatePrompt(id, data) {
  return request(`/api/prompts/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function deletePrompt(id) {
  return request(`/api/prompts/${id}`, {
    method: 'DELETE',
  })
}

export async function duplicatePrompt(id) {
  return request(`/api/prompts/${id}/duplicate`, {
    method: 'POST',
  })
}

export { ApiError }
