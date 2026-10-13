<script setup lang="ts">
import type { ToolOutput } from '~/composables/useToolRun'
import { formatBytes } from '~/lib/format'

/** Pantalla final: botón de descarga con nombre descriptivo y "Procesar otro". */
const props = defineProps<{
  title: string
  output: ToolOutput
}>()
defineEmits<{ reset: [] }>()
const { t, locale } = useI18n()

const url = ref<string | null>(null)
const heading = ref<HTMLElement | null>(null)
const isZip = computed(() => props.output.fileName.toLowerCase().endsWith('.zip'))
/** Porcentaje ahorrado al comprimir (redondeado hacia abajo para no exagerar). */
const savedPercent = computed(() => {
  const stats = props.output.stats
  if (!stats || stats.before <= 0) return 0
  return Math.max(0, Math.floor((1 - stats.after / stats.before) * 100))
})

watchEffect((onCleanup) => {
  const objectUrl = URL.createObjectURL(props.output.blob)
  url.value = objectUrl
  onCleanup(() => URL.revokeObjectURL(objectUrl))
})

const panel = ref<HTMLElement | null>(null)
// Lleva el panel a la vista (sin quedar bajo la cabecera fija) y mueve el foco
// al título para que los lectores de pantalla anuncien el cambio.
onMounted(() => {
  panel.value?.scrollIntoView({ block: 'start' })
  heading.value?.focus({ preventScroll: true })
})
</script>

<template>
  <div ref="panel" class="card mx-auto max-w-xl scroll-mt-24 p-8 text-center" data-testid="result-panel">
    <span class="mx-auto grid size-16 place-items-center rounded-full bg-success-soft text-success">
      <UiAppIcon name="checkCircle" class="size-9" />
    </span>
    <h2 ref="heading" tabindex="-1" class="mt-5 font-display text-2xl font-semibold outline-none sm:text-3xl">
      {{ props.title }}
    </h2>

    <div class="mt-6 flex items-center gap-3 rounded-2xl border border-line bg-sunken/60 p-4 text-left">
      <UiAppIcon :name="isZip ? 'archive' : 'file'" class="size-8 shrink-0 text-royal-600 dark:text-royal-300" />
      <div class="min-w-0">
        <p class="truncate font-semibold" data-testid="result-name">{{ props.output.fileName }}</p>
        <p class="text-sm text-muted">
          {{ formatBytes(props.output.blob.size, locale) }}
          <template v-if="props.output.detail"> · {{ props.output.detail }}</template>
        </p>
      </div>
    </div>

    <!-- Solo al comprimir: comparación de tamaños -->
    <div v-if="props.output.stats" class="mt-4 rounded-2xl border border-line p-4 text-left" data-testid="compress-stats">
      <dl class="grid grid-cols-3 gap-2 text-center">
        <div>
          <dt class="text-xs font-semibold uppercase tracking-wide text-muted">{{ t('common.sizeBefore') }}</dt>
          <dd class="mt-0.5 font-semibold tabular-nums" data-testid="size-before">
            {{ formatBytes(props.output.stats.before, locale) }}
          </dd>
        </div>
        <div>
          <dt class="text-xs font-semibold uppercase tracking-wide text-muted">{{ t('common.sizeAfter') }}</dt>
          <dd class="mt-0.5 font-semibold tabular-nums" data-testid="size-after">
            {{ formatBytes(props.output.stats.after, locale) }}
          </dd>
        </div>
        <div>
          <dt class="text-xs font-semibold uppercase tracking-wide text-muted">{{ t('common.sizeSaved') }}</dt>
          <dd class="mt-0.5 text-lg font-bold tabular-nums text-success" data-testid="size-saved">
            {{ t('common.percent', { n: savedPercent }) }}
          </dd>
        </div>
      </dl>
      <div class="mt-3 h-2.5 overflow-hidden rounded-full bg-sunken" aria-hidden="true">
        <div
          class="h-full rounded-full bg-linear-to-r from-royal-600 to-gold-400"
          :style="{ width: `${Math.max(2, 100 - savedPercent)}%` }"
        />
      </div>
    </div>

    <div class="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
      <a
        v-if="url"
        :href="url"
        :download="props.output.fileName"
        class="btn-primary btn-lg"
        data-testid="download"
      >
        <UiAppIcon name="download" class="size-5" />
        {{ t('common.download') }}
      </a>
      <button type="button" class="btn-secondary btn-lg" data-testid="process-another" @click="$emit('reset')">
        <UiAppIcon name="refresh" class="size-5" />
        {{ t('common.processAnother') }}
      </button>
    </div>

    <p class="mt-6 inline-flex items-center gap-2 text-sm text-success">
      <UiAppIcon name="shield" class="size-4" />
      {{ t('common.doneHint') }}
    </p>
  </div>
</template>
