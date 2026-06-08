import { createServer } from 'node:http'
import { writeFileSync } from 'node:fs'

const port = Number(process.env.MOCK_AFTERGLOW_PORT || 8000)
const state = {
  config: {},
  importedFiles: [],
  importTasks: new Map(),
  memories: [],
  logs: [],
}

function sendJson(res, status, payload) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'Content-Type, Authorization, x-api-key',
    'access-control-allow-methods': 'GET, POST, PUT, OPTIONS',
  })
  res.end(JSON.stringify(payload, null, 2))
}

function sendSse(res, events) {
  res.writeHead(200, {
    'content-type': 'text/event-stream; charset=utf-8',
    'cache-control': 'no-cache',
    connection: 'keep-alive',
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'Content-Type, Authorization, x-api-key',
    'access-control-allow-methods': 'GET, POST, PUT, OPTIONS',
  })

  for (const event of events) {
    res.write(`data: ${JSON.stringify(event)}\n\n`)
  }

  res.write('data: [DONE]\n\n')
  res.end()
}

function collectBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', chunk => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

function recordLog(entry) {
  state.logs.push({
    timestamp: new Date().toISOString(),
    ...entry,
  })
  writeFileSync('/tmp/mock-afterglow-log.json', JSON.stringify(state.logs, null, 2))
}

function extractMultipartFileText(contentType, bodyBuffer) {
  const boundaryMatch = contentType?.match(/boundary=(.+)$/)
  if (!boundaryMatch) {
    return bodyBuffer.toString('utf8')
  }

  const boundary = `--${boundaryMatch[1]}`
  const text = bodyBuffer.toString('utf8')
  const parts = text.split(boundary)

  for (const part of parts) {
    if (!part.includes('filename=')) {
      continue
    }

    const headerEnd = part.indexOf('\r\n\r\n')
    if (headerEnd === -1) {
      continue
    }

    return part.slice(headerEnd + 4).replace(/\r\n--?$/, '').trim()
  }

  return text
}

function extractTrainingMemories(text) {
  try {
    const payload = JSON.parse(text)
    if (!Array.isArray(payload))
      return []

    return payload.flatMap(item => {
      if (!Array.isArray(item?.conversations))
        return []

      const turns = item.conversations
        .filter(turn => typeof turn?.content === 'string' && (turn.role === 'user' || turn.role === 'assistant'))
        .map(turn => ({ role: turn.role, content: turn.content }))

      if (!turns.length)
        return []

      return [{
        source: 'training-conversations',
        text: turns.map(turn => `${turn.role}: ${turn.content}`).join('\n'),
        turns,
      }]
    })
  }
  catch {
    return []
  }
}

function normalizeReplyText(text) {
  const normalized = String(text || '')
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .join('\n')

  if (!normalized) {
    return ''
  }

  const firstLine = normalized.split('\n')[0]?.trim() || ''
  return firstLine || normalized
}

function normalizeUserQuery(text) {
  return String(text || '')
    .replace(/^\[[^\]]+\]\s*/u, '')
    .trim()
}

function findNaturalReplyFromMemory(memory, userText) {
  const normalizedUserText = normalizeUserQuery(userText)
  const lowered = normalizedUserText.toLowerCase()
  const turns = memory.turns || []

  for (let index = 0; index < turns.length; index += 1) {
    const turn = turns[index]
    if (turn.role !== 'user') {
      continue
    }

    const content = String(turn.content || '')
    const matched =
      content.includes(normalizedUserText)
      || lowered.split(/\s+/).some(token => token && content.toLowerCase().includes(token))

    if (!matched) {
      continue
    }

    const assistantReply = turns.slice(index + 1).find(candidate => candidate.role === 'assistant')
    const normalizedReply = normalizeReplyText(assistantReply?.content)
    if (normalizedReply) {
      return normalizedReply
    }
  }

  for (let index = 0; index < turns.length; index += 1) {
    const turn = turns[index]
    const content = String(turn.content || '')
    const matched =
      content.includes(normalizedUserText)
      || lowered.split(/\s+/).some(token => token && content.toLowerCase().includes(token))

    if (!matched) {
      continue
    }

    if (turn.role === 'assistant') {
      return normalizeReplyText(turn.content)
    }

    const assistantReply = turns.slice(index + 1).find(candidate => candidate.role === 'assistant')
    const normalizedReply = normalizeReplyText(assistantReply?.content)
    if (normalizedReply) {
      return normalizedReply
    }
  }

  const firstAssistantTurn = turns.find(turn => turn.role === 'assistant')
  return normalizeReplyText(firstAssistantTurn?.content)
}

