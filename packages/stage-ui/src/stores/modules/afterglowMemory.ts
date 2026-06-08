import { useLocalStorageManualReset } from '@proj-airi/stage-shared/composables'
import { computed } from 'vue'

/**
 * Local integration settings for connecting AIRI to an external Afterglow
 * memory backend.
 *
 * Use when:
 * - AIRI should import real chat history into an external Afterglow service
 * - Memory and persona retrieval should be configured from the Memory page
 *
 * Expects:
 * - Sensitive credentials remain local-only
 * - AIRI acts as the UI/runtime shell while Afterglow provides the memory core
 *
 * Returns:
 * - Persistent local configuration for service connectivity and retrieval policy
 */
export function useAfterglowMemoryStore() {
  const serviceEnabled = useLocalStorageManualReset<boolean>('settings/afterglow-memory/service-enabled', false)
  const serviceBaseUrl = useLocalStorageManualReset<string>('settings/afterglow-memory/service-base-url', 'http://127.0.0.1:8000/')
  const serviceApiKey = useLocalStorageManualReset<string>('settings/afterglow-memory/service-api-key', '')
  const configSetupToken = useLocalStorageManualReset<string>('settings/afterglow-memory/config-setup-token', '')
  const relationshipType = useLocalStorageManualReset<'friend' | 'lover' | 'family' | 'colleague' | 'custom'>('settings/afterglow-memory/relationship-type', 'lover')
  const relationshipDescription = useLocalStorageManualReset<string>('settings/afterglow-memory/relationship-description', '')
  const selfName = useLocalStorageManualReset<string>('settings/afterglow-memory/self-name', '')
  const friendName = useLocalStorageManualReset<string>('settings/afterglow-memory/friend-name', '')
  const selfUid = useLocalStorageManualReset<string>('settings/afterglow-memory/self-uid', '')
  const friendUid = useLocalStorageManualReset<string>('settings/afterglow-memory/friend-uid', '')
  const importPlugin = useLocalStorageManualReset<'auto' | 'wechat_weflow' | 'qqexporter_v5'>('settings/afterglow-memory/import-plugin', 'auto')
  const retrievalTopK = useLocalStorageManualReset<number>('settings/afterglow-memory/retrieval-top-k', 12)
  const responsePairTopK = useLocalStorageManualReset<number>('settings/afterglow-memory/response-pair-top-k', 6)
  const importIncludeAiGenerated = useLocalStorageManualReset<boolean>('settings/afterglow-memory/import-include-ai-generated', false)
  const upstreamChatProvider = useLocalStorageManualReset<string>('settings/afterglow-memory/upstream-chat-provider', '')
  const upstreamEmbeddingProvider = useLocalStorageManualReset<string>('settings/afterglow-memory/upstream-embedding-provider', '')
  const upstreamChatBaseUrl = useLocalStorageManualReset<string>('settings/afterglow-memory/upstream-chat-base-url', '')
  const upstreamChatApiKey = useLocalStorageManualReset<string>('settings/afterglow-memory/upstream-chat-api-key', '')
  const upstreamChatModel = useLocalStorageManualReset<string>('settings/afterglow-memory/upstream-chat-model', '')
  const upstreamEmbeddingBaseUrl = useLocalStorageManualReset<string>('settings/afterglow-memory/upstream-embedding-base-url', '')
  const upstreamEmbeddingApiKey = useLocalStorageManualReset<string>('settings/afterglow-memory/upstream-embedding-api-key', '')
  const upstreamEmbeddingModel = useLocalStorageManualReset<string>('settings/afterglow-memory/upstream-embedding-model', '')
  const upstreamEmbeddingDim = useLocalStorageManualReset<number>('settings/afterglow-memory/upstream-embedding-dim', 4096)

  const normalizedServiceBaseUrl = computed(() => serviceBaseUrl.value.trim())
  const normalizedRetrievalTopK = computed(() => Math.min(24, Math.max(4, Math.round(retrievalTopK.value))))
  const normalizedResponsePairTopK = computed(() => Math.min(12, Math.max(2, Math.round(responsePairTopK.value))))
  const connectionReady = computed(() =>
    serviceEnabled.value
    && normalizedServiceBaseUrl.value.length > 0
    && serviceApiKey.value.trim().length > 0,
  )
  const importIdentityReady = computed(() =>
    selfName.value.trim().length > 0
    && friendName.value.trim().length > 0
    && selfUid.value.trim().length > 0
    && friendUid.value.trim().length > 0,
  )

  function resetState() {
    serviceEnabled.reset()
    serviceBaseUrl.reset()
    serviceApiKey.reset()
    configSetupToken.reset()
    relationshipType.reset()
    relationshipDescription.reset()
    selfName.reset()
    friendName.reset()
    selfUid.reset()
    friendUid.reset()
    importPlugin.reset()
    retrievalTopK.reset()
    responsePairTopK.reset()
    importIncludeAiGenerated.reset()
    upstreamChatProvider.reset()
    upstreamEmbeddingProvider.reset()
    upstreamChatBaseUrl.reset()
    upstreamChatApiKey.reset()
    upstreamChatModel.reset()
    upstreamEmbeddingBaseUrl.reset()
    upstreamEmbeddingApiKey.reset()
    upstreamEmbeddingModel.reset()
    upstreamEmbeddingDim.reset()
  }

  return {
    serviceEnabled,
    serviceBaseUrl,
    normalizedServiceBaseUrl,
    serviceApiKey,
    configSetupToken,
    relationshipType,
    relationshipDescription,
    selfName,
    friendName,
    selfUid,
    friendUid,
    importPlugin,
    retrievalTopK,
    normalizedRetrievalTopK,
    responsePairTopK,
    normalizedResponsePairTopK,
    importIncludeAiGenerated,
    upstreamChatProvider,
    upstreamEmbeddingProvider,
    upstreamChatBaseUrl,
    upstreamChatApiKey,
    upstreamChatModel,
    upstreamEmbeddingBaseUrl,
    upstreamEmbeddingApiKey,
    upstreamEmbeddingModel,
    upstreamEmbeddingDim,
    connectionReady,
    importIdentityReady,
    resetState,
  }
}
