<script setup lang="ts">
import { Alert } from '@proj-airi/stage-ui/components'
import { useDataMaintenance } from '@proj-airi/stage-ui/composables/use-data-maintenance'
import { createAfterglowClient, type AfterglowUploadedFile } from '@proj-airi/stage-ui/libs/afterglow/client'
import {
  convertTrainingConversationsToAfterglowQqExport,
  convertTrainingConversationsToChatSessionsExport,
} from '@proj-airi/stage-ui/libs/afterglow/trainingConversationImport'
import { useAfterglowContinuityStore, useAfterglowMemoryStore } from '@proj-airi/stage-ui/stores/modules'
import { useConsciousnessStore } from '@proj-airi/stage-ui/stores/modules/consciousness'
import { useProvidersStore } from '@proj-airi/stage-ui/stores/providers'
import { Button, FieldCheckbox, FieldInput, FieldRange, FieldSelect } from '@proj-airi/ui'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'

const { t } = useI18n()

const afterglowMemoryStore = useAfterglowMemoryStore()
const afterglowContinuityStore = useAfterglowContinuityStore()
const consciousnessStore = useConsciousnessStore()
const providersStore = useProvidersStore()
const { importChatSessions } = useDataMaintenance()
const serviceStatus = ref<'idle' | 'checking' | 'ready' | 'error'>('idle')
const serviceError = ref('')
const remoteInfo = ref<Awaited<ReturnType<ReturnType<typeof createAfterglowClient>['getInfo']>> | null>(null)
const remoteMemoryStats = ref<Awaited<ReturnType<ReturnType<typeof createAfterglowClient>['getMemoryStats']>> | null>(null)
const remoteConfigHealth = ref<Awaited<ReturnType<ReturnType<typeof createAfterglowClient>['getConfigStatus']>> | null>(null)
const debugStats = ref<Awaited<ReturnType<ReturnType<typeof createAfterglowClient>['getDebugStats']>> | null>(null)
const debugStatsError = ref('')
const importFiles = ref<File[] | undefined>(undefined)
const importStatus = ref<'idle' | 'inspecting' | 'uploading' | 'starting' | 'running' | 'done' | 'error'>('idle')
const importError = ref('')
const importInspection = ref<Awaited<ReturnType<ReturnType<typeof createAfterglowClient>['inspectImportFile']>> | null>(null)
const uploadedFiles = ref<AfterglowUploadedFile[]>([])
const importTask = ref<Awaited<ReturnType<ReturnType<typeof createAfterglowClient>['getImportTask']>> | null>(null)
const importPollTimer = ref<number | null>(null)
const remoteConfigStatus = ref<'idle' | 'syncing' | 'ready' | 'error'>('idle')
const remoteConfigError = ref('')
const localImportHint = ref('')
const localImportMode = ref(false)
const retrievalDebugQuery = ref('')
const retrievalDebugStatus = ref<'idle' | 'searching' | 'error'>('idle')
const retrievalDebugError = ref('')
const retrievalDebugResult = ref<Awaited<ReturnType<ReturnType<typeof createAfterglowClient>['searchMemory']>> | null>(null)
const serviceConnectionStatus = computed<'incomplete' | 'ready'>(() => {
  return runtimeConnectionReady.value && remoteInfo.value && remoteMemoryStats.value ? 'ready' : 'incomplete'
})
const remotePersonaStatus = computed<'incomplete' | 'ready'>(() => {
  if (remoteConfigStatus.value === 'ready')
    return 'ready'

  if (remoteConfigHealth.value?.wizard_completed)
    return 'ready'

  return 'incomplete'
})
const importRuntimeHint = computed(() => {
  if (serviceStatus.value !== 'ready' || !remoteInfo.value)
    return ''

  if (importStatus.value === 'running' && remoteMemoryStats.value && remoteMemoryStats.value.friend_messages === 0) {
    return t('settings.pages.memory.afterglow.importer.runtimeHints.waitingForEmbedding')
  }

  if (!remoteInfo.value.has_persona_card) {
    return t('settings.pages.memory.afterglow.importer.runtimeHints.personaNotReady')
  }

  return t('settings.pages.memory.afterglow.importer.runtimeHints.readyForChat')
})
const configWizardStatus = computed<'incomplete' | 'ready'>(() => {
  return remoteConfigHealth.value?.wizard_completed ? 'ready' : 'incomplete'
})

function buildTrainingBridgeFileName(originalName: string) {
  const normalizedName = originalName.replace(/\.json$/i, '')
  return `${normalizedName}.afterglow-qqexporter.json`
}

function ensureAfterglowProviderConfig() {
  providersStore.initializeProvider('afterglow')
  let providerConfig = providersStore.getProviderConfig('afterglow')
  if (!providerConfig) {
    providersStore.providers.afterglow = {}
    providerConfig = providersStore.providers.afterglow
  }
  return providerConfig
}

function syncAfterglowProviderConfig() {
  if (isSyncingAfterglowProviderConfig)
    return

  isSyncingAfterglowProviderConfig = true
  try {
    const providerConfig = ensureAfterglowProviderConfig()
    providerConfig.baseUrl = afterglowMemoryStore.normalizedServiceBaseUrl.value
    providerConfig.apiKey = afterglowMemoryStore.serviceApiKey.value.trim()
  }
  finally {
    isSyncingAfterglowProviderConfig = false
  }
}

function syncMemoryFromAfterglowProviderConfig() {
  if (isSyncingAfterglowProviderConfig)
    return

  isSyncingAfterglowProviderConfig = true
  try {
    const providerConfig = ensureAfterglowProviderConfig()
    const baseUrl = typeof providerConfig.baseUrl === 'string' ? providerConfig.baseUrl.trim() : ''
    const apiKey = typeof providerConfig.apiKey === 'string' ? providerConfig.apiKey.trim() : ''

    if (!baseUrl && !apiKey)
      return

    if (baseUrl)
      afterglowMemoryStore.serviceBaseUrl.value = baseUrl
    if (apiKey && !afterglowMemoryStore.serviceApiKey.value.trim())
      afterglowMemoryStore.serviceApiKey.value = apiKey
  }
  finally {
    isSyncingAfterglowProviderConfig = false
  }
}

let isSyncingAfterglowProviderConfig = false

syncMemoryFromAfterglowProviderConfig()

