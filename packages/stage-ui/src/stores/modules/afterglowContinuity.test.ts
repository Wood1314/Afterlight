import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'

import { useAfterglowContinuityStore } from './afterglowContinuity'

describe('useAfterglowContinuityStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('persists phase-1 continuity defaults for memory settings', () => {
    const store = useAfterglowContinuityStore()

    expect(store.enabled.value).toBe(true)
    expect(store.bootstrapOnChatImport.value).toBe(true)
    expect(store.bootstrapRecentMessages.value).toBe(6)
    expect(store.normalizedBootstrapRecentMessages.value).toBe(6)
    expect(store.allowDelay.value).toBe(true)
    expect(store.allowSilence.value).toBe(true)
    expect(store.includeAssistantMessages.value).toBe(true)
  })

  it('normalizes bootstrap window into the supported bounds', () => {
    const store = useAfterglowContinuityStore()

    store.bootstrapRecentMessages.value = 1
    expect(store.normalizedBootstrapRecentMessages.value).toBe(2)

    store.bootstrapRecentMessages.value = 99
    expect(store.normalizedBootstrapRecentMessages.value).toBe(12)
  })
})
