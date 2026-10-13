<script setup lang="ts">
/** Zona grande para arrastrar archivos o elegirlos con un botón. */
const props = withDefaults(
  defineProps<{
    multiple?: boolean
    accept?: string
    /** Textos propios (p. ej. para imágenes). Si no se indican, se usan los de PDF. */
    title?: string
    buttonLabel?: string
  }>(),
  { multiple: false, accept: 'application/pdf,.pdf', title: undefined, buttonLabel: undefined },
)
const emit = defineEmits<{ files: [files: File[]] }>()
const { t } = useI18n()

const zone = ref<HTMLElement | null>(null)
const input = ref<HTMLInputElement | null>(null)
const { isOver } = useFileDrop(zone, (files) => emit('files', files))

function open() {
  input.value?.click()
}

function onChange() {
  const files = Array.from(input.value?.files ?? [])
  if (files.length) emit('files', files)
  if (input.value) input.value.value = '' // permite volver a elegir el mismo archivo
}

// Si el usuario eligió un archivo antes de que la página terminara de cargar
// (conexión lenta), lo recogemos en cuanto la página está lista.
const ready = ref(false)
onMounted(() => {
  ready.value = true
  if (input.value?.files?.length) onChange()
})

defineExpose({ open })
</script>

<template>
  <div
    ref="zone"
    class="relative flex flex-col items-center justify-center rounded-3xl border-2 border-dashed px-6 py-14 text-center transition-colors sm:py-20"
    :class="
      isOver
        ? 'border-royal-500 bg-royal-50 dark:bg-royal-900/40'
        : 'border-royal-300/70 bg-raised dark:border-royal-700/70'
    "
    data-testid="dropzone"
  >
    <span
      class="grid size-16 place-items-center rounded-2xl bg-royal-100 text-royal-700 dark:bg-royal-900/70 dark:text-royal-200"
    >
      <UiAppIcon name="upload" class="size-8" />
    </span>
    <p class="mt-5 font-display text-2xl font-semibold" aria-live="polite">
      {{ isOver ? t('common.dropActive') : (props.title ?? (props.multiple ? t('common.dropTitleMany') : t('common.dropTitleOne'))) }}
    </p>
    <p class="mt-1 text-muted">{{ t('common.dropOr') }}</p>
    <button type="button" class="btn-primary btn-lg mt-3" @click="open">
      <UiAppIcon name="plus" class="size-5" />
      {{ props.buttonLabel ?? (props.multiple ? t('common.chooseMany') : t('common.chooseOne')) }}
    </button>
    <p class="mt-5 flex max-w-md items-center gap-2 text-sm text-muted">
      <UiAppIcon name="shield" class="size-4 shrink-0 text-success" />
      {{ t('common.dropHint') }}
    </p>
    <input
      ref="input"
      type="file"
      class="sr-only"
      tabindex="-1"
      aria-hidden="true"
      :accept="props.accept"
      :multiple="props.multiple"
      data-testid="file-input"
      :data-ready="ready ? 'true' : undefined"
      @change="onChange"
    />
  </div>
</template>
