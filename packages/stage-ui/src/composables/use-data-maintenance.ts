import type { ChatSessionsExport } from '../types/chat-session'

import { isStageTamagotchi } from '@proj-airi/stage-shared'
import { useLive2dParams, useSettingsLive2d } from '@proj-airi/stage-ui-live2d'
import { useModelStore } from '@proj-airi/stage-ui-three'
import { convertTrainingConversationsToChatSessionsExport } from '../libs/afterglow/trainingConversationImport'
import { useChatOrchestratorStore } from '../stores/chat'
import { useChatSessionStore } from '../stores/chat/session-store'
import { useDisplayModelsStore } from '../stores/display-models'
import { useMcpStore } from '../stores/mcp'
import { useAiriCardStore } from '../stores/modules/airi-card'
import { useConsciousnessStore } from '../stores/modules/consciousness'
import { useDiscordStore } from '../stores/modules/discord'
import { useFactorioStore } from '../stores/modules/gaming-factorio'
import { useMinecraftStore } from '../stores/modules/gaming-minecraft'
import { useHearingStore } from '../stores/modules/hearing'
import { useAfterglowContinuityStore } from '../stores/modules/afterglowContinuity'
import { useSpeechStore } from '../stores/modules/speech'
import { useTwitterStore } from '../stores/modules/twitter'
import { useOnboardingStore } from '../stores/onboarding'
import { useProvidersStore } from '../stores/providers'
import { useSettings, useSettingsAudioDevice } from '../stores/settings'

export function useDataMaintenance() {
  const chatStore = useChatSessionStore()
  const chatOrchestrator = useChatOrchestratorStore()
  const displayModelsStore = useDisplayModelsStore()
  const providersStore = useProvidersStore()
  const settingsStore = useSettings()
  const audioSettingsStore = useSettingsAudioDevice()
  const live2dParamsStore = useLive2dParams()
  const live2dSettingsStore = useSettingsLive2d()
  const threeStore = useModelStore()
  const hearingStore = useHearingStore()
  const speechStore = useSpeechStore()
  const consciousnessStore = useConsciousnessStore()
  const afterglowContinuityStore = useAfterglowContinuityStore()
  const twitterStore = useTwitterStore()
  const discordStore = useDiscordStore()
  const factorioStore = useFactorioStore()
  const minecraftStore = useMinecraftStore()
  const mcpStore = useMcpStore()
  const onboardingStore = useOnboardingStore()
  const airiCardStore = useAiriCardStore()

  async function deleteAllModels() {
    await displayModelsStore.resetDisplayModels()
    settingsStore.stageModelSelected = 'preset-live2d-1'
    await settingsStore.updateStageModel()
  }

  async function resetProvidersSettings() {
    await providersStore.resetProviderSettings()
  }

  function resetModulesSettings() {
    hearingStore.resetState()
    speechStore.resetState()
    consciousnessStore.resetState()
    afterglowContinuityStore.resetState()
    twitterStore.resetState()
    discordStore.resetState()
    factorioStore.resetState()
    minecraftStore.resetState()
  }

  function deleteAllChatSessions() {
    chatOrchestrator.cancelPendingSends()
    chatStore.resetAllSessions()
  }

  async function exportChatSessions() {
    const data = await chatStore.exportSessions()
    return new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  }

  function isChatSessionsPayload(payload: unknown): payload is ChatSessionsExport {
    if (!payload || typeof payload !== 'object')
      return false
    return (payload as { format?: string }).format === 'chat-sessions-index:v1'
  }

  function normalizeImportedChatSessionsPayload(payload: unknown): ChatSessionsExport {
    if (isChatSessionsPayload(payload))
      return payload

    const converted = convertTrainingConversationsToChatSessionsExport(payload, {
      characterId: airiCardStore.activeCardId || 'default',
    })
    if (converted)
      return converted.sessionsExport

    throw new Error('Invalid chat session export format')
  }

  function bootstrapAfterglowContinuityFromImport(payload: ChatSessionsExport) {
    if (consciousnessStore.activeProvider !== 'afterglow' || !afterglowContinuityStore.enabled) {
      return
    }

    const activeSessionId = payload.index.characters[airiCardStore.activeCardId || 'default']?.activeSessionId
    if (!activeSessionId) {
      return
    }

    const activeSession = payload.sessions[activeSessionId]
    if (!activeSession?.messages?.length) {
      return
    }
  }

  async function importChatSessions(payload: Record<string, unknown>, options?: { bootstrapAfterglow?: boolean }) {
    const normalizedPayload = normalizeImportedChatSessionsPayload(payload)
    await chatStore.importSessions(normalizedPayload)

    if (afterglowContinuityStore.bootstrapOnChatImport.value && options?.bootstrapAfterglow !== false) {
      bootstrapAfterglowContinuityFromImport(normalizedPayload)
    }
  }

  async function resetSettingsState() {
    await settingsStore.resetState()
    audioSettingsStore.resetState()
    live2dParamsStore.resetState()
    live2dSettingsStore.resetState()
    threeStore.resetModelStore()
    mcpStore.resetState()
    onboardingStore.resetSetupState()
    airiCardStore.resetState()
  }

  async function deleteAllData() {
    await deleteAllModels()
    await resetProvidersSettings()
    resetModulesSettings()
    deleteAllChatSessions()
    await resetSettingsState()
  }

  async function resetDesktopApplicationState() {
    if (!isStageTamagotchi())
      return

    await resetSettingsState()
    resetModulesSettings()
  }

  return {
    deleteAllModels,
    resetProvidersSettings,
    resetModulesSettings,
    deleteAllChatSessions,
    exportChatSessions,
    importChatSessions,
    deleteAllData,
    resetDesktopApplicationState,
  }
}
