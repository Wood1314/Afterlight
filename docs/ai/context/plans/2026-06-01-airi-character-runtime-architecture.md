# AIRI Character Runtime with Afterglow — Architecture and Rules

> Date: 2026-06-01
> Status: Approved direction
> Owner: Codex + liujiamu
> Track: AIRI character runtime / Afterglow phase 1

## 1. Goal

Use AIRI as the canonical product shell and integrate Afterglow as a continuity brain input so the character feels like a persistent living presence rather than a better chat endpoint.

This track is explicitly not about generic answer quality.

The target outcome is:
- the user returns to a character, not a responder
- the character appears to have off-screen continuity
- the stage communicates presence even before or without voice

## 2. Product Decision Summary

### Core framing

- AIRI remains the visible runtime shell and canonical character owner
- Afterglow is an upstream continuity brain input
- VoxCPM is deferred out of phase 1

### Accepted scope expansion

1. Add a personal timeline and lightweight life loop
2. Add an AIRI-native character signal protocol
3. Elevate the scene into a presence renderer

### Deferred scope

- VoxCPM and premium voice embodiment
- multi-character runtime orchestration
- deep proactive autonomy

## 3. Canonical System Layering

### Layer 1: AIRI presence layer

Owned by AIRI:
- rendered session state
- stage presence and timing
- staged message delivery
- delay / silence presentation
- visible life-state and scene mood
- TTS playback orchestration

Primary runtime surfaces:
- [`packages/stage-ui/src/stores/chat.ts`](../../../packages/stage-ui/src/stores/chat.ts)
- [`packages/stage-ui/src/components/scenes/Stage.vue`](../../../packages/stage-ui/src/components/scenes/Stage.vue)
- [`packages/stage-ui/src/libs/speech/tts-session.ts`](../../../packages/stage-ui/src/libs/speech/tts-session.ts)

### Layer 2: Afterglow continuity layer

Informed by Afterglow:
- relationship-aware reply style
- life-state updates
- reply policy such as reply now / delay / short warm / silence
- continuity memory hints

Afterglow must enter AIRI through a provider and adapter boundary. Provider payloads must not leak into the rest of the runtime core.

### Layer 3: Voice layer

Voice is downstream of presence:
- it amplifies a character that already feels alive
- it does not decide memory, timing policy, or whether a reply exists

VoxCPM is a possible phase 2 voice-layer multiplier, not a phase 1 dependency.

## 4. Runtime Ownership

### AIRI owns

- canonical timeline visible to the product
- character runtime state
- stage-facing behavior timing
- render model consumed by scene UI
- speech session lifecycle

### Afterglow owns

- continuity brain outputs
- relationship-aware response shaping
- life-state and policy hints

### Boundary rule

Afterglow is not the product shell. It is an upstream system that feeds AIRI-native runtime signals.

## 5. Architecture Direction

Phase 1 follows a narrow vertical slice.

Recommended stack:

`User Input -> AIRI Chat Orchestrator -> AIRI Character Runtime Adapter -> Afterglow Provider -> AIRI Character Runtime Store -> Stage Presence Renderer -> TTS Session`

### Required runtime modules

- `packages/stage-ui/src/libs/character-runtime/types.ts`
- `packages/stage-ui/src/libs/character-runtime/adapter.ts`
- `packages/stage-ui/src/libs/character-runtime/renderModel.ts`
- `packages/stage-ui/src/stores/modules/characterRuntime.ts`
- `packages/stage-ui/src/libs/providers/providers/afterglow/index.ts`

These names are intentional:
- use `characterRuntime`, not vague names like `presenceManager`
- use `adapter`, not generic `bridgeService`
- use `renderModel`, not generic `uiState`

## 6. Contract Rules

### Signal protocol rule

The character signal protocol must be a closed typed contract.

Requirements:
- use explicit discriminated unions
- no open-ended `Record<string, unknown>`
- no provider raw payloads passed directly into UI
- stage and store code must consume AIRI-native types only

### Render model rule

`Stage.vue` should consume a high-level render model, not raw provider outputs and not low-level continuity payloads.

That render model should be the only scene-facing contract for:
- presence cue
- residue
- conversation delivery state
- delay state
- silent-turn state
- scene mood

## 7. Performance and Scheduling Rules

Split runtime work into blocking and non-blocking paths.

### Blocking path

Only reply-critical signals belong here:
- whether a reply exists
- whether the reply is delayed
- whether the reply should be intentionally silent
- minimal conversation payload needed to proceed

### Non-blocking path

Secondary presence hints belong here:
- residue
- ambient life-state details
- secondary mood hints
- non-critical scene adornments

Rule:
- never block a visible response on secondary residue work

## 8. Testing Rules

Phase 1 must add dedicated verification for continuity and presence.

Required coverage:
- continuity regression suite
- scene-level presence integration tests
- adapter mapping tests from Afterglow payloads to `CharacterSignal[]`
- store tests for blocking vs non-blocking scheduling behavior

The purpose is to prevent regressions where the system falls back into plain chat behavior.

## 9. Design Rules

### First-screen hierarchy

The stage should read in this order:

`presence cue > residue > conversation`

This is a presence-first product, not a chat dashboard.

### Required visual grammar

Use distinct visual grammar for:
- presence cue
- residue
- conversation

These must not collapse into one repeated bubble treatment.

### Delay and silence semantics

Delayed reply must have a meaningful waiting state.

Silent turn must have an intentional non-reply state.

These states need semantic accessibility support and must not rely on visual treatment alone.

### Residue rules

Presence residue must support:
- empty
- partial
- stale

Residue is ephemeral context, not a permanent dashboard log.

### Return-moment tone

When the user comes back, the tone should be quiet recognition rather than loud re-engagement.

### Anti-patterns explicitly banned

- chat-centric dashboard composition
- badge / chip / admin-label treatment for core presence cues
- leaking provider terminology into user-facing stage state

### Narrow-width rule

On small widths, preserve:
- presence cue
- current conversation

Weaken first:
- residue

## 10. Phase 1 Implementation Slice

Keep phase 1 intentionally narrow:
- one character
- one canonical timeline
- one Afterglow adapter
- one scene render path

Do not broaden phase 1 into:
- multi-character orchestration
- full memory model unification
- high-fidelity voice platform work

## 11. Success Criteria

Phase 1 is successful if:
- the user perceives continuity across returns
- delayed reply and silence feel intentional, not broken
- the stage conveys life-state without requiring voice
- AIRI still feels like AIRI rather than a thin wrapper over another product
