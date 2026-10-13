<script setup lang="ts">
import type { WorkerResult } from '~/lib/errors'
import { withSuffix } from '~/lib/filenames'
import type { ToolOutput } from '~/composables/useToolRun'

const tool = useToolSeo('merge')
const { t } = useI18n()
const queue = useFileQueue({ multiple: true })
const { items, rejected, isChecking, problemItems, readyItems, totalPages } = queue
const { phase, progress, error, output, run, cancel, reset } = useToolRun()
const pdf = usePdfWorker()
const { errorMessage } = useErrorMessage()

const workspace = ref<HTMLElement | null>(null)
const { isOver } = useFileDrop(workspace, (files) => queue.add(files))

const canMerge = computed(
  () => readyItems.value.length >= 2 && problemItems.value.length === 0 && !isChecking.value,
)

/** Nombres de los archivos en el orden en que se enviaron (para señalar cuál falló). */
let lastNames: string[] = []
const errorText = computed(() => {
  if (!error.value) return null
  const name = error.value.fileIndex != null ? lastNames[error.value.fileIndex] : undefined
  return errorMessage(error.value.code, name)
})

async function merge() {
  if (!canMerge.value) return
  const files = items.value.map((item) => item.file)
  const pages = totalPages.value
  lastNames = items.value.map((item) => item.name)

  await run(async (onProgress): Promise<WorkerResult<ToolOutput>> => {
    const buffers = await Promise.all(files.map(async (f) => new Uint8Array(await f.arrayBuffer())))
    const result = await pdf.worker().merge(
      pdf.transfer(buffers, buffers.map((b) => b.buffer as ArrayBuffer)),
      pdf.callback(onProgress),
    )
    if (!result.ok) return result
    return {
      ok: true,
      value: {
        blob: new Blob([result.value as Uint8Array<ArrayBuffer>], { type: 'application/pdf' }),
        fileName: withSuffix(lastNames[0]!, t('tools.merge.fileSuffix')),
        detail: t('common.pages', pages),
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
    <ToolResultPanel v-if="phase === 'done' && output" :title="t('tools.merge.doneTitle')" :output="output" @reset="processAnother" />

    <ToolProgressPanel v-else-if="phase === 'processing'" :label="t('tools.merge.processing')" :progress="progress" @cancel="cancel" />

    <div v-else class="space-y-4">
      <ToolAlertBox v-if="rejected.length" tone="warning" dismissible @dismiss="rejected.splice(0)">
        {{ t('errors.rejected', { names: rejected.join(', ') }) }}
      </ToolAlertBox>

      <ToolDropZone v-if="!items.length" multiple @files="queue.add" />

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
              <ToolAddFilesButton multiple :label="t('common.addMore')" @files="queue.add" />
            </div>
          </div>
          <p class="mb-4 text-sm text-muted">{{ t('tools.merge.reorderHint') }}</p>
          <ToolFileList :items="items" sortable @remove="queue.remove" @move="queue.move" />
        </section>

        <aside class="card h-fit space-y-4 p-5 lg:sticky lg:top-24" aria-labelledby="titulo-opciones">
          <h2 id="titulo-opciones" class="text-lg font-bold">{{ t('tools.merge.heading') }}</h2>
          <p class="text-sm text-muted" data-testid="merge-summary">
            <template v-if="readyItems.length >= 2">
              {{
                t('tools.merge.summary', {
                  files: t('common.fileCount', readyItems.length),
                  pages: t('common.pages', totalPages),
                })
              }}
            </template>
            <template v-else>{{ t('tools.merge.minFiles') }}</template>
          </p>
          <ToolAlertBox v-if="problemItems.length" tone="error">{{ t('common.fixProblems') }}</ToolAlertBox>
          <ToolAlertBox v-if="errorText" tone="error" :title="t('errors.title')">{{ errorText }}</ToolAlertBox>
          <button
            type="button"
            class="btn-primary btn-lg w-full"
            :disabled="!canMerge"
            data-testid="run-tool"
            @click="merge"
          >
            <UiAppIcon name="merge" class="size-5" />
            {{ t('tools.merge.action') }}
          </button>
        </aside>
      </div>
    </div>
  </ToolPage>
</template>
