import type { CharacterRenderModel, CharacterRuntimeSnapshot, CharacterSignal, CharacterTimelineEntry } from '../../libs/character-runtime/types'

import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import { buildCharacterRenderModel } from '../../libs/character-runtime/renderModel'

/**
 * Canonical AIRI character runtime store for phase 1 presence state.
 *
 * Use when:
 * - Recording AIRI-native character runtime signals
 * - Building a stable stage-facing render model
 *
 * Expects:
 * - Callers push already-normalized `CharacterSignal[]`
 *
 * Returns:
 * - Canonical timeline, current signals, and derived render model
 */
export const useCharacterRuntimeStore = defineStore('modules:character-runtime', () => {
  const currentTurnId = ref<string | null>(null)
  const signals = ref<CharacterSignal[]>([])
  const timeline = ref<CharacterTimelineEntry[]>([])

  const renderModel = computed<CharacterRenderModel>(() => buildCharacterRenderModel(signals.value))
  const blockingSignals = computed(() =>
    signals.value.filter(signal => signal.type === 'delay' || signal.type === 'silent-turn' || signal.type === 'conversation-delivery'),
  )
  const nonBlockingSignals = computed(() =>
    signals.value.filter(signal => signal.type === 'presence-cue' || signal.type === 'presence-residue' || signal.type === 'scene-mood'),
  )

  function beginTurn(turnId: string) {
    currentTurnId.value = turnId
    signals.value = []
  }

  function applySignals(nextSignals: CharacterSignal[]) {
    signals.value.push(...nextSignals)
    timeline.value.push(...nextSignals.map(signal => ({
      kind: 'signal' as const,
      turnId: signal.turnId,
      at: Date.now(),
      signal,
    })))
  }

  function recordReplyText(turnId: string, text: string) {
    if (!text)
      return

    timeline.value.push({
      kind: 'reply-text',
      turnId,
      at: Date.now(),
      text,
    })
  }

  function clearActiveTurn() {
    currentTurnId.value = null
  }

  function resetState() {
    currentTurnId.value = null
    signals.value = []
    timeline.value = []
  }

  function replaceSignals(nextSignals: CharacterSignal[], options?: { turnId?: string | null }) {
    currentTurnId.value = options?.turnId ?? null
    signals.value = [...nextSignals]
    timeline.value = nextSignals.map(signal => ({
      kind: 'signal' as const,
      turnId: signal.turnId,
      at: Date.now(),
      signal,
    }))
  }

  const snapshot = computed<CharacterRuntimeSnapshot>(() => ({
    currentTurnId: currentTurnId.value,
    signals: signals.value,
    timeline: timeline.value,
  }))

  return {
    currentTurnId,
    signals,
    timeline,
    snapshot,
    renderModel,
    blockingSignals,
    nonBlockingSignals,
    beginTurn,
    applySignals,
    replaceSignals,
    recordReplyText,
    clearActiveTurn,
    resetState,
  }
})
