import type { ChatHistoryItem } from '../../types/chat'
import type { ChatSessionMeta, ChatSessionsExport } from '../../types/chat-session'

import { nanoid } from 'nanoid'

interface TrainingConversationTurn {
  role?: string
  content?: unknown
}

interface TrainingConversationItem {
  conversations?: TrainingConversationTurn[]
}

type ImportableRole = 'system' | 'user' | 'assistant'

export interface TrainingConversationImportResult {
  sessionsExport: ChatSessionsExport
  importedConversationCount: number
  importedMessageCount: number
}

interface AfterglowQqExportMessage {
  id: string
  seq: number
  timestamp: number
  time: string
  sender: {
    uid: string
    name: string
    remark: string
  }
  type: 'type_1'
  content: {
    text: string
    elements: []
    resources: []
  }
  recalled: false
  system: false
}

export interface TrainingConversationAfterglowExportResult {
  payload: {
    metadata: {
      name: string
      version: string
    }
    chatInfo: {
      type: 'private'
      selfUid: string
      selfName: string
      name: string
    }
    messages: AfterglowQqExportMessage[]
  }
  importedConversationCount: number
  importedMessageCount: number
}

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object'
}

function isTrainingConversationItem(value: unknown): value is TrainingConversationItem {
  if (!isObject(value))
    return false

  return Array.isArray(value.conversations)
}

function normalizeMessageRole(role: string): ImportableRole | null {
  if (role === 'user' || role === 'assistant' || role === 'system')
    return role

  return null
}

function toChatHistoryItem(
  turn: TrainingConversationTurn,
  createdAt: number,
  offset: number,
): ChatHistoryItem | null {
  const role = normalizeMessageRole(String(turn.role || '').trim())
  if (!role)
    return null

  const content = typeof turn.content === 'string'
    ? turn.content.trim()
    : ''

  if (!content)
    return null

  if (role === 'assistant') {
    return {
      id: nanoid(),
      role,
      content,
      createdAt: createdAt + offset,
      slices: [],
      tool_results: [],
    }
  }

  return {
    id: nanoid(),
    role,
    content,
    createdAt: createdAt + offset,
  }
}

/**
 * Converts a training-dataset-style conversations JSON into AIRI chat
 * sessions so Memory imports can bootstrap local/runtime flows.
 *
 * Before:
 * - [{ "conversations": [{ "role": "user", "content": "hi" }, ...] }]
 *
 * After:
 * - { format: 'chat-sessions-index:v1', sessions: { ... } }
 */
export function convertTrainingConversationsToChatSessionsExport(
  payload: unknown,
  options?: {
    userId?: string
    characterId?: string
    sessionTitlePrefix?: string
  },
): TrainingConversationImportResult | null {
  if (!Array.isArray(payload) || !payload.every(isTrainingConversationItem)) {
    return null
  }

  const importedSessions: ChatSessionsExport['sessions'] = {}
  const characterId = options?.characterId || 'default'
  const userId = options?.userId || 'local'
  const titlePrefix = options?.sessionTitlePrefix || 'Imported training conversation'
  let importedMessageCount = 0
  let latestSessionId = ''

  payload.forEach((item, conversationIndex) => {
    const createdAt = Date.now() + conversationIndex * 1000
    const messages = item.conversations
      ?.map((turn, turnIndex) => toChatHistoryItem(turn, createdAt, turnIndex))
      .filter((message): message is ChatHistoryItem => !!message) ?? []

    const meaningfulMessages = messages.filter(message => message.role === 'user' || message.role === 'assistant')
    if (!meaningfulMessages.length)
      return

    const sessionId = `training-import-${nanoid()}`
    latestSessionId = sessionId
    importedMessageCount += meaningfulMessages.length

    const meta: ChatSessionMeta = {
      sessionId,
      userId,
      characterId,
      title: `${titlePrefix} ${conversationIndex + 1}`,
      createdAt,
      updatedAt: createdAt + meaningfulMessages.length,
    }

    importedSessions[sessionId] = {
      meta,
      messages,
    }
  })

  const sessionIds = Object.keys(importedSessions)
  if (!sessionIds.length) {
    return null
  }

  return {
    importedConversationCount: sessionIds.length,
    importedMessageCount,
    sessionsExport: {
      format: 'chat-sessions-index:v1',
      index: {
        userId,
        characters: {
          [characterId]: {
            activeSessionId: latestSessionId,
            sessions: Object.fromEntries(
              sessionIds.map(sessionId => [sessionId, importedSessions[sessionId].meta]),
            ),
          },
        },
      },
      sessions: importedSessions,
    },
  }
}

/**
 * Converts a training-dataset-style conversations JSON into an Afterglow
 * QQChatExporter-compatible payload so AIRI can upload it to a real Afterglow
 * backend instead of falling back to local-only import.
 *
 * Before:
 * - [{ "conversations": [{ "role": "user", "content": "hi" }, ...] }]
 *
 * After:
 * - { metadata, chatInfo, messages[] }
 */
export function convertTrainingConversationsToAfterglowQqExport(
  payload: unknown,
  options?: {
    selfName?: string
    selfUid?: string
    friendName?: string
    friendUid?: string
  },
): TrainingConversationAfterglowExportResult | null {
  if (!Array.isArray(payload) || !payload.every(isTrainingConversationItem)) {
    return null
  }

  const selfName = options?.selfName?.trim() || '我'
  const selfUid = options?.selfUid?.trim() || 'u_self'
  const friendName = options?.friendName?.trim() || '对方'
  const friendUid = options?.friendUid?.trim() || 'u_friend'
  const messages: AfterglowQqExportMessage[] = []
  let importedConversationCount = 0
  let importedMessageCount = 0
  let currentTimestamp = Date.now()

  payload.forEach((item) => {
    const normalizedTurns = item.conversations
      ?.map((turn) => {
        const role = normalizeMessageRole(String(turn.role || '').trim())
        const content = typeof turn.content === 'string'
          ? turn.content.trim()
          : ''

        if (!role || role === 'system' || !content) {
          return null
        }

        return {
          role,
          content,
        }
      })
      .filter((turn): turn is { role: 'user' | 'assistant', content: string } => !!turn) ?? []

    if (!normalizedTurns.length) {
      return
    }

    importedConversationCount += 1

    normalizedTurns.forEach((turn, turnIndex) => {
      const sender = turn.role === 'user'
        ? { uid: selfUid, name: selfName, remark: selfName }
        : { uid: friendUid, name: friendName, remark: friendName }
      const timestamp = currentTimestamp + turnIndex * 1000

      messages.push({
        id: `training-${nanoid()}`,
        seq: messages.length + 1,
        timestamp,
        time: new Date(timestamp).toISOString(),
        sender,
        type: 'type_1',
        content: {
          text: turn.content,
          elements: [],
          resources: [],
        },
        recalled: false,
        system: false,
      })
      importedMessageCount += 1
    })

    currentTimestamp += Math.max(normalizedTurns.length, 1) * 1000 + 60_000
  })

  if (!messages.length) {
    return null
  }

  return {
    importedConversationCount,
    importedMessageCount,
    payload: {
      metadata: {
        name: 'AIRI training conversation bridge',
        version: '1.0.0',
      },
      chatInfo: {
        type: 'private',
        selfUid,
        selfName,
        name: friendName,
      },
      messages,
    },
  }
}
