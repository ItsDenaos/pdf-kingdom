<script setup lang="ts">
import { computeLayout, type ImagesToPdfOptions } from '~/lib/page-layout'

/** Dibujo a escala de cómo quedará una imagen en la página con las opciones elegidas. */
const props = defineProps<{
  imageWidth: number
  imageHeight: number
  thumbUrl: string | null
  options: ImagesToPdfOptions
  label: string
}>()

const BOX = 150 // tamaño máximo del dibujo en píxeles

const layout = computed(() => computeLayout(props.imageWidth, props.imageHeight, props.options))
const scale = computed(() => BOX / Math.max(layout.value.pageWidth, layout.value.pageHeight))
const page = computed(() => ({
  width: `${layout.value.pageWidth * scale.value}px`,
  height: `${layout.value.pageHeight * scale.value}px`,
}))
// En PDF el origen está abajo; en pantalla, arriba.
const image = computed(() => ({
  left: `${layout.value.x * scale.value}px`,
  top: `${(layout.value.pageHeight - layout.value.y - layout.value.height) * scale.value}px`,
  width: `${layout.value.width * scale.value}px`,
  height: `${layout.value.height * scale.value}px`,
}))
</script>

<template>
  <figure class="flex flex-col items-center gap-2 rounded-xl bg-sunken p-4" data-testid="layout-preview">
    <div class="grid h-[150px] place-items-center">
      <div class="relative bg-white shadow-md ring-1 ring-black/10 transition-all duration-300" :style="page">
        <img
          v-if="props.thumbUrl"
          :src="props.thumbUrl"
          alt=""
          class="absolute object-fill transition-all duration-300"
          :style="image"
        />
      </div>
    </div>
    <figcaption class="text-xs text-muted">{{ props.label }}</figcaption>
  </figure>
</template>