watch([
  afterglowMemoryStore.serviceBaseUrl,
  afterglowMemoryStore.serviceApiKey,
], syncAfterglowProviderConfig, { immediate: true })

watch(() => {
  const providerConfig = providersStore.getProviderConfig('afterglow')
  return [
    typeof providerConfig?.baseUrl === 'string' ? providerConfig.baseUrl : '',
    typeof providerConfig?.apiKey === 'string' ? providerConfig.apiKey : '',
  ]
}, syncMemoryFromAfterglowProviderConfig, { immediate: true })

const configConnectionReady = computed(() =>
  afterglowMemoryStore.serviceEnabled.value
  && afterglowMemoryStore.normalizedServiceBaseUrl.value.length > 0
  && afterglowMemoryStore.configSetupToken.value.trim().length > 0,
)

const runtimeConnectionReady = computed(() =>
  afterglowMemoryStore.serviceEnabled.value
  && afterglowMemoryStore.normalizedServiceBaseUrl.value.length > 0
  && afterglowMemoryStore.serviceApiKey.value.trim().length > 0,
)

function createClient() {
  return createAfterglowClient(
    afterglowMemoryStore.normalizedServiceBaseUrl.value,
    {
      runtimeApiKey: afterglowMemoryStore.serviceApiKey.value,
      configSetupToken: afterglowMemoryStore.configSetupToken.value,
    },
  )
}

async function checkAfterglowService() {
  serviceStatus.value = 'checking'
  serviceError.value = ''
  debugStatsError.value = ''

  try {
    const client = createClient()
    const configHealth = configConnectionReady.value
      ? await client.getConfigStatus()
      : null

    remoteConfigHealth.value = configHealth
    remoteConfigStatus.value = configHealth?.wizard_completed ? 'ready' : 'idle'

    if (runtimeConnectionReady.value) {
      const [info, stats] = await Promise.all([
        client.getInfo(),
        client.getMemoryStats(),
      ])
      remoteInfo.value = info
      remoteMemoryStats.value = stats

      try {
        debugStats.value = await client.getDebugStats()
      }
      catch (error) {
        debugStats.value = null
        debugStatsError.value = error instanceof Error ? error.message : String(error)
      }
    }
    else {
      remoteInfo.value = null
      remoteMemoryStats.value = null
      debugStats.value = null
      debugStatsError.value = ''
    }

    serviceStatus.value = 'ready'
  }
  catch (error) {
    remoteInfo.value = null
    remoteMemoryStats.value = null
    remoteConfigHealth.value = null
    debugStats.value = null
    serviceStatus.value = 'error'
    serviceError.value = error instanceof Error ? error.message : String(error)
  }
}

async function searchAfterglowMemory() {
  if (serviceStatus.value !== 'ready' || !retrievalDebugQuery.value.trim())
    return

  retrievalDebugStatus.value = 'searching'
  retrievalDebugError.value = ''

  try {
    retrievalDebugResult.value = await createClient().searchMemory(retrievalDebugQuery.value.trim(), {
      topK: afterglowMemoryStore.normalizedRetrievalTopK.value,
    })
    retrievalDebugStatus.value = 'idle'
  }
  catch (error) {
    retrievalDebugResult.value = null
    retrievalDebugStatus.value = 'error'
    retrievalDebugError.value = error instanceof Error ? error.message : String(error)
  }
}

const importPluginOptions = [
  { label: t('settings.pages.memory.afterglow.integration.plugins.auto'), value: 'auto' },
  { label: t('settings.pages.memory.afterglow.integration.plugins.wechat'), value: 'wechat_weflow' },
  { label: t('settings.pages.memory.afterglow.integration.plugins.qq'), value: 'qqexporter_v5' },
]

const relationshipTypeOptions = [
  { label: t('settings.pages.memory.afterglow.integration.relationshipTypes.lover'), value: 'lover' },
  { label: t('settings.pages.memory.afterglow.integration.relationshipTypes.friend'), value: 'friend' },
  { label: t('settings.pages.memory.afterglow.integration.relationshipTypes.family'), value: 'family' },
  { label: t('settings.pages.memory.afterglow.integration.relationshipTypes.colleague'), value: 'colleague' },
  { label: t('settings.pages.memory.afterglow.integration.relationshipTypes.custom'), value: 'custom' },
]

const reusableChatProviderOptions = computed(() => {
  return providersStore.persistedChatProvidersMetadata
    .filter(provider => provider.id !== 'afterglow')
    .map(provider => ({
      label: provider.localizedName || provider.name || provider.id,
      value: provider.id,
    }))
})

const reusableEmbeddingProviderOptions = computed(() => {
  return providersStore.persistedProvidersMetadata
    .filter(provider => provider.category === 'embed')
    .map(provider => ({
      label: provider.localizedName || provider.name || provider.id,
      value: provider.id,
    }))
})

function formatRetrievalTopK(value: number) {
  return t('settings.pages.memory.afterglow.retrieval.fields.retrievalTopK.value', { count: value })
}

function formatResponsePairTopK(value: number) {
  return t('settings.pages.memory.afterglow.retrieval.fields.responsePairTopK.value', { count: value })
}

function resetAfterglowMemorySettings() {
  afterglowMemoryStore.resetState()
  afterglowContinuityStore.resetState()
}

function copyUpstreamChatProviderConfig(providerId: string) {
  const providerConfig = providersStore.getProviderConfig(providerId)
  if (!providerConfig)
    return

  const baseUrl = typeof providerConfig.baseUrl === 'string' ? providerConfig.baseUrl.trim() : ''
  const apiKey = typeof providerConfig.apiKey === 'string' ? providerConfig.apiKey.trim() : ''
  const model = consciousnessStore.activeProvider === providerId
    ? consciousnessStore.activeModel || consciousnessStore.customModelName || ''
    : ''

  afterglowMemoryStore.upstreamChatProvider.value = providerId
  afterglowMemoryStore.upstreamChatBaseUrl.value = baseUrl
  afterglowMemoryStore.upstreamChatApiKey.value = apiKey
  if (model)
    afterglowMemoryStore.upstreamChatModel.value = model

  if (!afterglowMemoryStore.upstreamEmbeddingBaseUrl.value.trim())
    afterglowMemoryStore.upstreamEmbeddingBaseUrl.value = baseUrl
  if (!afterglowMemoryStore.upstreamEmbeddingApiKey.value.trim())
    afterglowMemoryStore.upstreamEmbeddingApiKey.value = apiKey
}

