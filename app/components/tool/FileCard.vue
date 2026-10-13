<script setup lang="ts">
import type { QueueItem } from '~/composables/useFileQueue'
import { formatBytes } from '~/lib/format'

/** Tarjeta del archivo elegido (herramientas de un solo PDF), con botón para cambiarlo. */
const props = withDefaults(defineProps<{ item: QueueItem; showStatus?: boolean }>(), { showStatus: true })
const emit = defineEmits<{ change: [files: File[]] }>()
const { t, locale } = useI18n()
const { statusMessage } = useErrorMessage()
</script>

<template>
  <div class="space-y-3">
    <div class="card flex flex-wrap items-center gap-4 p-4" data-testid="file-item">
      <div class="grid h-20 w-16 shrink-0 place-items-center overflow-hidden rounded-lg bg-sunken">
        <img
          v-if="props.item.thumbUrl"
          :src="props.item.thumbUrl"
          :alt="t('common.thumbAlt', { name: props.item.name })"
          class="max-h-full max-w-full bg-white object-contain"
        />
        <UiAppIcon
          v-else
          :name="props.item.status === 'password' ? 'protect' : 'file'"
          class="size-8 text-royal-300"
          :class="props.item.status === 'checking' ? 'animate-pulse' : ''"
        />
      </div>
      <div class="min-w-0 flex-1 basis-40">
        <p class="truncate font-semibold" :title="props.item.name">{{ props.item.name }}</p>
        <p class="text-sm text-muted">
          {{ formatBytes(props.item.size, locale) }}
          <template v-if="props.item.status === 'checking'"> · {{ t('common.checking') }}</template>
          <template v-else-if="props.item.pageCount"> · {{ t('common.pages', props.item.pageCount) }}</template>
        </p>
        <p v-if="props.item.large" class="mt-1 text-xs font-medium text-warning">
          {{ t('common.largeFile', { size: formatBytes(props.item.size, locale) }) }}
        </p>
      </div>
      <ToolAddFilesButton
        class="max-sm:w-full"
        :label="t('common.changeFile')"
        icon="refresh"
        @files="emit('change', $event)"
      />
    </div>

    <ToolAlertBox v-if="props.showStatus && statusMessage(props.item.status)" tone="error" data-testid="file-error">
      {{ statusMessage(props.item.status) }}
    </ToolAlertBox>
  </div>
</template>
