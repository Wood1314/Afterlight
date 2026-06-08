export interface AfterglowInfo {
  app_name: string
  app_slogan: string
  friend_name: string
  self_name: string
  relationship_type: string
  relationship_description: string
  persona_template: string
  embedding_model: string
  chat_model: string
  version: string
  has_persona_card: boolean
}

export interface AfterglowMemoryStats {
  friend_messages: number
  dialogue_windows: number
  response_pairs: number
  live_messages: number
  relationship_memories: number
  writeback_enabled: boolean
  writeback_paused: boolean
}

export interface AfterglowImportCandidate {
  name: string
  uid: string
  role_hint: 'self' | 'friend' | 'unknown'
}

export interface AfterglowInspectResult {
  format: 'qqexporter_v5' | 'wechat_weflow' | 'unknown'
  total_messages: number
  candidates: AfterglowImportCandidate[]
  error: string
}

export interface AfterglowUploadedFile extends AfterglowInspectResult {
  name: string
  saved_as: string
  size: number
}

export interface AfterglowImportTask {
  task_id: string
  status: string
  phase?: string
  step?: string
  message?: string
  error?: string | null
  progress?: number | null
  created_at?: number
  updated_at?: number
}

export interface AfterglowConfigValuesResponse {
  values: Record<string, {
    set: boolean
    value?: string | null
    preview?: string
  }>
}

export interface AfterglowConfigStatus {
  identity_ok: boolean
  chat_ok: boolean
  embedding_ok: boolean
  auth_ok: boolean
  wizard_completed: boolean
  env_path: string
  example_path: string
}

export interface AfterglowMemorySearchHit {
  id?: string
  text?: string
  score?: number
  source?: string
  role?: string
  timestamp?: string | number | null
  meta?: Record<string, unknown>
}

export interface AfterglowMemorySearchResult {
  fused: AfterglowMemorySearchHit[]
  response_pairs: AfterglowMemorySearchHit[]
  friend_examples: AfterglowMemorySearchHit[]
  dialogue_windows: AfterglowMemorySearchHit[]
  recent_live: AfterglowMemorySearchHit[]
  trace_id?: string
}

export interface AfterglowDebugModelCall {
  ts_ms: number
  trace_id: string
  stage: string
  attempt: number
  model: string
  url: string
  stream: boolean
  latency_ms: number
  status: string
  status_code?: number | null
  upstream_request_id?: string
  request?: Record<string, unknown>
  response?: Record<string, unknown>
  error?: string
}

export interface AfterglowDebugStats {
  version: string
  memory: {
    friend_messages: number
    dialogue_windows: number
    response_pairs: number
    live_messages: number
    relationship_memories: number
  }
  writeback?: {
    enqueued: number
    written: number
    flushed_batches: number
    dropped: number
    failed: number
    paused: boolean
    pending_turns: number
  }
  model_chain: AfterglowDebugModelCall[]
 }

function withAuthHeaders(apiKey: string) {
  const headers = new Headers()
  if (apiKey.trim()) {
    headers.set('Authorization', `Bearer ${apiKey.trim()}`)
    headers.set('x-api-key', apiKey.trim())
  }
  return headers
}

function normalizeBaseUrl(baseUrl: string) {
  const trimmed = baseUrl.trim()
  return trimmed.endsWith('/') ? trimmed : `${trimmed}/`
}

function withConfigHeaders(setupToken: string) {
  return withAuthHeaders(setupToken)
}

/**
 * Minimal client for an external Afterglow backend.
 *
 * Use when:
 * - AIRI needs to inspect or call an Afterglow memory backend over HTTP
 * - Configuration UI should verify the backend before import/chat integration
 *
 * Expects:
 * - The backend exposes the documented OpenAI-compatible and memory endpoints
 *
 * Returns:
 * - Small authenticated helpers for metadata and memory status calls
 */
