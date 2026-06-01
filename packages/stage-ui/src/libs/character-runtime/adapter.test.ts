import { describe, expect, it } from 'vitest'

import { adaptCharacterRuntime } from './adapter'

describe('adaptCharacterRuntime', () => {
  /**
   * @example
   * adaptCharacterRuntime({
   *   turnId: 'turn-1',
   *   replyText: 'hi',
   *   policy: { mode: 'reply-later', delaySeconds: 3 },
   * })
   */
  it('maps delayed replies into blocking and non-blocking AIRI-native signals', () => {
    const signals = adaptCharacterRuntime({
      turnId: 'turn-1',
      replyText: 'I was making tea.',
      policy: {
        mode: 'reply-later',
        delaySeconds: 3,
      },
      lifeState: {
        cue: 'busy',
        cueText: 'She seems occupied for a moment.',
        residue: 'activity',
        residueText: 'The desk lamp is still on.',
        sceneMood: 'focused',
      },
    })

    expect(signals.map(signal => signal.type)).toEqual([
      'presence-cue',
      'presence-residue',
      'scene-mood',
      'delay',
      'conversation-delivery',
    ])
    expect(signals.find(signal => signal.type === 'delay')).toMatchObject({
      type: 'delay',
      seconds: 3,
    })
  })

  /**
   * @example
   * adaptCharacterRuntime({
   *   turnId: 'turn-2',
   *   replyText: '',
   *   policy: { mode: 'silence' },
   * })
   */
  it('maps silent turns into an intentional non-reply state', () => {
    const signals = adaptCharacterRuntime({
      turnId: 'turn-2',
      replyText: '',
      policy: {
        mode: 'silence',
        silenceReason: 'resting',
      },
    })

    expect(signals.map(signal => signal.type)).toEqual([
      'silent-turn',
      'conversation-delivery',
    ])
    expect(signals.find(signal => signal.type === 'silent-turn')).toMatchObject({
      type: 'silent-turn',
      reason: 'resting',
    })
  })
})
