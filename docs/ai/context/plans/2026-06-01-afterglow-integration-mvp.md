# AIRI + Afterglow Phase 1 MVP

> Date: 2026-06-01
> Status: Approved direction
> Owner: Codex + liujiamu
> Track: AIRI character runtime / Afterglow phase 1

## 1. MVP Intent

The phase 1 MVP proves believable character presence, not full platform integration.

The question this MVP answers is:

`When the user leaves and comes back later, does it still feel like she has been living in the meantime?`

## 2. Phase 1 Goals

1. Route one character's chat turns through Afterglow
2. Translate Afterglow outputs into AIRI-native runtime signals
3. Support visible delayed reply and intentional silence
4. Show at least one life-state channel on stage
5. Deliver replies in a staged way rather than a single block dump
6. Preserve continuity across returns

## 3. Explicit Non-Goals

- VoxCPM integration
- voice cloning
- multi-character orchestration
- full Afterglow product parity
- deep autonomous proactive behavior
- total memory model unification across systems

## 4. Product Requirements

### Required behaviors

- normal reply
- delayed reply
- short warm reply
- no reply / silence
- lightweight life-state residue

### Required user-visible properties

- the character appears to have her own time
- the character appears to remember relationship context
- the character appears to perform replies rather than dump text
- the experience remains legible with voice disabled

## 5. Engineering Scope

### Minimal module additions

- Afterglow provider entry under `packages/stage-ui/src/libs/providers/providers/afterglow/`
- character runtime type contract
- character runtime adapter
- character runtime store module
- scene render model builder

### Existing AIRI surfaces to reuse

- [`packages/stage-ui/src/stores/chat.ts`](../../../packages/stage-ui/src/stores/chat.ts)
- [`packages/stage-ui/src/components/scenes/Stage.vue`](../../../packages/stage-ui/src/components/scenes/Stage.vue)
- [`packages/stage-ui/src/libs/speech/tts-session.ts`](../../../packages/stage-ui/src/libs/speech/tts-session.ts)
- existing provider registration pattern under [`packages/stage-ui/src/libs/providers/providers`](../../../packages/stage-ui/src/libs/providers/providers)

## 6. Delivery Shape

### Step 1

Add an Afterglow provider that can complete a chat turn and expose continuity metadata through a provider-local shape.

### Step 2

Add an AIRI character runtime adapter that maps provider-local payloads into a closed `CharacterSignal[]` contract.

### Step 3

Add a character runtime store that keeps:
- canonical timeline
- current visible presence state
- residue state
- delay and silent-turn state

### Step 4

Add a render model builder for `Stage.vue` so the scene consumes one stable high-level contract.

### Step 5

Update the stage to render:
- presence cue
- residue
- current conversation state
- delayed-reply waiting state
- intentional silence state

## 7. Acceptance Criteria

The phase 1 MVP is acceptable when:
- one Afterglow-backed character works end-to-end in AIRI
- the user can observe delay and silence as intentional runtime states
- the stage shows at least one persistent life-state signal
- staged delivery feels more alive than the current baseline
- continuity survives a leave-and-return flow

## 8. Test Gate

Before calling phase 1 complete, verify:
- typecheck passes
- lint passes
- adapter mapping tests pass
- continuity regression tests pass
- scene-level presence integration tests pass

## 9. Deferred Follow-Up

After phase 1 proves presence, evaluate:
- whether VoxCPM adds enough value to justify cost and latency
- whether proactive autonomy should expand
- whether the runtime should support multiple characters
