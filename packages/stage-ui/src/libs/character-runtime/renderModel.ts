import type { CharacterRenderModel, CharacterSignal } from './types'

/**
 * Builds the stage-facing render model from AIRI-native runtime signals.
 *
 * Use when:
 * - `Stage.vue` needs one stable high-level contract
 * - Stage-facing code should stay independent from provider details
 *
 * Expects:
 * - Signals are already normalized and belong to the current runtime snapshot
 *
 * Returns:
 * - One render model with presence cue, residue, conversation, delay, silence, and mood
 */
export function buildCharacterRenderModel(signals: CharacterSignal[]): CharacterRenderModel {
  const presenceCueSignal = findLastSignal(signals, 'presence-cue')
  const residueSignal = findLastSignal(signals, 'presence-residue')
  const conversationSignal = findLastSignal(signals, 'conversation-delivery')
  const delaySignal = findLastSignal(signals, 'delay')
  const silentSignal = findLastSignal(signals, 'silent-turn')
  const sceneMoodSignal = findLastSignal(signals, 'scene-mood')

  return {
    presenceCue: presenceCueSignal
      ? {
          cue: presenceCueSignal.cue,
          intensity: presenceCueSignal.intensity,
          text: presenceCueSignal.text,
        }
      : null,
    residue: residueSignal
      ? {
          residue: residueSignal.residue,
          status: residueSignal.status,
          text: residueSignal.text,
        }
      : null,
    conversation: {
      state: conversationSignal?.state ?? 'idle',
      text: conversationSignal?.text ?? null,
    },
    delay: delaySignal
      ? {
          seconds: delaySignal.seconds,
          reason: delaySignal.reason,
          text: delaySignal.text,
        }
      : null,
    silentTurn: silentSignal
      ? {
          reason: silentSignal.reason,
          text: silentSignal.text,
        }
      : null,
    sceneMood: sceneMoodSignal
      ? {
          mood: sceneMoodSignal.mood,
          intensity: sceneMoodSignal.intensity,
        }
      : null,
  }
}

function findLastSignal<TType extends CharacterSignal['type']>(
  signals: CharacterSignal[],
  type: TType,
): Extract<CharacterSignal, { type: TType }> | undefined {
  for (let index = signals.length - 1; index >= 0; index -= 1) {
    const signal = signals[index]
    if (signal.type === type)
      return signal as Extract<CharacterSignal, { type: TType }>
  }

  return undefined
}
