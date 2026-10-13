<script setup lang="ts">
/** Botón compacto para añadir (o cambiar) archivos cuando ya hay una lista. */
const props = withDefaults(
  defineProps<{
    multiple?: boolean
    accept?: string
    label: string
    icon?: string
  }>(),
  { multiple: false, accept: 'application/pdf,.pdf', icon: 'plus' },
)
const emit = defineEmits<{ files: [files: File[]] }>()
// Las clases que se le pasen (p. ej. ancho completo en móvil) van al botón, no al envoltorio.
defineOptions({ inheritAttrs: false })
const input = ref<HTMLInputElement | null>(null)

function onChange() {
  const files = Array.from(input.value?.files ?? [])
  if (files.length) emit('files', files)
  if (input.value) input.value.value = ''
}
</script>

<template>
  <span class="contents">
    <button type="button" class="btn-secondary" v-bind="$attrs" @click="input?.click()">
      <UiAppIcon :name="props.icon" class="size-4" />
      {{ props.label }}
    </button>
    <input
      ref="input"
      type="file"
      class="sr-only"
      tabindex="-1"
      aria-hidden="true"
      :accept="props.accept"
      :multiple="props.multiple"
      data-testid="add-files-input"
      @change="onChange"
    />
  </span>
</template>
