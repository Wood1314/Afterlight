import { describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-vue'
import { computed, defineComponent, ref } from 'vue'

import Stage from './Stage.vue'

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

vi.mock('../../stores/modules', () => ({
  useAiriCardStore: () => ({
    activeCard: computed(() => ({
      name: 'airi',
    })),
  }),
  useCharacterRuntimeStore: () => ({
    currentTurnId: 'turn-1',
    renderModel: renderModelRef,
    recordReplyText: vi.fn(),
    clearActiveTurn: vi.fn(),
  }),
}))

vi.mock('../../stores/modules/speech', () => ({
  useSpeechStore: () => ({
    ssmlEnabled: ref(false),
    activeSpeechProvider: ref('mock-speech'),
    activeSpeechModel: ref('mock-model'),
    activeSpeechVoice: ref(null),
    pitch: ref(1),
  }),
}))

vi.mock('../../stores/audio', () => ({
  useAudioContext: () => ({
    audioContext: null,
  }),
  useSpeakingStore: () => ({
    mouthOpenSize: ref(0),
    nowSpeaking: ref(false),
  }),
}))

vi.mock('../../stores/background', () => ({
  useBackgroundStore: () => ({
    activeBackgroundUrl: ref(''),
  }),
}))

vi.mock('../../stores/chat', () => ({
  useChatOrchestratorStore: () => ({
    onBeforeMessageComposed: () => () => {},
    onBeforeSend: () => () => {},
    onTokenLiteral: () => () => {},
    onTokenSpecial: () => () => {},
    onStreamEnd: () => () => {},
    onAssistantResponseEnd: () => () => {},
  }),
}))

vi.mock('../../stores/llm-streaming-control', () => ({
  useLlmStreamingControlStore: () => ({
    onSignal: () => () => {},
    dispatchWith: vi.fn(),
  }),
}))

vi.mock('../../stores/providers', () => ({
  useProvidersStore: () => ({}),
}))

vi.mock('../../stores/settings', () => ({
  useSettings: () => ({
    stageModelRenderer: ref('godot'),
    stageViewControlsEnabled: ref(false),
    stageModelSelectedUrl: ref(''),
    stageModelSelected: ref(''),
    themeColorsHue: ref(0),
    themeColorsHueDynamic: ref(false),
    spinePremultipliedAlpha: ref(false),
    spineDefaultMixDuration: ref(0),
    spineIdleAnimationEnabled: ref(false),
    spineMaxFps: ref(60),
    spineRenderScale: ref(1),
    updateStageModel: vi.fn(),
  }),
}))

vi.mock('../../stores/speech-runtime', () => ({
  useSpeechRuntimeStore: () => ({
    openIntent: vi.fn(),
  }),
}))

vi.mock('../../composables/use-auth-provider-sync', () => ({
  useAuthProviderSync: () => undefined,
}))

vi.mock('../../composables/use-duck-db', () => ({
  useDuckDb: () => ({
    getDb: vi.fn(),
  }),
}))

vi.mock('../../composables/use-io-trace-bridge', () => ({
  useIOTraceBridge: () => undefined,
}))

vi.mock('../../composables/use-io-tracer', () => ({
  initIOTracer: () => undefined,
}))

vi.mock('../../composables/use-speech-pipeline-analytics', () => ({
  useSpeechPipelineAnalytics: () => ({
    createPlaybackManagerInstrumentation: () => undefined,
  }),
}))

vi.mock('../../../../stage-ui-live2d/src/composables/live2d/live2d', () => ({
  useSettingsLive2d: () => ({
    live2dShadowEnabled: ref(false),
    live2dMaxFps: ref(60),
    live2dRenderScale: ref(1),
  }),
}))

vi.mock('@proj-airi/stage-ui-live2d', () => ({
  Live2DScene: defineComponent({ name: 'Live2DSceneStub', template: '<div />' }),
  useLive2dParams: () => ({
    currentMotion: ref(null),
    onShouldUpdateView: () => () => {},
  }),
}))

vi.mock('@proj-airi/stage-ui-spine', () => ({
  SpineScene: defineComponent({ name: 'SpineSceneStub', template: '<div />' }),
}))

vi.mock('@proj-airi/stage-ui-three', () => ({
  ThreeScene: defineComponent({ name: 'ThreeSceneStub', template: '<div />' }),
}))

vi.mock('@proj-airi/stage-ui-three/assets/vrm', () => ({
  animations: {
    idleLoop: {
      toString: () => 'idle',
    },
  },
}))

vi.mock('@proj-airi/ui', () => ({
  Callout: defineComponent({
    name: 'CalloutStub',
    props: {
      label: {
        type: String,
        default: '',
      },
    },
    template: '<div><slot /></div>',
  }),
}))

vi.mock('@vueuse/core', async () => {
  const actual = await vi.importActual<typeof import('@vueuse/core')>('@vueuse/core')
  return {
    ...actual,
    useBroadcastChannel: () => ({
      post: vi.fn(),
    }),
  }
})

/**
 * @example
 * await render(Stage, { props: { paused: false } })
 */
describe('Stage presence integration', () => {
  it('renders presence cue before residue and keeps the scene legible without voice', async () => {
    const screen = await render(Stage, {
      props: {
        paused: false,
      },
    })

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

    const screen = await render(Stage, {
      props: {
        paused: false,
      },
    })

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
