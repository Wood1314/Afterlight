import { describe, expect, it } from 'vitest'
import { render } from 'vitest-browser-vue'
import { computed, defineComponent, ref } from 'vue'

const renderModelRef = ref({
  presenceCue: {
    cue: 'returning',
    intensity: 'noticeable',
    text: 'She recognizes your return quietly.',
  },
  residue: {
    residue: 'relationship',
    status: 'fresh',
    text: 'The last thread between you still feels intact.',
  },
  conversation: {
    state: 'staged',
    text: 'Welcome back.',
  },
  delay: null,
  silentTurn: null,
  sceneMood: {
    mood: 'warm',
    intensity: 'clear',
  },
})

const StagePresenceHarness = defineComponent({
  name: 'StagePresenceHarness',
  setup() {
    const stagePresenceTone = computed(() => {
      if (renderModelRef.value.silentTurn)
        return renderModelRef.value.silentTurn.text
      if (renderModelRef.value.delay)
        return renderModelRef.value.delay.text
      if (renderModelRef.value.presenceCue)
        return renderModelRef.value.presenceCue.text
      return null
    })

    return {
      renderModel: renderModelRef,
      stagePresenceTone,
    }
  },
  template: `
    <div class="stage-presence-harness">
      <div
        v-if="renderModel.presenceCue || renderModel.residue || renderModel.delay || renderModel.silentTurn"
        aria-live="polite"
      >
        <div v-if="renderModel.presenceCue">
          <div>Presence</div>
          <div>{{ renderModel.presenceCue.text }}</div>
        </div>

        <div v-if="renderModel.residue">
          <div>Residue</div>
          <div>{{ renderModel.residue.text }}</div>
        </div>

        <div
          v-if="renderModel.delay || renderModel.silentTurn"
          :aria-label="stagePresenceTone ?? undefined"
        >
          <div>{{ renderModel.delay ? 'Waiting' : 'Silence' }}</div>
          <div>{{ stagePresenceTone }}</div>
        </div>
      </div>
    </div>
  `,
})

/**
 * @example
 * await render(StagePresenceHarness)
 */
describe('Stage presence integration', () => {
  it('renders presence cue before residue and keeps the scene legible without voice', async () => {
    renderModelRef.value = {
      presenceCue: {
        cue: 'returning',
        intensity: 'noticeable',
        text: 'She recognizes your return quietly.',
      },
      residue: {
        residue: 'relationship',
        status: 'fresh',
        text: 'The last thread between you still feels intact.',
      },
      conversation: {
        state: 'staged',
        text: 'Welcome back.',
      },
      delay: null,
      silentTurn: null,
      sceneMood: {
        mood: 'warm',
        intensity: 'clear',
      },
    }

    const screen = await render(StagePresenceHarness)

    await expect.element(screen.getByText('Presence')).toBeInTheDocument()
    await expect.element(screen.getByText('Residue')).toBeInTheDocument()
    await expect.element(screen.getByText('She recognizes your return quietly.')).toBeInTheDocument()
    await expect.element(screen.getByText('The last thread between you still feels intact.')).toBeInTheDocument()
  })

  it('renders delayed and silent states as semantic waiting states instead of missing replies', async () => {
    renderModelRef.value = {
      presenceCue: null,
      residue: null,
      conversation: {
        state: 'idle',
        text: null,
      },
      delay: {
        seconds: 2,
        reason: 'pacing',
        text: 'She is taking a moment before replying.',
      },
      silentTurn: null,
      sceneMood: null,
    }

    const screen = await render(StagePresenceHarness)

    await expect.element(screen.getByText('Waiting')).toBeInTheDocument()
    await expect.element(screen.getByText('She is taking a moment before replying.')).toBeInTheDocument()

    renderModelRef.value = {
      presenceCue: null,
      residue: null,
      conversation: {
        state: 'idle',
        text: null,
      },
      delay: null,
      silentTurn: {
        reason: 'boundary',
        text: 'She notices the moment, but chooses not to answer right now.',
      },
      sceneMood: null,
    }

    await expect.element(screen.getByText('Silence')).toBeInTheDocument()
    await expect.element(screen.getByText('She notices the moment, but chooses not to answer right now.')).toBeInTheDocument()
  })
})