function buildAssistantReply(userText) {
  const normalizedUserText = normalizeUserQuery(userText)
  const lowered = normalizedUserText.toLowerCase()
  const matchedMemory = state.memories.find(memory =>
    memory.text.includes(normalizedUserText)
    || lowered.split(/\s+/).some(token => token && memory.text.toLowerCase().includes(token)),
  )

  if (matchedMemory) {
    const naturalReply = findNaturalReplyFromMemory(matchedMemory, normalizedUserText)
    return {
      reply: naturalReply || '嗯嗯',
      matchedMemory,
    }
  }

  return {
    reply: '嗯嗯',
    matchedMemory: null,
  }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host}`)

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'access-control-allow-origin': '*',
      'access-control-allow-headers': 'Content-Type, Authorization, x-api-key',
      'access-control-allow-methods': 'GET, POST, PUT, OPTIONS',
    })
    res.end()
    return
  }

  if (req.method === 'GET' && url.pathname === '/v1/info') {
    return sendJson(res, 200, {
      app_name: 'mock-afterglow',
      app_slogan: 'Mock memory backend for AIRI',
      friend_name: state.config.FRIEND_NAME || 'Friend',
      self_name: state.config.SELF_NAME || 'Self',
      relationship_type: state.config.RELATIONSHIP_TYPE || 'friend',
      relationship_description: state.config.RELATIONSHIP_DESCRIPTION || '',
      persona_template: 'mock',
      embedding_model: 'mock-embedding',
      chat_model: 'afterglow-companion',
      version: '0.0.1',
      has_persona_card: state.memories.length > 0,
    })
  }

  if (req.method === 'GET' && url.pathname === '/memory/stats') {
    return sendJson(res, 200, {
      friend_messages: state.memories.length,
      dialogue_windows: state.memories.length,
      response_pairs: state.memories.length,
      live_messages: 0,
      relationship_memories: state.memories.length ? 1 : 0,
      writeback_enabled: true,
      writeback_paused: false,
    })
  }

  if (req.method === 'GET' && url.pathname === '/config/values') {
    return sendJson(res, 200, {
      values: Object.fromEntries(
        Object.entries(state.config).map(([key, value]) => [key, { set: true, value: String(value), preview: String(value) }]),
      ),
    })
  }

  if (req.method === 'PUT' && url.pathname === '/config/values') {
    const body = JSON.parse((await collectBody(req)).toString('utf8'))
    Object.assign(state.config, body.values || {})
    recordLog({ type: 'config-update', values: body.values || {} })
    return sendJson(res, 200, { ok: true, restart_required: false, errors: [] })
  }

  if (req.method === 'POST' && url.pathname === '/config/import/inspect') {
    const bodyBuffer = await collectBody(req)
    const text = extractMultipartFileText(req.headers['content-type'], bodyBuffer)
    const memories = extractTrainingMemories(text)
    recordLog({ type: 'import-inspect', detectedMemories: memories.length })
    return sendJson(res, 200, {
      format: memories.length ? 'unknown' : 'unknown',
      total_messages: memories.reduce((count, memory) => count + memory.turns.length, 0),
      candidates: [],
      error: '',
    })
  }

  if (req.method === 'POST' && url.pathname === '/config/import/upload') {
    const bodyBuffer = await collectBody(req)
    const text = extractMultipartFileText(req.headers['content-type'], bodyBuffer)
    const savedAs = `mock-upload-${Date.now()}.json`
    state.importedFiles.push({ saved_as: savedAs, raw: text })
    const memories = extractTrainingMemories(text)
    recordLog({ type: 'import-upload', savedAs, detectedMemories: memories.length })
    return sendJson(res, 200, {
      uploaded: [{
        name: 'uploaded.json',
        saved_as: savedAs,
        size: Buffer.byteLength(text),
        format: 'unknown',
        total_messages: memories.reduce((count, memory) => count + memory.turns.length, 0),
        candidates: [],
        error: '',
      }],
    })
  }

  if (req.method === 'POST' && url.pathname === '/config/import/start') {
    const body = JSON.parse((await collectBody(req)).toString('utf8'))
    const taskId = `mock-task-${Date.now()}`
    const file = state.importedFiles.find(item => item.saved_as === body.files?.[0])
    const memories = file ? extractTrainingMemories(file.raw) : []
    state.memories = memories
    state.importTasks.set(taskId, {
      task_id: taskId,
      status: 'done',
      phase: 'completed',
      step: 'indexed',
      message: `Imported ${memories.length} memories`,
      progress: 100,
    })
    recordLog({ type: 'import-start', taskId, importedMemories: memories.length })
    return sendJson(res, 200, state.importTasks.get(taskId))
  }

  if (req.method === 'GET' && url.pathname.startsWith('/config/import/')) {
    const taskId = url.pathname.split('/').at(-1)
    return sendJson(res, 200, state.importTasks.get(taskId) || {
      task_id: taskId,
      status: 'failed',
      error: 'Unknown task',
    })
  }

  if (req.method === 'POST' && url.pathname === '/chat/completions') {
    const body = JSON.parse((await collectBody(req)).toString('utf8'))
    const messages = body.messages || []
    const lastUserMessage = [...messages].reverse().find(message => message.role === 'user')
    const userText = Array.isArray(lastUserMessage?.content)
      ? lastUserMessage.content.map(part => part.text || '').join('\n')
      : String(lastUserMessage?.content || '')
    const result = buildAssistantReply(userText)

    recordLog({
      type: 'chat-completions',
      request: body,
      userText,
      matchedMemory: result.matchedMemory,
      reply: result.reply,
    })

    const completionPayload = {
      id: `mock-chat-${Date.now()}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: body.model || 'afterglow-companion',
      choices: [
        {
          index: 0,
          finish_reason: 'stop',
          message: {
            role: 'assistant',
            content: result.reply,
          },
        },
      ],
      usage: {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0,
      },
    }

    if (body.stream) {
      const chunkPayloads = [
        {
          id: completionPayload.id,
          object: 'chat.completion.chunk',
          created: completionPayload.created,
          model: completionPayload.model,
          choices: [
            {
              index: 0,
              delta: {
                role: 'assistant',
                content: '',
              },
              finish_reason: null,
            },
          ],
        },
        {
          id: completionPayload.id,
          object: 'chat.completion.chunk',
          created: completionPayload.created,
          model: completionPayload.model,
          choices: [
            {
              index: 0,
              delta: {
                content: result.reply,
              },
              finish_reason: null,
            },
          ],
        },
        {
          id: completionPayload.id,
          object: 'chat.completion.chunk',
          created: completionPayload.created,
          model: completionPayload.model,
          choices: [
            {
              index: 0,
              delta: {},
              finish_reason: 'stop',
            },
          ],
          usage: completionPayload.usage,
        },
      ]

      sendSse(res, chunkPayloads)
      return
    }

    return sendJson(res, 200, completionPayload)
  }

  if (req.method === 'GET' && url.pathname === '/models') {
    return sendJson(res, 200, {
      object: 'list',
      data: [
        {
          id: 'afterglow-companion',
          object: 'model',
          created: 0,
          owned_by: 'mock-afterglow',
        },
      ],
    })
  }

  if (req.method === 'GET' && url.pathname === '/mock/logs') {
    return sendJson(res, 200, {
      config: state.config,
      memories: state.memories,
      logs: state.logs,
    })
  }

  sendJson(res, 404, { error: 'Not found' })
})

server.listen(port, '127.0.0.1', () => {
  console.log(`mock-afterglow-backend listening on http://127.0.0.1:${port}`)
})
