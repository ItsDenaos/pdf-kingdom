<script setup lang="ts">
import type { ToolOutput } from '~/composables/useToolRun'
import type { WorkerResult } from '~/lib/errors'
import { baseName } from '~/lib/filenames'
import {
  DEFAULT_IMAGE_OPTIONS,
  type ImagesToPdfOptions,
  type MarginOption,
  type OrientationOption,
  type PageSizeOption,
} from '~/lib/page-layout'

const IMAGE_ACCEPT = 'image/jpeg,image/png,.jpg,.jpeg,.png'

const tool = useToolSeo('jpgToPdf')
const { t } = useI18n()
const queue = useFileQueue({ multiple: true, kind: 'image' })
const { items, rejected, isChecking, problemItems, readyItems } = queue
const { phase, progress, error, output, run, cancel, reset } = useToolRun()
const pdf = usePdfWorker()
const { errorMessage } = useErrorMessage()

const workspace = ref<HTMLElement | null>(null)
const { isOver } = useFileDrop(workspace, (files) => queue.add(files))

const options = reactive<ImagesToPdfOptions>({ ...DEFAULT_IMAGE_OPTIONS })

const pageSizeOptions = computed(() => [
  { value: 'a4' as PageSizeOption, label: t('tools.jpgToPdf.sizeA4') },
  { value: 'letter' as PageSizeOption, label: t('tools.jpgToPdf.sizeLetter') },
  { value: 'fit' as PageSizeOption, label: t('tools.jpgToPdf.sizeFit') },
])
const orientationOptions = computed(() => [
  { value: 'auto' as OrientationOption, label: t('tools.jpgToPdf.orientationAuto') },
  { value: 'portrait' as OrientationOption, label: t('tools.jpgToPdf.orientationPortrait') },
  { value: 'landscape' as OrientationOption, label: t('tools.jpgToPdf.orientationLandscape') },
])
const marginOptions = computed(() => [
  { value: 'none' as MarginOption, label: t('tools.jpgToPdf.marginNone') },
  { value: 'small' as MarginOption, label: t('tools.jpgToPdf.marginSmall') },
  { value: 'large' as MarginOption, label: t('tools.jpgToPdf.marginLarge') },
])

const canConvert = computed(
  () => readyItems.value.length >= 1 && problemItems.value.length === 0 && !isChecking.value,
)
/** Primera imagen lista, para la vista previa de la página. */
const previewItem = computed(() => readyItems.value[0] ?? null)

let lastNames: string[] = []
const errorText = computed(() => {
  if (!error.value) return null
  const name = error.value.fileIndex != null ? lastNames[error.value.fileIndex] : undefined
  return errorMessage(error.value.code, name, 'image')
})

