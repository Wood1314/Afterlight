import { useLocalStorageManualReset } from '@proj-airi/stage-shared/composables'
import { computed } from 'vue'

const DEFAULT_BOOTSTRAP_RECENT_MESSAGES = 6

/**
 * Canonical local settings for the phase-1 Afterglow continuity layer.
 *
 * Use when:
 * - AIRI needs user-configurable continuity behavior under memory/data settings
 * - Import/bootstrap and runtime continuity should follow one persisted policy
 *
 * Expects:
 * - Settings are local-only and do not contain committed secrets
 *
 * Returns:
 * - Stable persisted controls for continuity bootstrap and runtime behavior
 */
export function useAfterglowContinuityStore() {
  const enabled = useLocalStorageManualReset<boolean>('settings/afterglow/enabled', true)
  const bootstrapOnChatImport = useLocalStorageManualReset<boolean>('settings/afterglow/bootstrap-on-chat-import', true)
  const bootstrapRecentMessages = useLocalStorageManualReset<number>('settings/afterglow/bootstrap-recent-messages', DEFAULT_BOOTSTRAP_RECENT_MESSAGES)
  const allowDelay = useLocalStorageManualReset<boolean>('settings/afterglow/allow-delay', true)
  const allowSilence = useLocalStorageManualReset<boolean>('settings/afterglow/allow-silence', true)
  const includeAssistantMessages = useLocalStorageManualReset<boolean>('settings/afterglow/include-assistant-messages', true)

  const normalizedBootstrapRecentMessages = computed(() => {
    const rounded = Math.round(bootstrapRecentMessages.value)
    return Math.min(12, Math.max(2, rounded))
  })

  function resetState() {
    enabled.reset()
    bootstrapOnChatImport.reset()
    bootstrapRecentMessages.reset()
    allowDelay.reset()
    allowSilence.reset()
    includeAssistantMessages.reset()
  }

  return {
    enabled,
    bootstrapOnChatImport,
    bootstrapRecentMessages,
    normalizedBootstrapRecentMessages,
    allowDelay,
    allowSilence,
    includeAssistantMessages,
    resetState,
  }
}
