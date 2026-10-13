<script setup lang="ts">
import { renderPageToJpeg } from '~/composables/usePdfPreview'
import { CancelledError, type ToolOutput } from '~/composables/useToolRun'
import { EXTREME_DPI, EXTREME_QUALITY, type CompressionLevel } from '~/lib/compression-levels'
import type { WorkerResult } from '~/lib/errors'
import { withSuffix } from '~/lib/filenames'
import type { RasterPage } from '~/lib/pdf/raster'

const tool = useToolSeo('compress')
const { t } = useI18n()
// Se mantiene abierto el documento: la compresión extrema dibuja sus páginas.
const queue = useFileQueue({ multiple: false, keepDocs: true })
const { items, rejected } = queue
const { phase, progress, error, output, run, cancel, reset } = useToolRun()
const pdf = usePdfWorker()
const { errorMessage } = useErrorMessage()

const workspace = ref<HTMLElement | null>(null)
const { isOver } = useFileDrop(workspace, (files) => queue.add(files))

const item = computed(() => items.value[0] ?? null)
const doc = computed(() => (item.value ? queue.getDoc(item.value.id) : null))
const ready = computed(() => item.value?.status === 'ok' && !!doc.value)

const level = ref<CompressionLevel>('recommended')
const levelOptions = computed(() =>
  (['low', 'recommended', 'extreme'] as const).map((value) => ({
    value,
    label: t(`tools.compress.${value}`),
    hint: t(`tools.compress.${value}Hint`),
  })),
)

const errorText = computed(() => (error.value ? errorMessage(error.value.code) : null))

async function compress() {
  if (!ready.value || !item.value || !doc.value) return
  const file = item.value.file
  const name = item.value.name
  const pages = item.value.pageCount
  const pdfDoc = doc.value
  const chosen = level.value

  await run(async (onProgress, signal): Promise<WorkerResult<ToolOutput>> => {
    let result: WorkerResult<Uint8Array>

    if (chosen === 'extreme') {
      // Cada página se convierte en una imagen JPEG (pdf.js) y luego se monta un PDF nuevo.
      const rendered: RasterPage[] = []
      for (let n = 1; n <= pages; n++) {
        if (signal.aborted) throw new CancelledError()
        const image = await renderPageToJpeg(pdfDoc, n, EXTREME_DPI, EXTREME_QUALITY)
        rendered.push({ jpeg: new Uint8Array(await image.blob.arrayBuffer()), width: image.pageWidth, height: image.pageHeight })
        onProgress((n / pages) * 0.85)
      }
      if (signal.aborted) throw new CancelledError()
      result = await pdf.worker().rasterToPdf(
        pdf.transfer(rendered, rendered.map((p) => p.jpeg.buffer as ArrayBuffer)),
        file.size,
        pdf.callback((f) => onProgress(0.85 + f * 0.15)),
      )
    } else {
      const bytes = new Uint8Array(await file.arrayBuffer())
      result = await pdf.worker().compress(
        pdf.transfer(bytes, [bytes.buffer as ArrayBuffer]),
        chosen,
        pdf.callback(onProgress),
      )
    }

    if (!result.ok) return result
    const blob = new Blob([result.value as Uint8Array<ArrayBuffer>], { type: 'application/pdf' })
    return {
      ok: true,
      value: {
        blob,
        fileName: withSuffix(name, t('tools.compress.fileSuffix')),
        detail: t('common.pages', pages),
        stats: { before: file.size, after: blob.size },
      },
    }
  })
}

function processAnother() {
  reset()
  queue.clear()
}
</script>

<template>
  <ToolPage :tool="tool">
    <ToolResultPanel v-if="phase === 'done' && output" :title="t('tools.compress.doneTitle')" :output="output" @reset="processAnother" />

    <ToolProgressPanel v-else-if="phase === 'processing'" :label="t('tools.compress.processing')" :progress="progress" @cancel="cancel" />

    <div v-else class="space-y-4">
      <ToolAlertBox v-if="rejected.length" tone="warning" dismissible @dismiss="rejected.splice(0)">
        {{ t('errors.rejected', { names: rejected.join(', ') }) }}
      </ToolAlertBox>

      <ToolDropZone v-if="!item" @files="queue.add" />

      <div
        v-else
        ref="workspace"
        class="mx-auto max-w-2xl space-y-4 rounded-3xl transition"
        :class="isOver ? 'ring-2 ring-royal-500 ring-offset-4 ring-offset-surface' : ''"
      >
        <ToolFileCard :item="item" @change="queue.add" />

        <form v-if="item.status !== 'corrupt' && item.status !== 'password' && item.status !== 'restricted'" class="card space-y-4 p-5" @submit.prevent="compress">
          <ToolOptionGroup
            v-model="level"
            name="nivel"
            :legend="t('tools.compress.levelLabel')"
            :options="levelOptions"
            :disabled="!ready"
          />

          <ToolAlertBox v-if="level === 'extreme'" tone="warning" data-testid="extreme-warning">
            {{ t('tools.compress.extremeWarning') }}
          </ToolAlertBox>

          <ToolAlertBox v-if="errorText" tone="error" :title="t('errors.title')" data-testid="compress-error">
            {{ errorText }}
          </ToolAlertBox>

          <button type="submit" class="btn-primary btn-lg w-full" :disabled="!ready" data-testid="run-tool">
            <UiAppIcon name="compress" class="size-5" />
            {{ t('tools.compress.action') }}
          </button>
        </form>
      </div>
    </div>
  </ToolPage>
</template>