async function convert() {
  if (!canConvert.value) return
  const files = items.value.map((item) => item.file)
  lastNames = items.value.map((item) => item.name)
  const chosen: ImagesToPdfOptions = { ...options } // copia simple: el worker no acepta objetos reactivos
  const first = baseName(lastNames[0]!)
  const fileName =
    files.length === 1
      ? `${first}.pdf`
      : `${t('tools.jpgToPdf.fileMany', { name: first, n: files.length - 1 })}.pdf`

  await run(async (onProgress): Promise<WorkerResult<ToolOutput>> => {
    const buffers = await Promise.all(files.map(async (f) => new Uint8Array(await f.arrayBuffer())))
    const result = await pdf.worker().imagesToPdf(
      pdf.transfer(buffers, buffers.map((b) => b.buffer as ArrayBuffer)),
      chosen,
      pdf.callback(onProgress),
    )
    if (!result.ok) return result
    return {
      ok: true,
      value: {
        blob: new Blob([result.value as Uint8Array<ArrayBuffer>], { type: 'application/pdf' }),
        fileName,
        detail: t('common.pages', files.length),
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
    <ToolResultPanel v-if="phase === 'done' && output" :title="t('tools.jpgToPdf.doneTitle')" :output="output" @reset="processAnother" />

    <ToolProgressPanel v-else-if="phase === 'processing'" :label="t('tools.jpgToPdf.processing')" :progress="progress" @cancel="cancel" />

    <div v-else class="space-y-4">
      <ToolAlertBox v-if="rejected.length" tone="warning" dismissible @dismiss="rejected.splice(0)">
        {{ t('errors.rejectedImages', { names: rejected.join(', ') }) }}
      </ToolAlertBox>

      <ToolDropZone
        v-if="!items.length"
        multiple
        :accept="IMAGE_ACCEPT"
        :title="t('common.dropTitleImages')"
        :button-label="t('common.chooseImages')"
        @files="queue.add"
      />

      <div
        v-else
        ref="workspace"
        class="grid gap-6 rounded-3xl transition lg:grid-cols-[1fr_20rem]"
        :class="isOver ? 'ring-2 ring-royal-500 ring-offset-4 ring-offset-surface' : ''"
      >
        <section aria-labelledby="titulo-archivos">
          <div class="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 id="titulo-archivos" class="text-lg font-bold">
              {{ t('common.files') }}
              <span class="font-normal text-muted">({{ items.length }})</span>
            </h2>
            <div class="flex flex-wrap gap-2">
              <button type="button" class="btn-ghost" :disabled="items.length < 2" @click="queue.sortByName">
                <UiAppIcon name="sortAz" class="size-4" />
                {{ t('tools.merge.sortByName') }}
              </button>
              <ToolAddFilesButton multiple :accept="IMAGE_ACCEPT" :label="t('common.addMore')" @files="queue.add" />
            </div>
          </div>
          <p class="mb-4 text-sm text-muted">{{ t('tools.jpgToPdf.reorderHint') }}</p>
          <ToolFileList :items="items" sortable @remove="queue.remove" @move="queue.move" />
        </section>

        <aside class="card h-fit space-y-5 p-5 lg:sticky lg:top-24" aria-labelledby="titulo-opciones">
          <h2 id="titulo-opciones" class="text-lg font-bold">{{ t('common.options') }}</h2>

          <ToolPageLayoutPreview
            v-if="previewItem?.width && previewItem.height"
            :image-width="previewItem.width"
            :image-height="previewItem.height"
            :thumb-url="previewItem.thumbUrl"
            :options="options"
            :label="t('tools.jpgToPdf.previewLabel')"
          />

          <ToolOptionGroup
            v-model="options.pageSize"
            compact
            name="tamano"
            :legend="t('tools.jpgToPdf.pageSizeLabel')"
            :options="pageSizeOptions"
          />
          <div>
            <ToolOptionGroup
              v-model="options.orientation"
              compact
              name="orientacion"
              :legend="t('tools.jpgToPdf.orientationLabel')"
              :options="orientationOptions"
              :disabled="options.pageSize === 'fit'"
            />
            <p v-if="options.pageSize === 'fit'" class="mt-1.5 text-xs text-muted">
              {{ t('tools.jpgToPdf.orientationFitHint') }}
            </p>
          </div>
          <ToolOptionGroup
            v-model="options.margin"
            compact
            name="margenes"
            :legend="t('tools.jpgToPdf.marginLabel')"
            :options="marginOptions"
          />

          <p v-if="readyItems.length" class="rounded-xl bg-sunken px-3 py-2 text-sm font-medium" data-testid="images-summary">
            {{ t('tools.jpgToPdf.summary', { pages: t('common.pages', readyItems.length) }) }}
          </p>
          <ToolAlertBox v-if="problemItems.length" tone="error">{{ t('common.fixProblems') }}</ToolAlertBox>
          <ToolAlertBox v-if="errorText" tone="error" :title="t('errors.title')">{{ errorText }}</ToolAlertBox>

          <button
            type="button"
            class="btn-primary btn-lg w-full"
            :disabled="!canConvert"
            data-testid="run-tool"
            @click="convert"
          >
            <UiAppIcon name="jpgToPdf" class="size-5" />
            {{ t('tools.jpgToPdf.action') }}
          </button>
        </aside>
      </div>
    </div>
  </ToolPage>
</template>
