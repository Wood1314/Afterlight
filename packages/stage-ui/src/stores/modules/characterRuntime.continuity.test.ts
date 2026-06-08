import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'

import { useCharacterRuntimeStore } from './characterRuntime'

describe('character runtime continuity regression suite', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  /**
   * @example
   * store.beginTurn('return-turn')
   * store.applySignals([
   *   { type: 'presence-cue', ... },
   *   { type: 'presence-residue', ... },
   * ])
   */
  it('preserves the last continuity cues across a leave-and-return style turn boundary', () => {
    const store = useCharacterRuntimeStore()

    store.beginTurn('return-turn')
    store.applySignals([
      {
        type: 'presence-cue',
        turnId: 'return-turn',
        cue: 'returning',
        intensity: 'noticeable',
        text: 'She recognizes your return quietly.',
      },
      {
        type: 'presence-residue',
        turnId: 'return-turn',
        residue: 'relationship',
        status: 'fresh',
        text: 'The last thread between you still feels intact.',
      },
      {
        type: 'conversation-delivery',
        turnId: 'return-turn',
        state: 'staged',
        text: 'You are back.',
      },
    ])

    expect(store.renderModel.presenceCue).toMatchObject({
      cue: 'returning',
      intensity: 'noticeable',
    })
    expect(store.renderModel.residue).toMatchObject({
      residue: 'relationship',
      status: 'fresh',
    })
    expect(store.timeline).toHaveLength(3)
  })

  /**
   * @example
   * store.beginTurn('silence-turn')
   * store.applySignals([{ type: 'silent-turn', ... }])
   */
  it('keeps silent turns intentional instead of collapsing them into missing conversation state', () => {
    const store = useCharacterRuntimeStore()

    store.beginTurn('silence-turn')
    store.applySignals([
      {
        type: 'silent-turn',
        turnId: 'silence-turn',
        reason: 'boundary',
        text: 'She notices the moment, but does not answer.',
      },
      {
        type: 'conversation-delivery',
        turnId: 'silence-turn',
        state: 'idle',
      },
    ])

    expect(store.renderModel.silentTurn).toMatchObject({
      reason: 'boundary',
    })
    expect(store.renderModel.conversation).toMatchObject({
      state: 'idle',
      text: null,
    })
  })
})
