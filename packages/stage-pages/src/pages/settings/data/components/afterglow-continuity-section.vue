<script setup lang="ts">
import { Alert } from '@proj-airi/stage-ui/components'
import { useAfterglowContinuityStore } from '@proj-airi/stage-ui/stores/modules'
import { useConsciousnessStore } from '@proj-airi/stage-ui/stores/modules/consciousness'
import { Button, FieldCheckbox, FieldRange } from '@proj-airi/ui'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'

const { t } = useI18n()

const continuityStore = useAfterglowContinuityStore()
const consciousnessStore = useConsciousnessStore()
const isBrowserRuntime = typeof window !== 'undefined'

const afterglowBaseUrl = computed(() => {
  const value = import.meta.env.AFTERGLOW_BASE_URL
  return typeof value === 'string' && value.trim()
    ? value.trim()
    : 'https://api.deepseek.com/'
})

const afterglowModel = computed(() => {
  const value = import.meta.env.AFTERGLOW_MODEL
  return typeof value === 'string' && value.trim()
    ? value.trim()
    : 'deepseek-v4-flash'
})

const currentProviderSummary = computed(() => {
  if (consciousnessStore.activeProvider !== 'afterglow') {
    return t('settings.pages.data.sections.afterglow.runtime.providerInactive')
  }

  return consciousnessStore.activeModel || afterglowModel.value
})

const localConfigStatus = computed<'active' | 'browser-hidden' | 'inactive'>(() => {
  if (consciousnessStore.activeProvider === 'afterglow') {
    return 'active'
  }

  if (isBrowserRuntime) {
    return 'browser-hidden'
  }

  return 'inactive'
})

function resetContinuitySettings() {
  continuityStore.resetState()
}

function formatRecentMessages(value: number) {
  return t('settings.pages.data.sections.afterglow.fields.bootstrapRecentMessages.value', { count: value })
}
</script>

