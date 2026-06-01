/**
 * High-level runtime contract for AIRI character presence.
 *
 * Use when:
 * - Translating provider-local continuity payloads into AIRI-native signals
 * - Driving stage-facing presence rendering without leaking provider formats
 *
 * Expects:
 * - Each signal belongs to one turn and is already normalized by an adapter
 *
 * Returns:
 * - A closed discriminated-union contract that UI and stores can consume safely
 */

export type CharacterSignal
  = PresenceCueSignal
    | PresenceResidueSignal
    | ConversationDeliverySignal
    | DelaySignal
    | SilentTurnSignal
    | SceneMoodSignal

/**
 * Stable timeline entry kinds recorded by the character runtime.
 */
export type CharacterTimelineEntry
  = {
      kind: 'signal'
      turnId: string
      at: number
      signal: CharacterSignal
    }
  | {
      kind: 'reply-text'
      turnId: string
      at: number
      text: string
    }

/**
 * Stage-facing render model derived from runtime signals.
 */
export interface CharacterRenderModel {
  /**
   * Dominant presence cue for the current visible moment.
   */
  presenceCue: PresenceCueView | null
  /**
   * Lightweight ambient residue that suggests off-screen continuity.
   */
  residue: PresenceResidueView | null
  /**
   * Current conversation delivery state for the active turn.
   */
  conversation: ConversationDeliveryView
  /**
   * Delay state when the role is intentionally not replying yet.
   */
  delay: DelayView | null
  /**
   * Silent-turn state when the role intentionally does not respond.
   */
  silentTurn: SilentTurnView | null
  /**
   * Stage mood that can influence presentation without changing chat content.
   */
  sceneMood: SceneMoodView | null
}

export interface CharacterRuntimeSnapshot {
  currentTurnId: string | null
  signals: CharacterSignal[]
  timeline: CharacterTimelineEntry[]
}

export interface PresenceCueSignal {
  type: 'presence-cue'
  turnId: string
  cue: PresenceCueKind
  intensity: PresenceCueIntensity
  text: string
}

export interface PresenceResidueSignal {
  type: 'presence-residue'
  turnId: string
  residue: PresenceResidueKind
  status: PresenceResidueStatus
  text: string
}

export interface ConversationDeliverySignal {
  type: 'conversation-delivery'
  turnId: string
  state: ConversationDeliveryState
  text?: string
}

export interface DelaySignal {
  type: 'delay'
  turnId: string
  seconds: number
  reason: DelayReason
  text: string
}

export interface SilentTurnSignal {
  type: 'silent-turn'
  turnId: string
  reason: SilentTurnReason
  text: string
}

export interface SceneMoodSignal {
  type: 'scene-mood'
  turnId: string
  mood: SceneMoodKind
  intensity: SceneMoodIntensity
}

export type PresenceCueKind = 'alive' | 'returning' | 'busy' | 'resting'
export type PresenceCueIntensity = 'ambient' | 'noticeable'
export type PresenceResidueKind = 'activity' | 'relationship' | 'routine'
export type PresenceResidueStatus = 'fresh' | 'partial' | 'stale'
export type ConversationDeliveryState = 'idle' | 'staged' | 'complete'
export type DelayReason = 'life-state' | 'pacing' | 'cooldown'
export type SilentTurnReason = 'boundary' | 'resting' | 'off-screen'
export type SceneMoodKind = 'calm' | 'warm' | 'sleepy' | 'focused'
export type SceneMoodIntensity = 'soft' | 'clear'

export interface PresenceCueView {
  cue: PresenceCueKind
  intensity: PresenceCueIntensity
  text: string
}

export interface PresenceResidueView {
  residue: PresenceResidueKind
  status: PresenceResidueStatus
  text: string
}

export interface ConversationDeliveryView {
  state: ConversationDeliveryState
  text: string | null
}

export interface DelayView {
  seconds: number
  reason: DelayReason
  text: string
}

export interface SilentTurnView {
  reason: SilentTurnReason
  text: string
}

export interface SceneMoodView {
  mood: SceneMoodKind
  intensity: SceneMoodIntensity
}

/**
 * Provider-local continuity payload accepted by the AIRI runtime adapter.
 *
 * This stays at the provider boundary and should not be used by stage-facing UI.
 */
export interface CharacterRuntimeAdapterInput {
  turnId: string
  replyText: string
  policy?: {
    mode?: 'reply-now' | 'reply-later' | 'short-warm' | 'silence'
    delaySeconds?: number
    silenceReason?: SilentTurnReason
  }
  lifeState?: {
    cue?: PresenceCueKind
    cueText?: string
    cueIntensity?: PresenceCueIntensity
    residue?: PresenceResidueKind
    residueText?: string
    residueStatus?: PresenceResidueStatus
    sceneMood?: SceneMoodKind
    sceneMoodIntensity?: SceneMoodIntensity
  }
}