export function createAfterglowClient(baseUrl: string, credentials?: {
  runtimeApiKey?: string
  configSetupToken?: string
}) {
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl)
  const runtimeApiKey = credentials?.runtimeApiKey ?? ''
  const configSetupToken = credentials?.configSetupToken ?? ''

  async function getInfo(): Promise<AfterglowInfo> {
    const response = await fetch(new URL('v1/info', normalizedBaseUrl), {
      method: 'GET',
      headers: withAuthHeaders(runtimeApiKey),
    })

    if (!response.ok) {
      throw new Error(`Afterglow info request failed with ${response.status}`)
    }

    return await response.json() as AfterglowInfo
  }

  async function getMemoryStats(): Promise<AfterglowMemoryStats> {
    const response = await fetch(new URL('memory/stats', normalizedBaseUrl), {
      method: 'GET',
      headers: withAuthHeaders(runtimeApiKey),
    })

    if (!response.ok) {
      throw new Error(`Afterglow memory stats request failed with ${response.status}`)
    }

    return await response.json() as AfterglowMemoryStats
  }

  async function inspectImportFile(file: File): Promise<AfterglowInspectResult> {
    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch(new URL('config/import/inspect', normalizedBaseUrl), {
      method: 'POST',
      headers: withConfigHeaders(configSetupToken),
      body: formData,
    })

    if (!response.ok) {
      throw new Error(`Afterglow inspect request failed with ${response.status}`)
    }

    return await response.json() as AfterglowInspectResult
  }

  async function getConfigValues(): Promise<AfterglowConfigValuesResponse> {
    const response = await fetch(new URL('config/values', normalizedBaseUrl), {
      method: 'GET',
      headers: withConfigHeaders(configSetupToken),
    })

    if (!response.ok) {
      throw new Error(`Afterglow config values request failed with ${response.status}`)
    }

    return await response.json() as AfterglowConfigValuesResponse
  }

  async function getConfigStatus(): Promise<AfterglowConfigStatus> {
    const response = await fetch(new URL('config/status', normalizedBaseUrl), {
      method: 'GET',
      headers: withConfigHeaders(configSetupToken),
    })

    if (!response.ok) {
      throw new Error(`Afterglow config status request failed with ${response.status}`)
    }

    return await response.json() as AfterglowConfigStatus
  }

  async function putConfigValues(values: Record<string, string>) {
    const headers = withConfigHeaders(configSetupToken)
    headers.set('Content-Type', 'application/json')

    const response = await fetch(new URL('config/values', normalizedBaseUrl), {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        values,
        dry_run: false,
      }),
    })

    if (!response.ok) {
      throw new Error(`Afterglow config update request failed with ${response.status}`)
    }

    return await response.json() as {
      ok: boolean
      backup?: string | null
      restart_required?: boolean
      errors?: Array<{ field: string, message: string }>
    }
  }

  async function uploadImportFiles(files: File[]): Promise<AfterglowUploadedFile[]> {
    const formData = new FormData()
    for (const file of files)
      formData.append('files', file)

    const response = await fetch(new URL('config/import/upload', normalizedBaseUrl), {
      method: 'POST',
      headers: withConfigHeaders(configSetupToken),
      body: formData,
    })

    if (!response.ok) {
      throw new Error(`Afterglow upload request failed with ${response.status}`)
    }

    const payload = await response.json() as { uploaded: AfterglowUploadedFile[] }
    return payload.uploaded
  }

  async function startImport(files: AfterglowUploadedFile[], personaSource?: string): Promise<AfterglowImportTask> {
    const headers = withConfigHeaders(configSetupToken)
    headers.set('Content-Type', 'application/json')

    const response = await fetch(new URL('config/import/start', normalizedBaseUrl), {
      method: 'POST',
      headers,
      body: JSON.stringify({
        files: files.map(file => file.saved_as),
        file_names: files.map(file => file.name),
        persona_source: personaSource ?? files[0]?.saved_as ?? null,
      }),
    })

    if (!response.ok) {
      throw new Error(`Afterglow start import request failed with ${response.status}`)
    }

    return await response.json() as AfterglowImportTask
  }

  async function getImportTask(taskId: string): Promise<AfterglowImportTask> {
    const response = await fetch(new URL(`config/import/${taskId}`, normalizedBaseUrl), {
      method: 'GET',
      headers: withConfigHeaders(configSetupToken),
    })

    if (!response.ok) {
      throw new Error(`Afterglow import task request failed with ${response.status}`)
    }

    return await response.json() as AfterglowImportTask
  }

  async function searchMemory(query: string, options?: { conversationId?: string, topK?: number }): Promise<AfterglowMemorySearchResult> {
    const headers = withAuthHeaders(runtimeApiKey)
    headers.set('Content-Type', 'application/json')

    const response = await fetch(new URL('memory/search', normalizedBaseUrl), {
      method: 'POST',
      headers,
      body: JSON.stringify({
        query,
        conversation_id: options?.conversationId ?? null,
        top_k: options?.topK ?? 12,
      }),
    })

    if (!response.ok) {
      throw new Error(`Afterglow memory search request failed with ${response.status}`)
    }

    return await response.json() as AfterglowMemorySearchResult
  }

  async function getDebugStats(): Promise<AfterglowDebugStats> {
    const response = await fetch(new URL('debug/stats', normalizedBaseUrl), {
      method: 'GET',
      headers: withAuthHeaders(runtimeApiKey),
    })

    if (!response.ok) {
      throw new Error(`Afterglow debug stats request failed with ${response.status}`)
    }

    return await response.json() as AfterglowDebugStats
  }

  return {
    getInfo,
    getMemoryStats,
    getConfigStatus,
    getConfigValues,
    putConfigValues,
    inspectImportFile,
    uploadImportFiles,
    startImport,
    getImportTask,
    searchMemory,
    getDebugStats,
  }
}
