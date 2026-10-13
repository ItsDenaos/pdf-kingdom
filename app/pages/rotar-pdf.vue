<script setup lang="ts">
import type { ToolOutput } from '~/composables/useToolRun'
import { normalizeAngle } from '~/lib/angles'
import type { WorkerResult } from '~/lib/errors'
import { withSuffix } from '~/lib/filenames'

const tool = useToolSeo('rotate')
const { t } = useI18n()
const queue = useFileQueue({ multiple: false, keepDocs: true })
const { items, rejected } = queue
const { phase, progress, error, output, run, cancel, reset } = useToolRun()
const pdf = usePdfWorker()
const { errorMessage } = useErrorMessage()

const workspace = ref<HTMLElement | null>(null)
const { isOver } = useFileDrop(workspace, (files) => queue.add(files))

const item = computed(() => items.value[0] ?? null)
const doc = computed(() => (item.value ? queue.getDoc(item.value.id) : null))
const pageCount = computed(() => item.value?.pageCount ?? 0)
const ready = computed(() => item.value?.status === 'ok')

/**
 * Giro acumulado de cada página en grados (puede ser -90, 450…). Se guarda así para
 * que la animación gire siempre en el sentido pulsado; al procesar se normaliza.
 */
const rotations = ref<number[]>([])
watch(
  () => [item.value?.id, pageCount.value] as const,
  () => (rotations.value = Array.from({ length: pageCount.value }, () => 0)),
  { immediate: true },
)

const changedCount = computed(() => rotations.value.filter((r) => normalizeAngle(r) !== 0).length)

function rotatePage(index: number, delta: number) {
  rotations.value[index] = (rotations.value[index] ?? 0) + delta
}
function rotateAll(delta: number) {
  rotations.value = rotations.value.map((r) => r + delta)
}
function resetRotations() {
  rotations.value = rotations.value.map(() => 0)
}

const errorText = computed(() => (error.value ? errorMessage(error.value.code) : null))

async function rotate() {
  if (!ready.value || !item.value || changedCount.value === 0) return
  const file = item.value.file
  const name = item.value.name
  const angles = rotations.value.map(normalizeAngle)
  const pages = pageCount.value

  await run(async (onProgress): Promise<WorkerResult<ToolOutput>> => {
    const bytes = new Uint8Array(await file.arrayBuffer())
    const result = await pdf.worker().rotate(
      pdf.transfer(bytes, [bytes.buffer as ArrayBuffer]),
      angles,
      pdf.callback(onProgress),
    )
    if (!result.ok) return result
    return {
      ok: true,
      value: {
        blob: new Blob([result.value as Uint8Array<ArrayBuffer>], { type: 'application/pdf' }),
        fileName: withSuffix(name, t('tools.rotate.fileSuffix')),
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
    <ToolResultPanel v-if="phase === 'done' && output" :title="t('tools.rotate.doneTitle')" :output="output" @reset="processAnother" />

    <ToolProgressPanel v-else-if="phase === 'processing'" :label="t('tools.rotate.processing')" :progress="progress" @cancel="cancel" />

    <div v-else class="space-y-4">
      <ToolAlertBox v-if="rejected.length" tone="warning" dismissible @dismiss="rejected.splice(0)">
        {{ t('errors.rejected', { names: rejected.join(', ') }) }}
      </ToolAlertBox>

      <ToolDropZone v-if="!item" @files="queue.add" />

      <div
        v-else
        ref="workspace"
        class="grid gap-6 rounded-3xl transition lg:grid-cols-[1fr_20rem]"
        :class="isOver ? 'ring-2 ring-royal-500 ring-offset-4 ring-offset-surface' : ''"
      >
        <section class="min-w-0 space-y-5">
          <ToolFileCard :item="item" @change="queue.add" />

          <div v-if="ready && doc">
            <p class="mb-4 text-sm text-muted">{{ t('tools.rotate.hint') }}</p>
            <ol class="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4" data-testid="rotate-grid">
              <li
                v-for="page in pageCount"
                :key="page"
                class="card flex flex-col gap-2 p-2.5"
                :data-rotation="normalizeAngle(rotations[page - 1] ?? 0)"
              >
                <div class="relative aspect-square overflow-hidden rounded-xl bg-sunken p-3">
                  <div
                    class="h-full w-full transition-transform duration-300 ease-out"
                    :style="{ transform: `rotate(${rotations[page - 1] ?? 0}deg)` }"
                  >
                    <ToolPageThumb :doc="doc" :page-number="page" :width="140" />
                  </div>
                  <span
                    v-if="normalizeAngle(rotations[page - 1] ?? 0)"
                    class="absolute left-2 top-2 rounded-full bg-accent px-2 py-0.5 text-xs font-bold text-on-accent shadow"
                  >
                    {{ t('common.degrees', { n: normalizeAngle(rotations[page - 1] ?? 0) }) }}
                  </span>
                </div>
                <div class="flex items-center justify-between">
                  <button type="button" class="icon-btn" :aria-label="t('tools.rotate.rotateLeft', { n: page })" @click="rotatePage(page - 1, -90)">
                    <UiAppIcon name="rotateLeft" class="size-5" />
                  </button>
                  <span class="text-xs font-medium text-muted">{{ t('common.pageLabel', { n: page }) }}</span>
                  <button type="button" class="icon-btn" :aria-label="t('tools.rotate.rotateRight', { n: page })" @click="rotatePage(page - 1, 90)">
                    <UiAppIcon name="rotateRight" class="size-5" />
                  </button>
                </div>
              </li>
            </ol>
          </div>
        </section>

        <aside class="card h-fit space-y-4 p-5 lg:sticky lg:top-24" aria-labelledby="titulo-opciones">
          <h2 id="titulo-opciones" class="text-lg font-bold">{{ t('common.options') }}</h2>
          <div class="grid grid-cols-2 gap-2">
            <button type="button" class="btn-secondary" :disabled="!ready" @click="rotateAll(-90)">
              <UiAppIcon name="rotateLeft" class="size-4" />
              {{ t('tools.rotate.allLeft') }}
            </button>
            <button type="button" class="btn-secondary" :disabled="!ready" @click="rotateAll(90)">
              <UiAppIcon name="rotateRight" class="size-4" />
              {{ t('tools.rotate.allRight') }}
            </button>
          </div>
          <button type="button" class="btn-ghost w-full" :disabled="!ready || changedCount === 0" @click="resetRotations">
            {{ t('tools.rotate.reset') }}
          </button>

          <p class="rounded-xl bg-sunken px-3 py-2 text-sm font-medium" aria-live="polite" data-testid="rotate-summary">
            {{ changedCount ? t('tools.rotate.summary', changedCount) : t('tools.rotate.noChanges') }}
          </p>

          <ToolAlertBox v-if="errorText" tone="error" :title="t('errors.title')">{{ errorText }}</ToolAlertBox>

          <button
            type="button"
            class="btn-primary btn-lg w-full"
            :disabled="!ready || changedCount === 0"
            data-testid="run-tool"
            @click="rotate"
          >
            <UiAppIcon name="rotate" class="size-5" />
            {{ t('tools.rotate.action') }}
          </button>
        </aside>
      </div>
    </div>
  </ToolPage>
</template>
