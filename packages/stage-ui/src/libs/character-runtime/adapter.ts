import type { CharacterRuntimeAdapterInput, CharacterSignal, ConversationDeliverySignal } from './types'

/**
 * Translates provider-local continuity payloads into AIRI-native runtime signals.
 *
 * Use when:
 * - A provider returns reply policy or life-state metadata
 * - AIRI needs a closed signal contract for stores and UI
 *
 * Expects:
 * - Provider-local payloads have already been validated at the provider boundary
 *
 * Returns:
 * - A normalized `CharacterSignal[]` list with no provider-specific fields
 */
export function adaptCharacterRuntime(input: CharacterRuntimeAdapterInput): CharacterSignal[] {
  const signals: CharacterSignal[] = []

  if (input.lifeState?.cue && input.lifeState.cueText) {
    signals.push({
      type: 'presence-cue',
      turnId: input.turnId,
      cue: input.lifeState.cue,
      intensity: input.lifeState.cueIntensity ?? 'ambient',
      text: input.lifeState.cueText,
    })
  }

  if (input.lifeState?.residue && input.lifeState.residueText) {
    signals.push({
      type: 'presence-residue',
      turnId: input.turnId,
      residue: input.lifeState.residue,
      status: input.lifeState.residueStatus ?? 'fresh',
      text: input.lifeState.residueText,
    })
  }

  if (input.lifeState?.sceneMood) {
    signals.push({
      type: 'scene-mood',
      turnId: input.turnId,
      mood: input.lifeState.sceneMood,
      intensity: input.lifeState.sceneMoodIntensity ?? 'soft',
    })
  }

  const mode = input.policy?.mode ?? 'reply-now'
  if (mode === 'reply-later' && input.policy?.delaySeconds && input.policy.delaySeconds > 0) {
    signals.push({
      type: 'delay',
      turnId: input.turnId,
      seconds: input.policy.delaySeconds,
      reason: 'pacing',
      text: 'She is taking a moment before replying.',
    })
  }

  if (mode === 'silence') {
    signals.push({
      type: 'silent-turn',
      turnId: input.turnId,
      reason: input.policy.silenceReason ?? 'boundary',
      text: 'She notices the moment, but chooses not to answer right now.',
    })
  }

  signals.push(createConversationSignal(input))
  return signals
}

function createConversationSignal(input: CharacterRuntimeAdapterInput): ConversationDeliverySignal {
  if (input.policy?.mode === 'silence') {
    return {
      type: 'conversation-delivery',
      turnId: input.turnId,
      state: 'idle',
      text: null,
    }
  }

  return {
    type: 'conversation-delivery',
    turnId: input.turnId,
    state: input.replyText.length > 0 ? 'staged' : 'idle',
    text: input.replyText,
  }
}
