<script setup lang="ts">
import { useIntersectionObserver } from '@vueuse/core'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import { renderThumbnail, thumbnailQueue } from '~/composables/usePdfPreview'

/** Miniatura de una página. Solo se dibuja cuando aparece en pantalla. */
const props = withDefaults(
  defineProps<{
    doc: PDFDocumentProxy
    pageNumber: number
    width?: number
  }>(),
  { width: 120 },
)
const { t } = useI18n()

const root = ref<HTMLElement | null>(null)
const url = ref<string | null>(null)
let requested = false

const { stop } = useIntersectionObserver(
  root,
  ([entry]) => {
    if (!entry?.isIntersecting || requested) return
    requested = true
    stop()
    thumbnailQueue(() => renderThumbnail(props.doc, props.pageNumber, props.width))
      .then((objectUrl) => {
        if (root.value) url.value = objectUrl
        else URL.revokeObjectURL(objectUrl)
      })
      .catch(() => {
        // Si una página no se puede dibujar se queda el marcador.
      })
  },
  { rootMargin: '200px' },
)

onBeforeUnmount(() => {
  if (url.value) URL.revokeObjectURL(url.value)
})
</script>

<template>
  <div ref="root" class="flex h-full w-full items-center justify-center">
    <img
      v-if="url"
      :src="url"
      :alt="t('common.pageThumbAlt', { n: props.pageNumber })"
      class="max-h-full max-w-full rounded-sm bg-white object-contain shadow ring-1 ring-black/5"
      draggable="false"
    />
    <div v-else class="aspect-[3/4] w-3/4 animate-pulse rounded-sm bg-line/60" />
  </div>
</template>
