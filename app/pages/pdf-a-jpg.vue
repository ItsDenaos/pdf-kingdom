<script setup lang="ts">
import { renderPageToJpeg } from '~/composables/usePdfPreview'
import { CancelledError, type ToolOutput } from '~/composables/useToolRun'
import type { WorkerResult } from '~/lib/errors'
import { baseName, padNumber } from '~/lib/filenames'
import { parseRanges, rangeToIndices } from '~/lib/ranges'

type PagesMode = 'all' | 'some'
type Dpi = 96 | 150 | 300

const tool = useToolSeo('pdfToJpg')
const { t } = useI18n()
const queue = useFileQueue({ multiple: false, keepDocs: true })
const { items, rejected } = queue
const { phase, progress, error, output, run, cancel, reset } = useToolRun()
const pdf = usePdfWorker()
const { errorMessage, rangeIssueMessage } = useErrorMessage()

const workspace = ref<HTMLElement | null>(null)
const { isOver } = useFileDrop(workspace, (files) => queue.add(files))

const item = computed(() => items.value[0] ?? null)
const doc = computed(() => (item.value ? queue.getDoc(item.value.id) : null))
const pageCount = computed(() => item.value?.pageCount ?? 0)
const ready = computed(() => item.value?.status === 'ok' && !!doc.value)

// Opciones
const pagesMode = ref<PagesMode>('all')
const rangeText = ref('')
const dpi = ref<Dpi>(150)
const showEmptyIssue = ref(false)
const rangeInput = ref<HTMLInputElement | null>(null)

const pagesOptions = computed(() => [
  { value: 'all' as PagesMode, label: t('tools.pdfToJpg.pagesAll') },
  { value: 'some' as PagesMode, label: t('tools.pdfToJpg.pagesSome') },
])
const dpiOptions = computed(() =>
  ([96, 150, 300] as const).map((value) => ({
    value: value as Dpi,
    label: t(`tools.pdfToJpg.dpi${value}`),
    hint: t(`tools.pdfToJpg.dpi${value}Hint`),
  })),
)

const parsed = computed(() => parseRanges(rangeText.value, pageCount.value))

const visibleIssues = computed(() =>
  pagesMode.value === 'some'
    ? parsed.value.issues.filter((i) => i.code !== 'empty' || showEmptyIssue.value).map(rangeIssueMessage)
    : [],
)
watch(rangeText, () => (showEmptyIssue.value = false))

/** Páginas que se convertirán (desde 1, sin repetir y en el orden escrito). */
const selectedPages = computed<number[]>(() => {
  if (!ready.value) return []
  if (pagesMode.value === 'all') return Array.from({ length: pageCount.value }, (_, i) => i + 1)
  if (parsed.value.issues.length) return []
  const pages = parsed.value.ranges.flatMap(rangeToIndices).map((i) => i + 1)
  return [...new Set(pages)]
})

const assignments = computed(() => {
  const selected = new Set(selectedPages.value)
  return Array.from({ length: pageCount.value }, (_, i) => (selected.has(i + 1) ? [1] : []))
})

const errorText = computed(() => (error.value ? errorMessage(error.value.code) : null))

async function convert() {
  if (!ready.value || !item.value || !doc.value) return
  if (!selectedPages.value.length) {
    showEmptyIssue.value = true
    rangeInput.value?.focus()
    return
  }

  const pdfDoc = doc.value
  const base = baseName(item.value.name)
  const pages = selectedPages.value
  const total = pageCount.value
  const resolution = dpi.value

  await run(async (onProgress, signal): Promise<WorkerResult<ToolOutput>> => {
    // pdf.js pinta cada página; se hace una a una para no gastar demasiada memoria.
    const images: { name: string; blob: Blob; width: number; height: number }[] = []
    for (const [i, page] of pages.entries()) {
      if (signal.aborted) throw new CancelledError()
      const rendered = await renderPageToJpeg(pdfDoc, page, resolution)
      images.push({ name: `${base}_${t('tools.pdfToJpg.fileOne', { n: padNumber(page, total) })}.jpg`, ...rendered })
      onProgress(((i + 1) / pages.length) * 0.9)
    }

    if (images.length === 1) {
      const [only] = images
      return {
        ok: true,
        value: {
          blob: only!.blob,
          fileName: `${base}_${t('tools.pdfToJpg.fileOne', { n: pages[0]! })}.jpg`,
          detail: t('tools.pdfToJpg.doneOne', { width: only!.width, height: only!.height }),
        },
      }
    }

    const files = await Promise.all(
      images.map(async (img) => ({ name: img.name, data: new Uint8Array(await img.blob.arrayBuffer()) })),
    )
    if (signal.aborted) throw new CancelledError()
    const result = await pdf.worker().zip(pdf.transfer(files, files.map((f) => f.data.buffer as ArrayBuffer)))
    if (!result.ok) return result
    onProgress(1)
    return {
      ok: true,
      value: {
        blob: new Blob([result.value as Uint8Array<ArrayBuffer>], { type: 'application/zip' }),
        fileName: `${base}_${t('tools.pdfToJpg.zipSuffix')}.zip`,
        detail: t('tools.pdfToJpg.doneZip', { n: images.length }),
      },
    }
  })
}