function copyUpstreamEmbeddingProviderConfig(providerId: string) {
  const providerConfig = providersStore.getProviderConfig(providerId)
  if (!providerConfig)
    return

  const baseUrl = typeof providerConfig.baseUrl === 'string' ? providerConfig.baseUrl.trim() : ''
  const apiKey = typeof providerConfig.apiKey === 'string' ? providerConfig.apiKey.trim() : ''
  const explicitModel = typeof providerConfig.model === 'string' ? providerConfig.model.trim() : ''
  const explicitDimensions = providerConfig.dimensions

  afterglowMemoryStore.upstreamEmbeddingProvider.value = providerId
  afterglowMemoryStore.upstreamEmbeddingBaseUrl.value = baseUrl
  afterglowMemoryStore.upstreamEmbeddingApiKey.value = apiKey

  if (explicitModel)
    afterglowMemoryStore.upstreamEmbeddingModel.value = explicitModel

  if (typeof explicitDimensions === 'number' && Number.isFinite(explicitDimensions) && explicitDimensions > 0) {
    afterglowMemoryStore.upstreamEmbeddingDim.value = explicitDimensions
  }
}

const canInspectImport = computed(() => configConnectionReady.value && (importFiles.value?.length ?? 0) > 0)
const canStartImport = computed(() =>
  configConnectionReady.value
  && afterglowMemoryStore.importIdentityReady.value
  && (importFiles.value?.length ?? 0) > 0,
)
const chatProviderReady = computed(() => consciousnessStore.activeProvider === 'afterglow')
const activeChatModel = computed(() => consciousnessStore.activeModel || 'afterglow-companion')
const latestModelCalls = computed(() => debugStats.value?.model_chain.slice(0, 6) ?? [])

function stopImportPolling() {
  if (importPollTimer.value !== null) {
    window.clearTimeout(importPollTimer.value)
    importPollTimer.value = null
  }
}

async function pollImportTask(taskId: string) {
  stopImportPolling()

  try {
    const task = await createClient().getImportTask(taskId)
    importTask.value = task

    if (task.status === 'done' || task.status === 'success') {
      importStatus.value = 'done'
      await checkAfterglowService()
      return
    }

    if (task.status === 'failed' || task.status === 'cancelled' || task.error) {
      importStatus.value = 'error'
      importError.value = task.error ?? task.message ?? 'Afterglow import failed'
      return
    }

    importStatus.value = 'running'
    importPollTimer.value = window.setTimeout(() => {
      void pollImportTask(taskId)
    }, 1500)
  }
  catch (error) {
    importStatus.value = 'error'
    importError.value = error instanceof Error ? error.message : String(error)
  }
}

function applyIdentityCandidate(role: 'self' | 'friend', name: string, uid: string) {
  if (role === 'self') {
    afterglowMemoryStore.selfName.value = name
    afterglowMemoryStore.selfUid.value = uid
    return
  }

  afterglowMemoryStore.friendName.value = name
  afterglowMemoryStore.friendUid.value = uid
}

async function inspectImportFile() {
  if (!canInspectImport.value || !importFiles.value?.[0])
    return

  importStatus.value = 'inspecting'
  importError.value = ''
  localImportHint.value = ''
  localImportMode.value = false

  try {
    const currentFile = importFiles.value[0]
    const fileText = await currentFile.text()
    const parsed = JSON.parse(fileText) as unknown
    const converted = convertTrainingConversationsToChatSessionsExport(parsed, {
      characterId: 'default',
    })
    if (converted) {
      localImportMode.value = true
      importInspection.value = {
        format: 'unknown',
        total_messages: converted.importedMessageCount,
        candidates: [],
        error: '',
      }
      localImportHint.value = `检测到训练集 conversations JSON，已可作为本地聊天记录导入，共 ${converted.importedConversationCount} 段对话、${converted.importedMessageCount} 条消息。这个格式不能直接发给 Afterglow 聊天导入接口。`
      importStatus.value = 'idle'
      return
    }

    importInspection.value = await createClient().inspectImportFile(currentFile)
    for (const candidate of importInspection.value.candidates) {
      if (candidate.role_hint === 'self' && !afterglowMemoryStore.selfUid.value)
        applyIdentityCandidate('self', candidate.name, candidate.uid)
      if (candidate.role_hint === 'friend' && !afterglowMemoryStore.friendUid.value)
        applyIdentityCandidate('friend', candidate.name, candidate.uid)
    }
    importStatus.value = 'idle'
  }
  catch (error) {
    importStatus.value = 'error'
    importError.value = error instanceof Error ? error.message : String(error)
  }
}

async function startAfterglowImport() {
  if (!canStartImport.value || !importFiles.value?.length)
    return

  stopImportPolling()
  importStatus.value = 'uploading'
  importError.value = ''

  try {
    if (localImportMode.value) {
      const raw = await importFiles.value[0].text()
      const parsed = JSON.parse(raw) as Record<string, unknown>
      const bridged = convertTrainingConversationsToAfterglowQqExport(parsed, {
        selfName: afterglowMemoryStore.selfName.value,
        selfUid: afterglowMemoryStore.selfUid.value,
        friendName: afterglowMemoryStore.friendName.value,
        friendUid: afterglowMemoryStore.friendUid.value,
      })

      if (!bridged) {
        await importChatSessions(parsed, { bootstrapAfterglow: true })
        importStatus.value = 'done'
        localImportHint.value = '训练集 conversations JSON 已作为 AIRI 本地聊天记录导入完成，并已按当前 continuity 配置执行 bootstrap。'
        return
      }

      remoteConfigStatus.value = 'syncing'
      remoteConfigError.value = ''
      const configResult = await createClient().putConfigValues(buildAfterglowConfigValues())
      if (!configResult.ok) {
        const errorSummary = configResult.errors?.map(error => `${error.field}: ${error.message}`).join('；') || 'Afterglow config update failed'
        throw new Error(errorSummary)
      }
      remoteConfigStatus.value = 'ready'

      const bridgedFile = new File(
        [JSON.stringify(bridged.payload, null, 2)],
        buildTrainingBridgeFileName(importFiles.value[0].name),
        { type: 'application/json' },
      )

      uploadedFiles.value = await createClient().uploadImportFiles([bridgedFile])
      importStatus.value = 'starting'
      const task = await createClient().startImport(uploadedFiles.value)
      importTask.value = task
      localImportHint.value = `训练集 conversations JSON 已转换为 Afterglow 可导入格式，共 ${bridged.importedConversationCount} 段对话、${bridged.importedMessageCount} 条消息。`
      await pollImportTask(task.task_id)
      return
    }

    remoteConfigStatus.value = 'syncing'
    remoteConfigError.value = ''
    const configResult = await createClient().putConfigValues(buildAfterglowConfigValues())
    if (!configResult.ok) {
      const errorSummary = configResult.errors?.map(error => `${error.field}: ${error.message}`).join('；') || 'Afterglow config update failed'
      throw new Error(errorSummary)
    }
    remoteConfigStatus.value = 'ready'

    uploadedFiles.value = await createClient().uploadImportFiles(importFiles.value)
    importStatus.value = 'starting'
    const task = await createClient().startImport(uploadedFiles.value)
    importTask.value = task
    await pollImportTask(task.task_id)
  }
  catch (error) {
    if (remoteConfigStatus.value === 'syncing') {
      remoteConfigStatus.value = 'error'
      remoteConfigError.value = error instanceof Error ? error.message : String(error)
    }
    importStatus.value = 'error'
    importError.value = error instanceof Error ? error.message : String(error)
  }
}

