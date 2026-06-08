import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useConsciousnessStore } from './consciousness'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (_key: string, fallback?: string) => fallback ?? '',
  }),
}))

describe('useConsciousnessStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  /**
   * @example
   * const store = useConsciousnessStore()
   * store.activeProvider = ''
   * expect(store.providerModels).toEqual([])
   */
  it('does not resolve provider metadata when no active provider is selected', () => {
    const store = useConsciousnessStore()

    store.activeProvider = ''
    store.activeModel = ''

    expect(store.supportsModelListing).toBe(false)
    expect(store.providerModels).toEqual([])
    expect(store.isLoadingActiveProviderModels).toBe(false)
    expect(store.activeProviderModelError).toBeNull()
    expect(store.configured).toBe(false)
  })
})