function processAnother() {
  reset()
  queue.clear()
  pagesMode.value = 'all'
  rangeText.value = ''
}
</script>

<template>
  <ToolPage :tool="tool">
    <ToolResultPanel v-if="phase === 'done' && output" :title="t('tools.pdfToJpg.doneTitle')" :output="output" @reset="processAnother" />

    <ToolProgressPanel v-else-if="phase === 'processing'" :label="t('tools.pdfToJpg.processing')" :progress="progress" @cancel="cancel" />

    <div v-else class="space-y-4">
      <ToolAlertBox v-if="rejected.length" tone="warning" dismissible @dismiss="rejected.splice(0)">
        {{ t('errors.rejected', { names: rejected.join(', ') }) }}
      </ToolAlertBox>

      <ToolDropZone v-if="!item" @files="queue.add" />

      <div
        v-else
        ref="workspace"
        class="grid gap-6 rounded-3xl transition lg:grid-cols-[1fr_22rem]"
        :class="isOver ? 'ring-2 ring-royal-500 ring-offset-4 ring-offset-surface' : ''"
      >
        <section class="min-w-0 space-y-5">
          <ToolFileCard :item="item" @change="queue.add" />

          <div v-if="ready && doc">
            <h2 class="text-lg font-bold">{{ t('tools.pdfToJpg.previewTitle') }}</h2>
            <p class="mb-5 mt-1 text-sm text-muted">{{ t('tools.pdfToJpg.previewHint') }}</p>
            <ToolPageGrid :doc="doc" :page-count="pageCount" :assignments="assignments" />
          </div>
        </section>

        <aside class="card h-fit space-y-5 p-5 lg:sticky lg:top-24" aria-labelledby="titulo-opciones">
          <h2 id="titulo-opciones" class="text-lg font-bold">{{ t('common.options') }}</h2>

          <ToolOptionGroup
            v-model="pagesMode"
            compact
            name="paginas"
            :legend="t('tools.pdfToJpg.pagesLabel')"
            :options="pagesOptions"
            :disabled="!ready"
          />

          <div v-if="pagesMode === 'some'">
            <label for="rangos" class="field-label">{{ t('tools.pdfToJpg.rangesLabel') }}</label>
            <input
              id="rangos"
              ref="rangeInput"
              v-model="rangeText"
              type="text"
              inputmode="numeric"
              autocomplete="off"
              class="field-input"
              :placeholder="t('ranges.placeholder')"
              :disabled="!ready"
              :aria-invalid="visibleIssues.length > 0"
              aria-describedby="rangos-ayuda rangos-errores"
              data-testid="ranges-input"
              @keydown.enter.prevent="convert"
            />
            <p id="rangos-ayuda" class="mt-1.5 text-xs text-muted">{{ t('ranges.help') }}</p>
            <ul id="rangos-errores" class="mt-2 space-y-1 text-sm font-medium text-danger" aria-live="polite" data-testid="range-errors">
              <li v-for="issue in visibleIssues" :key="issue">{{ issue }}</li>
            </ul>
          </div>

          <ToolOptionGroup v-model="dpi" name="calidad" :legend="t('tools.pdfToJpg.qualityLabel')" :options="dpiOptions" :disabled="!ready" />

          <p v-if="selectedPages.length" class="rounded-xl bg-sunken px-3 py-2 text-sm font-medium" data-testid="jpg-summary">
            {{ t('tools.pdfToJpg.outputs', selectedPages.length) }}
          </p>

          <ToolAlertBox v-if="errorText" tone="error" :title="t('errors.title')">{{ errorText }}</ToolAlertBox>

          <button
            type="button"
            class="btn-primary btn-lg w-full"
            :disabled="!ready"
            data-testid="run-tool"
            @click="convert"
          >
            <UiAppIcon name="pdfToJpg" class="size-5" />
            {{ t('tools.pdfToJpg.action') }}
          </button>
        </aside>
      </div>
    </div>
  </ToolPage>
</template>