function buildAfterglowConfigValues() {
  const values: Record<string, string> = {}
  const putString = (key: string, value: string) => {
    values[key] = value.trim()
  }
  const putBoolean = (key: string, value: boolean) => {
    values[key] = value ? 'true' : 'false'
  }

  putString('SELF_NAME', afterglowMemoryStore.selfName.value)
  putString('SELF_UID', afterglowMemoryStore.selfUid.value)
  putString('FRIEND_NAME', afterglowMemoryStore.friendName.value)
  putString('FRIEND_UID', afterglowMemoryStore.friendUid.value)
  putString('RELATIONSHIP_TYPE', afterglowMemoryStore.relationshipType.value)
  values.RELATIONSHIP_DESCRIPTION = afterglowMemoryStore.relationshipType.value === 'custom'
    ? afterglowMemoryStore.relationshipDescription.value.trim()
    : ''
  putBoolean('AI_GENERATED_LONG_TERM_ENABLED', afterglowMemoryStore.importIncludeAiGenerated.value)
  putString('OPENAI_API_KEY', afterglowMemoryStore.upstreamChatApiKey.value)
  putString('OPENAI_BASE_URL', afterglowMemoryStore.upstreamChatBaseUrl.value)
  putString('CHAT_MODEL', afterglowMemoryStore.upstreamChatModel.value)
  putString('EMBEDDING_API_KEY', afterglowMemoryStore.upstreamEmbeddingApiKey.value)
  putString('EMBEDDING_API_URL', afterglowMemoryStore.upstreamEmbeddingBaseUrl.value)
  putString('EMBEDDING_MODEL', afterglowMemoryStore.upstreamEmbeddingModel.value)
  values.EMBEDDING_DIM = String(afterglowMemoryStore.upstreamEmbeddingDim.value || 4096)

  return values
}
</script>

