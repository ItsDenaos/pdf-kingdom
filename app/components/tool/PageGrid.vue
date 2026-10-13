<script setup lang="ts">
import type { PDFDocumentProxy } from 'pdfjs-dist'

/**
 * Cuadrícula con todas las páginas del PDF. Resalta las páginas incluidas
 * y muestra en qué archivo de salida irá cada una.
 */
const props = defineProps<{
  doc: PDFDocumentProxy
  pageCount: number
  /** Para cada página (índice 0), los números de archivo en los que aparece. Vacío = no se incluye. */
  assignments: number[][]
  /** Muestra la etiqueta "Archivo n" sobre cada página incluida. */
  showTags?: boolean
}>()
const { t } = useI18n()

// Colores que se repiten de forma cíclica para distinguir los archivos de salida.
const PALETTE = [
  { chip: 'bg-royal-600 text-white', ring: 'ring-royal-600' },
  { chip: 'bg-gold-400 text-gold-900', ring: 'ring-gold-400' },
  { chip: 'bg-teal-600 text-white', ring: 'ring-teal-600' },
  { chip: 'bg-fuchsia-600 text-white', ring: 'ring-fuchsia-600' },
  { chip: 'bg-sky-600 text-white', ring: 'ring-sky-600' },
  { chip: 'bg-emerald-600 text-white', ring: 'ring-emerald-600' },
]
const color = (fileNumber: number) => PALETTE[(fileNumber - 1) % PALETTE.length]!
const pages = computed(() => Array.from({ length: props.pageCount }, (_, i) => i + 1))
</script>

<template>
  <ol class="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5" data-testid="page-grid">
    <li
      v-for="page in pages"
      :key="page"
      class="flex flex-col items-center gap-1.5"
      :data-included="(props.assignments[page - 1]?.length ?? 0) > 0"
    >
      <div
        class="relative flex aspect-[3/4] w-full items-center justify-center rounded-xl bg-sunken p-2 transition"
        :class="
          props.assignments[page - 1]?.length
            ? ['ring-2', color(props.assignments[page - 1]![0]!).ring]
            : 'opacity-40'
        "
      >
        <ToolPageThumb :doc="props.doc" :page-number="page" :width="110" />
        <div
          v-if="props.showTags && props.assignments[page - 1]?.length"
          class="absolute -top-2 right-1 flex flex-wrap justify-end gap-1"
        >
          <span
            v-for="n in props.assignments[page - 1]!.slice(0, 2)"
            :key="n"
            class="rounded-full px-2 py-0.5 text-[0.7rem] font-bold shadow"
            :class="color(n).chip"
          >
            {{ t('tools.split.fileTag', { n }) }}
          </span>
        </div>
      </div>
      <span class="text-xs font-medium text-muted">{{ t('common.pageLabel', { n: page }) }}</span>
    </li>
  </ol>
</template>
