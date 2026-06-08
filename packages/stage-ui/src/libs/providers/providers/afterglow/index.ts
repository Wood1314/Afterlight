import { createOpenAI } from '@xsai-ext/providers/create'
import { z } from 'zod'

import { ProviderValidationCheck } from '../../types'
import { createOpenAICompatibleValidators } from '../../validators'
import { defineProvider } from '../registry'

const AFTERGLOW_DEFAULT_BASE_URL = 'http://127.0.0.1:8000/'
const AFTERGLOW_DEFAULT_MODEL = 'afterglow-companion'

function readAfterglowEnv(name: 'AFTERGLOW_API_KEY' | 'AFTERGLOW_BASE_URL' | 'AFTERGLOW_MODEL') {
  const value = import.meta.env[name]

  return typeof value === 'string' ? value.trim() : ''
}

const afterglowConfigSchema = z.object({
  apiKey: z
    .string('API Key')
    .optional()
    .default(readAfterglowEnv('AFTERGLOW_API_KEY')),
  baseUrl: z
    .string('Base URL')
    .optional()
    .default(readAfterglowEnv('AFTERGLOW_BASE_URL') || AFTERGLOW_DEFAULT_BASE_URL),
})

type AfterglowConfig = z.input<typeof afterglowConfigSchema>

const afterglowModels = [
  {
    id: readAfterglowEnv('AFTERGLOW_MODEL') || AFTERGLOW_DEFAULT_MODEL,
    name: readAfterglowEnv('AFTERGLOW_MODEL') || AFTERGLOW_DEFAULT_MODEL,
    provider: 'afterglow',
    description: 'External Afterglow backend model slot for persona + memory driven replies.',
  },
]

export const providerAfterglow = defineProvider<AfterglowConfig>({
  id: 'afterglow',
  order: 3,
  name: 'Afterglow',
  nameLocalize: () => 'Afterglow',
  description: 'External Afterglow backend for imported chat memory, persona, retrieval, and continuity-driven replies.',
  descriptionLocalize: () => 'External Afterglow backend for imported chat memory, persona, retrieval, and continuity-driven replies.',
  tasks: ['chat'],
  icon: 'i-lobe-icons:deepseek',
  iconColor: 'i-lobe-icons:deepseek-color',

  createProviderConfig: ({ t }) => afterglowConfigSchema.extend({
    apiKey: afterglowConfigSchema.shape.apiKey.meta({
      labelLocalized: t('settings.pages.providers.catalog.edit.config.common.fields.field.api-key.label'),
      descriptionLocalized: 'API key for the external Afterglow backend. Keep it local-only.',
      placeholderLocalized: t('settings.pages.providers.catalog.edit.config.common.fields.field.api-key.placeholder'),
      type: 'password',
    }),
    baseUrl: afterglowConfigSchema.shape.baseUrl.meta({
      labelLocalized: t('settings.pages.providers.catalog.edit.config.common.fields.field.base-url.label'),
      descriptionLocalized: 'OpenAI-compatible base URL exposed by the external Afterglow backend, usually http://127.0.0.1:8000/.',
      placeholderLocalized: t('settings.pages.providers.catalog.edit.config.common.fields.field.base-url.placeholder'),
    }),
  }),
  onboardingFields: () => [
    {
      key: 'apiKey',
      type: 'password',
      label: 'API Key',
      description: 'API key for the external Afterglow backend. Read from local .env / .env.local only.',
      required: true,
      defaultValue: '',
    },
    {
      key: 'baseUrl',
      type: 'text',
      label: 'Base URL',
      description: 'Local Afterglow backend endpoint, usually http://127.0.0.1:8000/.',
      required: true,
      defaultValue: AFTERGLOW_DEFAULT_BASE_URL,
    },
  ],
  createProvider(config) {
    return createOpenAI(config.apiKey as string, config.baseUrl)
  },
  extraMethods: {
    listModels: async () => afterglowModels,
  },
  validationRequiredWhen(config) {
    return !!config.apiKey?.trim()
  },
  validators: {
    ...createOpenAICompatibleValidators({
      checks: [ProviderValidationCheck.Connectivity, ProviderValidationCheck.ModelList, ProviderValidationCheck.ChatCompletions],
    }),
  },
})

/**
 * Builds the provider-local continuity payload for the current AIRI phase 1
 * Afterglow experiment.
 *
 * Use when:
 * - The Afterglow provider is active
 * - AIRI needs provider-local continuity metadata before mapping to runtime signals
 *
 * Expects:
 * - The current user message text for lightweight policy inference
 *
 * Returns:
 * - A provider-local shape ready for `adaptCharacterRuntime()`
 */
export function buildAfterglowContinuityPayload(
  input: { turnId: string, userText: string },
  options?: { allowDelay?: boolean, allowSilence?: boolean },
) {
  const normalized = input.userText.toLowerCase()
  const allowSilence = options?.allowSilence !== false
  const allowDelay = options?.allowDelay !== false

  if (allowSilence && (normalized.includes('晚安') || normalized.includes('good night'))) {
    return {
      turnId: input.turnId,
      replyText: '',
      policy: {
        mode: 'silence' as const,
        silenceReason: 'resting' as const,
      },
      lifeState: {
        cue: 'resting' as const,
        cueText: 'She has settled into a quieter end-of-day rhythm.',
        cueIntensity: 'ambient' as const,
        residue: 'routine' as const,
        residueText: 'A low bedside glow suggests she is winding down.',
        residueStatus: 'fresh' as const,
        sceneMood: 'sleepy' as const,
        sceneMoodIntensity: 'soft' as const,
      },
    }
  }

  if (allowDelay && (normalized.includes('等') || normalized.includes('later') || normalized.includes('稍等'))) {
    return {
      turnId: input.turnId,
      replyText: '',
      policy: {
        mode: 'reply-later' as const,
        delaySeconds: 2,
      },
      lifeState: {
        cue: 'busy' as const,
        cueText: 'She seems occupied for a moment, but still present.',
        cueIntensity: 'ambient' as const,
        residue: 'activity' as const,
        residueText: 'The room feels lightly in motion, like she just stepped away from something.',
        residueStatus: 'partial' as const,
        sceneMood: 'focused' as const,
        sceneMoodIntensity: 'soft' as const,
      },
    }
  }

  if (normalized.includes('回来') || normalized.includes('back')) {
    return {
      turnId: input.turnId,
      replyText: '',
      policy: {
        mode: 'short-warm' as const,
      },
      lifeState: {
        cue: 'returning' as const,
        cueText: 'She recognizes your return without making a scene of it.',
        cueIntensity: 'noticeable' as const,
        residue: 'relationship' as const,
        residueText: 'There is a sense that the last thread between you is still intact.',
        residueStatus: 'fresh' as const,
        sceneMood: 'warm' as const,
        sceneMoodIntensity: 'clear' as const,
      },
    }
  }

  return {
    turnId: input.turnId,
    replyText: '',
    policy: {
      mode: 'reply-now' as const,
    },
    lifeState: {
      cue: 'alive' as const,
      cueText: 'She is still here, carrying the thread forward.',
      cueIntensity: 'ambient' as const,
      residue: 'relationship' as const,
      residueText: 'The room still feels like the last conversation has not fully faded.',
      residueStatus: 'fresh' as const,
      sceneMood: 'warm' as const,
      sceneMoodIntensity: 'soft' as const,
    },
  }
}
