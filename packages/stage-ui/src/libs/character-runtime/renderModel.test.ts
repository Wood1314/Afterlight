import { describe, expect, it } from 'vitest'

import { buildCharacterRenderModel } from './renderModel'

describe('buildCharacterRenderModel', () => {
  /**
   * @example
   * buildCharacterRenderModel([
   *   { type: 'presence-cue', turnId: 't1', cue: 'alive', intensity: 'ambient', text: 'here' },
   * ])
   */
  it('builds one high-level scene contract from AIRI-native signals', () => {
    const model = buildCharacterRenderModel([
      {
        type: 'presence-cue',
        turnId: 't1',
        cue: 'returning',
        intensity: 'noticeable',
        text: 'She notices you are back.',
      },
      {
        type: 'presence-residue',
        turnId: 't1',
        residue: 'relationship',
        status: 'fresh',
        text: 'She still remembers where you left off.',
      },
      {
        type: 'conversation-delivery',
        turnId: 't1',
        state: 'staged',
        text: 'Welcome back.',
      },
      {
        type: 'scene-mood',
        turnId: 't1',
        mood: 'warm',
        intensity: 'clear',
      },
    ])

    expect(model.presenceCue).toMatchObject({ cue: 'returning' })
    expect(model.residue).toMatchObject({ residue: 'relationship' })
    expect(model.conversation).toMatchObject({ state: 'staged', text: 'Welcome back.' })
    expect(model.sceneMood).toMatchObject({ mood: 'warm' })
    expect(model.delay).toBeNull()
    expect(model.silentTurn).toBeNull()
  })
})
