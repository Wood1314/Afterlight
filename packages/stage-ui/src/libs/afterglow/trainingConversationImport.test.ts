import { describe, expect, it } from 'vitest'

import {
  convertTrainingConversationsToAfterglowQqExport,
  convertTrainingConversationsToChatSessionsExport,
} from './trainingConversationImport'

describe('convertTrainingConversationsToChatSessionsExport', () => {
  /**
   * @example
   * convertTrainingConversationsToChatSessionsExport([
   *   { conversations: [{ role: 'user', content: 'hi' }, { role: 'assistant', content: 'hello' }] },
   * ])
   */
  it('converts training conversations into chat sessions export', () => {
    const result = convertTrainingConversationsToChatSessionsExport([
      {
        conversations: [
          { role: 'system', content: 'system prompt' },
          { role: 'user', content: 'hi' },
          { role: 'assistant', content: 'hello' },
        ],
      },
      {
        conversations: [
          { role: 'user', content: 'how are you' },
          { role: 'assistant', content: 'good' },
        ],
      },
    ])

    expect(result).not.toBeNull()
    expect(result?.importedConversationCount).toBe(2)
    expect(result?.importedMessageCount).toBe(4)
    expect(result?.sessionsExport.format).toBe('chat-sessions-index:v1')

    const sessionIds = Object.keys(result?.sessionsExport.sessions ?? {})
    expect(sessionIds.length).toBe(2)

    const firstSession = result?.sessionsExport.sessions[sessionIds[0]]
    expect(firstSession?.messages[0]?.role).toBe('system')
    expect(firstSession?.messages[1]?.role).toBe('user')
    expect(firstSession?.messages[2]?.role).toBe('assistant')
  })

  /**
   * @example
   * convertTrainingConversationsToChatSessionsExport({ format: 'chat-sessions-index:v1' })
   */
  it('returns null for unsupported payloads', () => {
    const result = convertTrainingConversationsToChatSessionsExport({
      format: 'chat-sessions-index:v1',
    })

    expect(result).toBeNull()
  })

  /**
   * @example
   * convertTrainingConversationsToAfterglowQqExport([
   *   { conversations: [{ role: 'user', content: 'hi' }, { role: 'assistant', content: 'hello' }] },
   * ])
   */
  it('converts training conversations into an Afterglow QQ-compatible payload', () => {
    const result = convertTrainingConversationsToAfterglowQqExport([
      {
        conversations: [
          { role: 'system', content: 'ignore me' },
          { role: 'user', content: 'hi' },
          { role: 'assistant', content: 'hello' },
        ],
      },
    ], {
      selfName: '我',
      selfUid: 'u_self',
      friendName: '小胖',
      friendUid: 'u_friend',
    })

    expect(result).not.toBeNull()
    expect(result?.importedConversationCount).toBe(1)
    expect(result?.importedMessageCount).toBe(2)
    expect(result?.payload.chatInfo.selfUid).toBe('u_self')
    expect(result?.payload.chatInfo.name).toBe('小胖')
    expect(result?.payload.messages.length).toBe(2)
    expect(result?.payload.messages[0]?.sender.uid).toBe('u_self')
    expect(result?.payload.messages[1]?.sender.uid).toBe('u_friend')
    expect(result?.payload.messages[0]?.content.text).toBe('hi')
    expect(result?.payload.messages[1]?.content.text).toBe('hello')
  })
})
