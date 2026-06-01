import { describe, expect, it } from 'vitest'

import { buildAfterglowContinuityPayload } from './index'

describe('buildAfterglowContinuityPayload', () => {
  /**
   * @example
   * buildAfterglowContinuityPayload({ turnId: 't1', userText: '我回来了' })
   */
  it('returns a return-moment continuity payload with noticeable but quiet recognition', () => {
    const payload = buildAfterglowContinuityPayload({
      turnId: 't1',
      userText: '我回来了',
    })

    expect(payload.policy?.mode).toBe('short-warm')
    expect(payload.lifeState?.cue).toBe('returning')
    expect(payload.lifeState?.cueIntensity).toBe('noticeable')
  })

  /**
   * @example
   * buildAfterglowContinuityPayload({ turnId: 't2', userText: '晚安' })
   */
  it('returns a resting silence payload for end-of-day moments', () => {
    const payload = buildAfterglowContinuityPayload({
      turnId: 't2',
      userText: '晚安',
    })

    expect(payload.policy?.mode).toBe('silence')
    expect(payload.policy?.silenceReason).toBe('resting')
    expect(payload.lifeState?.sceneMood).toBe('sleepy')
  })
})