<template>
  <div :class="['border-2 border-emerald-200/70 rounded-xl bg-linear-to-br from-emerald-50/90 to-cyan-50/70 p-4 shadow-sm', 'dark:border-emerald-900/60 dark:from-emerald-950/40 dark:to-cyan-950/20']">
    <div :class="['flex flex-col gap-4']">
      <div :class="['grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_320px]']">
        <div :class="['flex flex-col gap-1']">
          <div :class="['text-lg font-medium text-neutral-900 dark:text-neutral-50']">
            {{ t('settings.pages.data.sections.afterglow.title') }}
          </div>
          <p :class="['text-sm text-neutral-600 dark:text-neutral-300']">
            {{ t('settings.pages.data.sections.afterglow.description') }}
          </p>
        </div>

        <div :class="['grid grid-cols-1 gap-2 rounded-xl border border-white/70 bg-white/80 p-3 text-sm shadow-sm', 'dark:border-white/10 dark:bg-black/20']">
          <div :class="['flex items-center justify-between gap-3']">
            <span :class="['text-neutral-500 dark:text-neutral-400']">{{ t('settings.pages.data.sections.afterglow.runtime.configSource') }}</span>
            <span
              :class="[
                'rounded-full px-2 py-0.5 text-xs font-medium',
                localConfigStatus === 'active'
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                  : localConfigStatus === 'browser-hidden'
                    ? 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300'
                    : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
              ]"
            >
              {{
                localConfigStatus === 'active'
                  ? t('settings.pages.data.sections.afterglow.runtime.localConfigured')
                  : localConfigStatus === 'browser-hidden'
                    ? t('settings.pages.data.sections.afterglow.runtime.browserHiddenConfig')
                    : t('settings.pages.data.sections.afterglow.runtime.inactiveConfig')
              }}
            </span>
          </div>
          <div :class="['flex items-center justify-between gap-3']">
            <span :class="['text-neutral-500 dark:text-neutral-400']">{{ t('settings.pages.data.sections.afterglow.runtime.providerModel') }}</span>
            <span :class="['font-mono text-xs text-neutral-700 dark:text-neutral-200']">{{ currentProviderSummary }}</span>
          </div>
          <div :class="['flex items-center justify-between gap-3']">
            <span :class="['text-neutral-500 dark:text-neutral-400']">{{ t('settings.pages.data.sections.afterglow.runtime.baseUrl') }}</span>
            <span :class="['max-w-[180px] truncate font-mono text-xs text-neutral-700 dark:text-neutral-200']">{{ afterglowBaseUrl }}</span>
          </div>
          <div :class="['flex items-center justify-between gap-3']">
            <span :class="['text-neutral-500 dark:text-neutral-400']">{{ t('settings.pages.data.sections.afterglow.runtime.defaultModel') }}</span>
            <span :class="['font-mono text-xs text-neutral-700 dark:text-neutral-200']">{{ afterglowModel }}</span>
          </div>
        </div>
      </div>

      <Alert v-if="localConfigStatus === 'browser-hidden'" type="info">
        <template #title>
          {{ t('settings.pages.data.sections.afterglow.alerts.browserRuntimeTitle') }}
        </template>
        <template #content>
          {{ t('settings.pages.data.sections.afterglow.alerts.browserRuntimeDescription') }}
        </template>
      </Alert>

      <Alert v-else-if="localConfigStatus === 'active'" type="info">
        <template #title>
          {{ t('settings.pages.data.sections.afterglow.alerts.localConfigTitle') }}
        </template>
        <template #content>
          {{ t('settings.pages.data.sections.afterglow.alerts.localConfigDescription') }}
        </template>
      </Alert>

      <Alert v-else type="warning">
        <template #title>
          {{ t('settings.pages.data.sections.afterglow.alerts.inactiveTitle') }}
        </template>
        <template #content>
          {{ t('settings.pages.data.sections.afterglow.alerts.inactiveDescription') }}
        </template>
      </Alert>

      <div :class="['grid grid-cols-1 gap-4 xl:grid-cols-2']">
        <div :class="['rounded-xl border border-white/70 bg-white/80 p-4 shadow-sm', 'dark:border-white/10 dark:bg-black/20']">
          <div :class="['mb-4 text-sm font-medium text-neutral-900 dark:text-neutral-100']">
            {{ t('settings.pages.data.sections.afterglow.groups.behavior') }}
          </div>
          <div :class="['flex flex-col gap-4']">
            <FieldCheckbox
              v-model="continuityStore.enabled.value"
              :label="t('settings.pages.data.sections.afterglow.fields.enabled.label')"
              :description="t('settings.pages.data.sections.afterglow.fields.enabled.description')"
            />
            <FieldCheckbox
              v-model="continuityStore.allowDelay.value"
              :disabled="!continuityStore.enabled.value"
              :label="t('settings.pages.data.sections.afterglow.fields.allowDelay.label')"
              :description="t('settings.pages.data.sections.afterglow.fields.allowDelay.description')"
            />
            <FieldCheckbox
              v-model="continuityStore.allowSilence.value"
              :disabled="!continuityStore.enabled.value"
              :label="t('settings.pages.data.sections.afterglow.fields.allowSilence.label')"
              :description="t('settings.pages.data.sections.afterglow.fields.allowSilence.description')"
            />
          </div>
        </div>

        <div :class="['rounded-xl border border-white/70 bg-white/80 p-4 shadow-sm', 'dark:border-white/10 dark:bg-black/20']">
          <div :class="['mb-4 text-sm font-medium text-neutral-900 dark:text-neutral-100']">
            {{ t('settings.pages.data.sections.afterglow.groups.memorySources') }}
          </div>
          <div :class="['flex flex-col gap-4']">
            <FieldCheckbox
              v-model="continuityStore.bootstrapOnChatImport.value"
              :disabled="!continuityStore.enabled.value"
              :label="t('settings.pages.data.sections.afterglow.fields.bootstrapOnChatImport.label')"
              :description="t('settings.pages.data.sections.afterglow.fields.bootstrapOnChatImport.description')"
            />
            <FieldCheckbox
              v-model="continuityStore.includeAssistantMessages.value"
              :disabled="!continuityStore.enabled.value"
              :label="t('settings.pages.data.sections.afterglow.fields.includeAssistantMessages.label')"
              :description="t('settings.pages.data.sections.afterglow.fields.includeAssistantMessages.description')"
            />
            <FieldRange
              v-model="continuityStore.bootstrapRecentMessages.value"
              :min="2"
              :max="12"
              :step="1"
              :format-value="formatRecentMessages"
              :label="t('settings.pages.data.sections.afterglow.fields.bootstrapRecentMessages.label')"
              :description="t('settings.pages.data.sections.afterglow.fields.bootstrapRecentMessages.description')"
            />
            <div :class="['rounded-lg border border-dashed border-neutral-200/80 bg-neutral-50/70 px-3 py-2 text-xs text-neutral-500 dark:border-neutral-800/70 dark:bg-neutral-900/40 dark:text-neutral-400']">
              {{ t('settings.pages.data.sections.afterglow.fields.bootstrapRecentMessages.hint', { count: continuityStore.normalizedBootstrapRecentMessages.value }) }}
            </div>
          </div>
        </div>
      </div>

      <div :class="['flex flex-wrap items-center gap-2']">
        <RouterLink
          to="/settings/modules/consciousness"
          :class="['inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-700 transition-colors hover:border-emerald-300 hover:text-emerald-700 dark:border-neutral-800 dark:bg-neutral-900/70 dark:text-neutral-200 dark:hover:border-emerald-800 dark:hover:text-emerald-300']"
        >
          <div i-solar:chat-round-line-duotone class="text-base" />
          <span>{{ t('settings.pages.data.sections.afterglow.actions.openConsciousness') }}</span>
        </RouterLink>

        <RouterLink
          to="/settings/providers"
          :class="['inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-700 transition-colors hover:border-cyan-300 hover:text-cyan-700 dark:border-neutral-800 dark:bg-neutral-900/70 dark:text-neutral-200 dark:hover:border-cyan-800 dark:hover:text-cyan-300']"
        >
          <div i-solar:key-minimalistic-square-line-duotone class="text-base" />
          <span>{{ t('settings.pages.data.sections.afterglow.actions.openProviders') }}</span>
        </RouterLink>

        <Button variant="secondary" @click="resetContinuitySettings">
          {{ t('settings.pages.data.sections.afterglow.actions.reset') }}
        </Button>
      </div>
    </div>
  </div>
</template>
