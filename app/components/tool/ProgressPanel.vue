<script setup lang="ts">
/** Panel de "procesando" con barra de progreso accesible y botón para cancelar. */
const props = defineProps<{
  label: string
  /** De 0 a 1. */
  progress: number
}>()
defineEmits<{ cancel: [] }>()
const { t } = useI18n()

const percent = computed(() => Math.round(props.progress * 100))
const heading = ref<HTMLElement | null>(null)
const panel = ref<HTMLElement | null>(null)
// Lleva el panel a la vista (sin quedar bajo la cabecera fija) y mueve el foco
// al título para que los lectores de pantalla anuncien el cambio.
onMounted(() => {
  panel.value?.scrollIntoView({ block: 'start' })
  heading.value?.focus({ preventScroll: true })
})
</script>

<template>
  <div ref="panel" class="card mx-auto max-w-xl scroll-mt-24 p-8 text-center" data-testid="progress-panel">
    <LayoutBrandMark class="mx-auto size-14 animate-pulse" />
    <h2 ref="heading" tabindex="-1" class="mt-5 font-display text-2xl font-semibold outline-none">
      {{ props.label }}
    </h2>
    <div
      class="mt-6 h-3 overflow-hidden rounded-full bg-sunken"
      role="progressbar"
      :aria-label="t('common.progressLabel')"
      aria-valuemin="0"
      aria-valuemax="100"
      :aria-valuenow="percent"
    >
      <div
        class="h-full rounded-full bg-linear-to-r from-royal-600 to-gold-400 transition-[width] duration-300"
        :style="{ width: `${Math.max(percent, 3)}%` }"
      />
    </div>
    <p class="mt-3 text-sm font-semibold tabular-nums text-muted" aria-hidden="true">
      {{ t('common.percent', { n: percent }) }}
    </p>
    <button type="button" class="btn-ghost mt-4" @click="$emit('cancel')">{{ t('common.cancel') }}</button>
  </div>
</template>
