import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'

import { useCharacterRuntimeStore } from './characterRuntime'

describe('useCharacterRuntimeStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  /**
   * @example
   * const store = useCharacterRuntimeStore()
   * store.beginTurn('turn-1')
   * store.applySignals([...])
   */
  it('separates blocking and non-blocking runtime signals', () => {
    const store = useCharacterRuntimeStore()

    store.beginTurn('turn-1')
    store.applySignals([
      {
        type: 'presence-cue',
        turnId: 'turn-1',
        cue: 'busy',
        intensity: 'ambient',
        text: 'She is around.',
      },
      {
        type: 'delay',
        turnId: 'turn-1',
        seconds: 2,
        reason: 'pacing',
        text: 'She is thinking.',
      },
      {
        type: 'conversation-delivery',
        turnId: 'turn-1',
        state: 'staged',
        text: 'One moment.',
      },
    ])

    expect(store.blockingSignals.map(signal => signal.type)).toEqual([
      'delay',
      'conversation-delivery',
    ])
    expect(store.nonBlockingSignals.map(signal => signal.type)).toEqual([
      'presence-cue',
    ])
    expect(store.renderModel.delay).toMatchObject({ seconds: 2 })
  })
})