<template>
  <div :class="['flex flex-col gap-4 pb-4']">
    <div :class="['border-2 border-amber-200/70 rounded-xl bg-linear-to-br from-amber-50/90 to-rose-50/70 p-4 shadow-sm', 'dark:border-amber-900/60 dark:from-amber-950/40 dark:to-rose-950/20']">
      <div :class="['flex flex-col gap-2']">
        <div :class="['text-xl font-medium text-neutral-900 dark:text-neutral-50']">
          {{ t('settings.pages.memory.afterglow.title') }}
        </div>
        <p :class="['text-sm text-neutral-600 dark:text-neutral-300']">
          {{ t('settings.pages.memory.afterglow.description') }}
        </p>
      </div>
    </div>

    <Alert type="warning">
      <template #title>
        {{ t('settings.pages.memory.afterglow.alerts.experimentalTitle') }}
      </template>
      <template #content>
        {{ t('settings.pages.memory.afterglow.alerts.experimentalDescription') }}
      </template>
    </Alert>

    <div :class="['grid grid-cols-1 gap-4 xl:grid-cols-2']">
      <div :class="['rounded-xl border border-neutral-200/70 bg-white/80 p-4 shadow-sm xl:col-span-2', 'dark:border-neutral-800/70 dark:bg-neutral-900/60']">
        <div :class="['mb-4 text-sm font-medium text-neutral-900 dark:text-neutral-100']">
          {{ t('settings.pages.memory.afterglow.importer.title') }}
        </div>
        <div :class="['flex flex-col gap-4']">
          <input
            type="file"
            accept="application/json"
            multiple
            :class="['block w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-700 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-200']"
            @change="event => importFiles = Array.from((event.target as HTMLInputElement).files ?? [])"
          >
          <div v-if="importInspection" :class="['rounded-lg border border-emerald-200/70 bg-emerald-50/80 p-3 text-xs text-neutral-700 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-neutral-200']">
            <div>{{ t('settings.pages.memory.afterglow.importer.detectedFormat', { format: importInspection.format }) }}</div>
            <div>{{ t('settings.pages.memory.afterglow.importer.detectedMessages', { count: importInspection.total_messages }) }}</div>
            <div v-if="importInspection.error">{{ importInspection.error }}</div>
            <div v-if="importInspection.candidates.length" :class="['mt-3 flex flex-col gap-2']">
              <div
                v-for="candidate in importInspection.candidates"
                :key="`${candidate.uid}-${candidate.role_hint}`"
                :class="['flex flex-wrap items-center gap-2 rounded-md border border-neutral-200/70 bg-white/70 px-3 py-2 dark:border-neutral-800/70 dark:bg-neutral-900/50']"
              >
                <span :class="['font-medium']">{{ candidate.name }}</span>
                <span :class="['font-mono text-[11px] text-neutral-500 dark:text-neutral-400']">{{ candidate.uid }}</span>
                <span :class="['text-[11px] text-neutral-500 dark:text-neutral-400']">{{ candidate.role_hint }}</span>
                <Button variant="secondary" size="sm" @click="applyIdentityCandidate('self', candidate.name, candidate.uid)">
                  {{ t('settings.pages.memory.afterglow.importer.useAsSelf') }}
                </Button>
                <Button variant="secondary" size="sm" @click="applyIdentityCandidate('friend', candidate.name, candidate.uid)">
                  {{ t('settings.pages.memory.afterglow.importer.useAsFriend') }}
                </Button>
              </div>
            </div>
          </div>
          <div :class="['flex flex-wrap gap-2']">
            <Button variant="secondary" :disabled="!canInspectImport || importStatus === 'inspecting'" @click="inspectImportFile">
              {{ t('settings.pages.memory.afterglow.actions.inspectImport') }}
            </Button>
            <Button :disabled="!canStartImport || ['uploading', 'starting', 'running'].includes(importStatus)" @click="startAfterglowImport">
              {{ t('settings.pages.memory.afterglow.actions.startImport') }}
            </Button>
          </div>
          <div v-if="importTask" :class="['rounded-lg border border-dashed border-neutral-300/80 bg-neutral-50/70 p-3 text-xs text-neutral-600 dark:border-neutral-800/80 dark:bg-neutral-950/40 dark:text-neutral-300']">
            <div>{{ t('settings.pages.memory.afterglow.importer.taskId', { id: importTask.task_id }) }}</div>
            <div>{{ t('settings.pages.memory.afterglow.importer.taskStatus', { status: importTask.status }) }}</div>
            <div v-if="importTask.message">{{ importTask.message }}</div>
            <div v-if="typeof importTask.progress === 'number'">{{ t('settings.pages.memory.afterglow.importer.taskProgress', { progress: importTask.progress }) }}</div>
          </div>
          <div v-if="importRuntimeHint" :class="['rounded-lg border border-sky-200/70 bg-sky-50/80 p-3 text-xs text-sky-900 dark:border-sky-900/50 dark:bg-sky-950/20 dark:text-sky-100']">
            {{ importRuntimeHint }}
          </div>
          <div v-if="localImportHint" :class="['rounded-lg border border-amber-200/70 bg-amber-50/80 p-3 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-100']">
            {{ localImportHint }}
          </div>
          <div v-if="importError" :class="['text-xs text-red-500']">
            {{ importError }}
          </div>
        </div>
      </div>

      <div :class="['rounded-xl border border-neutral-200/70 bg-white/80 p-4 shadow-sm', 'dark:border-neutral-800/70 dark:bg-neutral-900/60']">
        <div :class="['mb-4 text-sm font-medium text-neutral-900 dark:text-neutral-100']">
          {{ t('settings.pages.memory.afterglow.integration.title') }}
        </div>
        <div :class="['flex flex-col gap-4']">
          <FieldCheckbox
            v-model="afterglowMemoryStore.serviceEnabled.value"
            :label="t('settings.pages.memory.afterglow.integration.fields.serviceEnabled.label')"
            :description="t('settings.pages.memory.afterglow.integration.fields.serviceEnabled.description')"
          />
          <FieldInput
            v-model="afterglowMemoryStore.serviceBaseUrl.value"
            :label="t('settings.pages.memory.afterglow.integration.fields.serviceBaseUrl.label')"
            :description="t('settings.pages.memory.afterglow.integration.fields.serviceBaseUrl.description')"
            placeholder="http://127.0.0.1:8000"
          />
          <FieldInput
            v-model="afterglowMemoryStore.configSetupToken.value"
            type="password"
            label="配置向导 Token"
            description="用于访问 Afterglow 的 /config/* 配置向导接口。它不是最终聊天和调试 API 使用的 XUWEN_API_KEY。"
            placeholder="粘贴后端启动时打印的 setup token"
          />
          <FieldInput
            v-model="afterglowMemoryStore.serviceApiKey.value"
            type="password"
            label="运行时 API Key"
            description="用于访问 Afterglow 的 /v1/*、/memory/*、/debug/* 运行时接口，对应 XUWEN_API_KEY。"
            placeholder="xuwen runtime api key"
          />
          <FieldSelect
            v-model="afterglowMemoryStore.importPlugin.value"
            :items="importPluginOptions"
            :label="t('settings.pages.memory.afterglow.integration.fields.importPlugin.label')"
            :description="t('settings.pages.memory.afterglow.integration.fields.importPlugin.description')"
          />
          <FieldSelect
            v-model="afterglowMemoryStore.upstreamChatProvider.value"
            :items="reusableChatProviderOptions"
            label="复用当前 AIRI 聊天 provider"
            description="选择一个已经在 AIRI 中配置好的聊天 provider，把它的 base URL / API key 复制到 Afterglow 的真实聊天上游配置里。"
          />
          <Button
            variant="secondary"
            :disabled="!afterglowMemoryStore.upstreamChatProvider.value"
            @click="copyUpstreamChatProviderConfig(afterglowMemoryStore.upstreamChatProvider.value)"
          >
            复制选中 provider 配置
          </Button>
          <FieldSelect
            v-model="afterglowMemoryStore.upstreamEmbeddingProvider.value"
            :items="reusableEmbeddingProviderOptions"
            label="复用当前 AIRI 向量 provider"
            description="选择一个已经在 AIRI 中配置好的 embedding provider，把它的 base URL / API key / model / dimensions 尽可能复制到 Afterglow 的向量上游配置里。"
          />
          <Button
            variant="secondary"
            :disabled="!afterglowMemoryStore.upstreamEmbeddingProvider.value"
            @click="copyUpstreamEmbeddingProviderConfig(afterglowMemoryStore.upstreamEmbeddingProvider.value)"
          >
            复制选中 embedding 配置
          </Button>
        </div>
      </div>

      <div :class="['rounded-xl border border-neutral-200/70 bg-white/80 p-4 shadow-sm', 'dark:border-neutral-800/70 dark:bg-neutral-900/60']">
        <div :class="['mb-4 text-sm font-medium text-neutral-900 dark:text-neutral-100']">
          {{ t('settings.pages.memory.afterglow.identity.title') }}
        </div>
        <div :class="['flex flex-col gap-4']">
          <FieldInput
            v-model="afterglowMemoryStore.selfName.value"
            :label="t('settings.pages.memory.afterglow.identity.fields.selfName.label')"
            :description="t('settings.pages.memory.afterglow.identity.fields.selfName.description')"
          />
          <FieldInput
            v-model="afterglowMemoryStore.friendName.value"
            :label="t('settings.pages.memory.afterglow.identity.fields.friendName.label')"
            :description="t('settings.pages.memory.afterglow.identity.fields.friendName.description')"
          />
          <FieldInput
            v-model="afterglowMemoryStore.selfUid.value"
            :label="t('settings.pages.memory.afterglow.identity.fields.selfUid.label')"
            :description="t('settings.pages.memory.afterglow.identity.fields.selfUid.description')"
          />
          <FieldInput
            v-model="afterglowMemoryStore.friendUid.value"
            :label="t('settings.pages.memory.afterglow.identity.fields.friendUid.label')"
            :description="t('settings.pages.memory.afterglow.identity.fields.friendUid.description')"
          />
          <FieldSelect
            v-model="afterglowMemoryStore.relationshipType.value"
            :items="relationshipTypeOptions"
            :label="t('settings.pages.memory.afterglow.identity.fields.relationshipType.label')"
            :description="t('settings.pages.memory.afterglow.identity.fields.relationshipType.description')"
          />
          <FieldInput
            v-if="afterglowMemoryStore.relationshipType.value === 'custom'"
            v-model="afterglowMemoryStore.relationshipDescription.value"
            :label="t('settings.pages.memory.afterglow.identity.fields.relationshipDescription.label')"
            :description="t('settings.pages.memory.afterglow.identity.fields.relationshipDescription.description')"
          />
        </div>
      </div>
    </div>

    <div :class="['grid grid-cols-1 gap-4 xl:grid-cols-2']">
      <div :class="['rounded-xl border border-neutral-200/70 bg-white/80 p-4 shadow-sm', 'dark:border-neutral-800/70 dark:bg-neutral-900/60']">
        <div :class="['mb-4 text-sm font-medium text-neutral-900 dark:text-neutral-100']">
          {{ t('settings.pages.memory.afterglow.retrieval.title') }}
        </div>
        <div :class="['flex flex-col gap-4']">
          <FieldRange
            v-model="afterglowMemoryStore.retrievalTopK.value"
            :min="4"
            :max="24"
            :step="1"
            :format-value="formatRetrievalTopK"
            :label="t('settings.pages.memory.afterglow.retrieval.fields.retrievalTopK.label')"
            :description="t('settings.pages.memory.afterglow.retrieval.fields.retrievalTopK.description')"
          />
          <FieldRange
            v-model="afterglowMemoryStore.responsePairTopK.value"
            :min="2"
            :max="12"
            :step="1"
            :format-value="formatResponsePairTopK"
            :label="t('settings.pages.memory.afterglow.retrieval.fields.responsePairTopK.label')"
            :description="t('settings.pages.memory.afterglow.retrieval.fields.responsePairTopK.description')"
          />
          <FieldCheckbox
            v-model="afterglowMemoryStore.importIncludeAiGenerated.value"
            :label="t('settings.pages.memory.afterglow.retrieval.fields.importIncludeAiGenerated.label')"
            :description="t('settings.pages.memory.afterglow.retrieval.fields.importIncludeAiGenerated.description')"
          />
        </div>
      </div>

      <div :class="['rounded-xl border border-neutral-200/70 bg-white/80 p-4 shadow-sm', 'dark:border-neutral-800/70 dark:bg-neutral-900/60']">
        <div :class="['mb-4 text-sm font-medium text-neutral-900 dark:text-neutral-100']">
          Afterglow 真实上游模型
        </div>
        <div :class="['flex flex-col gap-4']">
          <FieldInput
            v-model="afterglowMemoryStore.upstreamChatBaseUrl.value"
            label="聊天上游 Base URL"
            description="写入真实 Afterglow backend 的 OPENAI_BASE_URL。必须是 OpenAI-compatible 的聊天接口基础地址。"
            placeholder="https://api.openai.com/v1"
          />
          <FieldInput
            v-model="afterglowMemoryStore.upstreamChatApiKey.value"
            type="password"
            label="聊天上游 API Key"
            description="写入真实 Afterglow backend 的 OPENAI_API_KEY。"
            placeholder="sk-..."
          />
          <FieldInput
            v-model="afterglowMemoryStore.upstreamChatModel.value"
            label="聊天上游模型名"
            description="写入真实 Afterglow backend 的 CHAT_MODEL。"
            placeholder="gpt-4o-mini"
          />
          <FieldInput
            v-model="afterglowMemoryStore.upstreamEmbeddingBaseUrl.value"
            label="向量上游 Base URL"
            description="写入真实 Afterglow backend 的 EMBEDDING_API_URL。"
            placeholder="https://dashscope.aliyuncs.com/compatible-mode/v1"
          />
          <FieldInput
            v-model="afterglowMemoryStore.upstreamEmbeddingApiKey.value"
            type="password"
            label="向量上游 API Key"
            description="写入真实 Afterglow backend 的 EMBEDDING_API_KEY。"
            placeholder="sk-..."
          />
          <FieldInput
            v-model="afterglowMemoryStore.upstreamEmbeddingModel.value"
            label="向量模型名"
            description="写入真实 Afterglow backend 的 EMBEDDING_MODEL。"
            placeholder="Qwen3-Embedding-8B"
          />
          <FieldInput
            v-model="afterglowMemoryStore.upstreamEmbeddingDim.value"
            type="number"
            label="向量维度"
            description="写入真实 Afterglow backend 的 EMBEDDING_DIM。默认按 Qwen3-Embedding-8B 使用 4096。"
            placeholder="4096"
          />
        </div>
      </div>

      <div :class="['rounded-xl border border-neutral-200/70 bg-white/80 p-4 shadow-sm', 'dark:border-neutral-800/70 dark:bg-neutral-900/60']">
        <div :class="['mb-4 text-sm font-medium text-neutral-900 dark:text-neutral-100']">
          {{ t('settings.pages.memory.afterglow.continuity.title') }}
        </div>
        <div :class="['flex flex-col gap-4']">
          <FieldCheckbox
            v-model="afterglowContinuityStore.enabled.value"
            :label="t('settings.pages.memory.afterglow.continuity.fields.enabled.label')"
            :description="t('settings.pages.memory.afterglow.continuity.fields.enabled.description')"
          />
          <FieldCheckbox
            v-model="afterglowContinuityStore.allowDelay.value"
            :disabled="!afterglowContinuityStore.enabled.value"
            :label="t('settings.pages.memory.afterglow.continuity.fields.allowDelay.label')"
            :description="t('settings.pages.memory.afterglow.continuity.fields.allowDelay.description')"
          />
          <FieldCheckbox
            v-model="afterglowContinuityStore.allowSilence.value"
            :disabled="!afterglowContinuityStore.enabled.value"
            :label="t('settings.pages.memory.afterglow.continuity.fields.allowSilence.label')"
            :description="t('settings.pages.memory.afterglow.continuity.fields.allowSilence.description')"
          />
          <FieldCheckbox
            v-model="afterglowContinuityStore.bootstrapOnChatImport.value"
            :disabled="!afterglowContinuityStore.enabled.value"
            :label="t('settings.pages.memory.afterglow.continuity.fields.bootstrapOnChatImport.label')"
            :description="t('settings.pages.memory.afterglow.continuity.fields.bootstrapOnChatImport.description')"
          />
          <FieldCheckbox
            v-model="afterglowContinuityStore.includeAssistantMessages.value"
            :disabled="!afterglowContinuityStore.enabled.value"
            :label="t('settings.pages.memory.afterglow.continuity.fields.includeAssistantMessages.label')"
            :description="t('settings.pages.memory.afterglow.continuity.fields.includeAssistantMessages.description')"
          />
          <FieldRange
            v-model="afterglowContinuityStore.bootstrapRecentMessages.value"
            :min="2"
            :max="12"
            :step="1"
            :label="t('settings.pages.memory.afterglow.continuity.fields.bootstrapRecentMessages.label')"
            :description="t('settings.pages.memory.afterglow.continuity.fields.bootstrapRecentMessages.description')"
            :format-value="value => t('settings.pages.memory.afterglow.continuity.fields.bootstrapRecentMessages.value', { count: value })"
          />
        </div>
      </div>
    </div>

    <div :class="['rounded-xl border border-dashed border-neutral-300/80 bg-neutral-50/70 p-4 text-sm text-neutral-600 shadow-sm', 'dark:border-neutral-800/80 dark:bg-neutral-950/40 dark:text-neutral-300']">
      <div :class="['font-medium text-neutral-900 dark:text-neutral-100']">
        {{ t('settings.pages.memory.afterglow.status.title') }}
      </div>
      <div :class="['mt-2 flex flex-col gap-1']">
        <span>运行时 API：{{ serviceConnectionStatus === 'ready' ? t('settings.pages.memory.afterglow.status.ready') : t('settings.pages.memory.afterglow.status.incomplete') }}</span>
        <span>{{ t('settings.pages.memory.afterglow.status.identity', { status: afterglowMemoryStore.importIdentityReady.value ? t('settings.pages.memory.afterglow.status.ready') : t('settings.pages.memory.afterglow.status.incomplete') }) }}</span>
        <span>配置向导：{{ configConnectionReady ? t('settings.pages.memory.afterglow.status.ready') : t('settings.pages.memory.afterglow.status.incomplete') }}</span>
        <span>{{ t('settings.pages.memory.afterglow.status.remoteConfig', { status: t(`settings.pages.memory.afterglow.status.${remotePersonaStatus}`) }) }}</span>
        <span>{{ t('settings.pages.memory.afterglow.status.chatProvider', { provider: consciousnessStore.activeProvider || t('settings.pages.memory.afterglow.status.notSelected') }) }}</span>
        <span>{{ t('settings.pages.memory.afterglow.status.chatModel', { model: activeChatModel }) }}</span>
      </div>
      <div :class="['mt-3']">
        <Button variant="secondary" @click="checkAfterglowService">
          {{ t('settings.pages.memory.afterglow.actions.checkService') }}
        </Button>
        <RouterLink
          to="/settings/modules/consciousness"
          :class="['inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-700 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800']"
        >
          <span>{{ t('settings.pages.memory.afterglow.actions.openChatProvider') }}</span>
        </RouterLink>
        <Button variant="secondary" @click="resetAfterglowMemorySettings">
          {{ t('settings.pages.memory.afterglow.actions.reset') }}
        </Button>
      </div>
      <div v-if="serviceStatus === 'error'" :class="['mt-3 text-xs text-red-500']">
        {{ serviceError }}
      </div>
      <div v-if="remoteConfigError" :class="['mt-2 text-xs text-red-500']">
        {{ remoteConfigError }}
      </div>
      <div v-if="serviceStatus === 'ready' && remoteInfo && remoteMemoryStats" :class="['mt-3 grid grid-cols-1 gap-2 text-xs text-neutral-600 dark:text-neutral-300 md:grid-cols-2']">
        <div>{{ t('settings.pages.memory.afterglow.status.remoteChatModel', { model: remoteInfo.chat_model }) }}</div>
        <div>{{ t('settings.pages.memory.afterglow.status.remoteEmbeddingModel', { model: remoteInfo.embedding_model }) }}</div>
        <div>{{ t('settings.pages.memory.afterglow.status.personaReady', { status: remoteInfo.has_persona_card ? t('settings.pages.memory.afterglow.status.ready') : t('settings.pages.memory.afterglow.status.incomplete') }) }}</div>
        <div>{{ t('settings.pages.memory.afterglow.status.friendMessages', { count: remoteMemoryStats.friend_messages }) }}</div>
        <div>{{ t('settings.pages.memory.afterglow.status.responsePairs', { count: remoteMemoryStats.response_pairs }) }}</div>
        <div>{{ t('settings.pages.memory.afterglow.status.relationshipMemories', { count: remoteMemoryStats.relationship_memories }) }}</div>
        <div>{{ t('settings.pages.memory.afterglow.status.configWizard', { status: t(`settings.pages.memory.afterglow.status.${configWizardStatus}`) }) }}</div>
        <div>{{ t('settings.pages.memory.afterglow.status.chatRoutingHint') }}</div>
        <div>{{ t(chatProviderReady ? 'settings.pages.memory.afterglow.status.chatProviderActive' : 'settings.pages.memory.afterglow.status.chatProviderInactive') }}</div>
      </div>
    </div>

    <div :class="['rounded-xl border border-neutral-200/70 bg-white/80 p-4 shadow-sm', 'dark:border-neutral-800/70 dark:bg-neutral-900/60']">
      <div :class="['mb-4 text-sm font-medium text-neutral-900 dark:text-neutral-100']">
        Afterglow 验收观测
      </div>
      <div :class="['flex flex-col gap-4']">
        <div :class="['text-xs text-neutral-500 dark:text-neutral-400']">
          这里只展示开发验收需要的检索命中、模型调用链和 writeback 统计，不会出现在正常聊天区。
        </div>

        <div :class="['flex flex-wrap gap-2']">
          <Button variant="secondary" :disabled="serviceStatus !== 'ready'" @click="checkAfterglowService">
            刷新调试统计
          </Button>
        </div>

        <div v-if="debugStatsError" :class="['text-xs text-amber-600 dark:text-amber-300']">
          调试统计读取失败：{{ debugStatsError }}
        </div>

        <div v-if="debugStats" :class="['grid grid-cols-1 gap-2 text-xs text-neutral-600 dark:text-neutral-300 md:grid-cols-2']">
          <div>writeback 写入：{{ debugStats.writeback?.written ?? 0 }}</div>
          <div>writeback 排队：{{ debugStats.writeback?.enqueued ?? 0 }}</div>
          <div>writeback 暂停：{{ debugStats.writeback?.paused ? '是' : '否' }}</div>
          <div>模型调用链条数：{{ debugStats.model_chain.length }}</div>
        </div>

        <div :class="['rounded-lg border border-neutral-200/70 bg-neutral-50/70 p-3 dark:border-neutral-800/70 dark:bg-neutral-950/40']">
          <div :class="['mb-3 text-xs font-medium text-neutral-800 dark:text-neutral-100']">
            手动检索调试
          </div>
          <div :class="['flex flex-col gap-3']">
            <FieldInput
              v-model="retrievalDebugQuery"
              label="检索测试短句"
              description="先输入准备在首页发送的真实短句，观察 Afterglow 会命中哪些 response pairs / friend examples / dialogue windows。"
              placeholder="比如：啵啵爱你"
            />
            <div :class="['flex flex-wrap gap-2']">
              <Button
                variant="secondary"
                :disabled="serviceStatus !== 'ready' || !retrievalDebugQuery.trim() || retrievalDebugStatus === 'searching'"
                @click="searchAfterglowMemory"
              >
                {{ retrievalDebugStatus === 'searching' ? '检索中…' : '执行检索调试' }}
              </Button>
            </div>
            <div v-if="retrievalDebugError" :class="['text-xs text-red-500']">
              {{ retrievalDebugError }}
            </div>
            <div v-if="retrievalDebugResult" :class="['grid grid-cols-1 gap-2 text-xs text-neutral-600 dark:text-neutral-300 md:grid-cols-2']">
              <div>fused：{{ retrievalDebugResult.fused.length }}</div>
              <div>response pairs：{{ retrievalDebugResult.response_pairs.length }}</div>
              <div>friend examples：{{ retrievalDebugResult.friend_examples.length }}</div>
              <div>dialogue windows：{{ retrievalDebugResult.dialogue_windows.length }}</div>
              <div>recent live：{{ retrievalDebugResult.recent_live.length }}</div>
              <div>trace id：{{ retrievalDebugResult.trace_id || '无' }}</div>
            </div>
            <div
              v-if="retrievalDebugResult?.fused.length"
              :class="['flex flex-col gap-2 rounded-lg border border-neutral-200/70 bg-white/80 p-3 dark:border-neutral-800/70 dark:bg-neutral-900/50']"
            >
              <div :class="['text-xs font-medium text-neutral-800 dark:text-neutral-100']">
                融合命中预览
              </div>
              <div
                v-for="(hit, index) in retrievalDebugResult.fused.slice(0, 6)"
                :key="`${hit.id || hit.text || index}`"
                :class="['rounded-md border border-neutral-200/70 bg-neutral-50/80 px-3 py-2 dark:border-neutral-800/70 dark:bg-neutral-950/40']"
              >
                <div :class="['font-medium text-neutral-700 dark:text-neutral-100']">
                  {{ hit.source || 'unknown source' }} · score {{ typeof hit.score === 'number' ? hit.score.toFixed(3) : 'n/a' }}
                </div>
                <div :class="['mt-1 text-neutral-600 dark:text-neutral-300']">
                  {{ hit.text || '无文本预览' }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div
          v-if="latestModelCalls.length"
          :class="['rounded-lg border border-neutral-200/70 bg-neutral-50/70 p-3 dark:border-neutral-800/70 dark:bg-neutral-950/40']"
        >
          <div :class="['mb-3 text-xs font-medium text-neutral-800 dark:text-neutral-100']">
            最近模型调用链
          </div>
          <div :class="['flex flex-col gap-2']">
            <div
              v-for="call in latestModelCalls"
              :key="`${call.ts_ms}-${call.stage}-${call.attempt}`"
              :class="['rounded-md border border-neutral-200/70 bg-white/80 px-3 py-2 text-xs dark:border-neutral-800/70 dark:bg-neutral-900/50']"
            >
              <div :class="['font-medium text-neutral-700 dark:text-neutral-100']">
                {{ call.stage }} · {{ call.model }} · {{ call.status }}
              </div>
              <div :class="['mt-1 text-neutral-600 dark:text-neutral-300']">
                {{ call.stream ? 'stream' : 'non-stream' }} · {{ Math.round(call.latency_ms) }}ms · HTTP {{ call.status_code ?? 'n/a' }}
              </div>
              <div v-if="call.request" :class="['mt-1 text-neutral-500 dark:text-neutral-400 break-all']">
                请求摘要：{{ JSON.stringify(call.request) }}
              </div>
              <div v-if="call.response" :class="['mt-1 text-neutral-500 dark:text-neutral-400 break-all']">
                响应摘要：{{ JSON.stringify(call.response) }}
              </div>
              <div v-if="call.error" :class="['mt-1 text-red-500']">
                {{ call.error }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<route lang="yaml">
meta:
  layout: settings
  titleKey: settings.pages.memory.title
  subtitleKey: settings.title
  descriptionKey: settings.pages.memory.description
  icon: i-solar:leaf-bold-duotone
  settingsEntry: true
  order: 5
  stageTransition:
    name: slide
</route>
