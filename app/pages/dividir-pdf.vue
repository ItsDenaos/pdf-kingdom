<script setup lang="ts">
import type { WorkerResult } from '~/lib/errors'
import { baseName, padNumber } from '~/lib/filenames'
import { everyPageGroups, parseRanges, rangeToIndices } from '~/lib/ranges'
import type { ToolOutput } from '~/composables/useToolRun'

const tool = useToolSeo('split')
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
const ready = computed(() => item.value?.status === 'ok')

// Opciones
const mode = ref<'ranges' | 'every'>('ranges')
const rangeText = ref('')
const joinRanges = ref(false)
const showEmptyIssue = ref(false)
const rangeInput = ref<HTMLInputElement | null>(null)

const parsed = computed(() => parseRanges(rangeText.value, pageCount.value))

const visibleIssues = computed(() =>
  mode.value === 'ranges'
    ? parsed.value.issues.filter((i) => i.code !== 'empty' || showEmptyIssue.value).map(rangeIssueMessage)
    : [],
)

/** Archivos que se van a crear: qué páginas lleva cada uno y cómo se llamará. */
interface PlannedFile {
  indices: number[]
  label: string
}

const plan = computed<PlannedFile[]>(() => {
  if (!ready.value) return []
  if (mode.value === 'every') {
    return everyPageGroups(pageCount.value).map((indices, i) => ({
      indices,
      label: t('tools.split.fileOne', { n: padNumber(i + 1, pageCount.value) }),
    }))
  }
  const { ranges, issues } = parsed.value
  if (issues.length) return []
  if (joinRanges.value && ranges.length > 1) {
    return [{ indices: ranges.flatMap(rangeToIndices), label: t('tools.split.fileJoined') }]
  }
  return ranges.map((r) => ({
    indices: rangeToIndices(r),
    label:
      r.start === r.end
        ? t('tools.split.fileOne', { n: r.start })
        : t('tools.split.fileRange', { from: r.start, to: r.end }),
  }))
})

/** Para la vista previa: en qué archivo(s) irá cada página. */
const assignments = computed(() => {
  const result: number[][] = Array.from({ length: pageCount.value }, () => [])
  plan.value.forEach((file, i) => {
    for (const index of file.indices) {
      const list = result[index]
      if (list && !list.includes(i + 1)) list.push(i + 1)
    }
  })
  return result
})

watch(rangeText, () => (showEmptyIssue.value = false))

const errorText = computed(() => (error.value ? errorMessage(error.value.code) : null))

async function split() {
  if (!ready.value || !item.value) return
  if (!plan.value.length) {
    showEmptyIssue.value = true
    rangeInput.value?.focus()
    return
  }

  const file = item.value.file
  const base = baseName(item.value.name)
  const planned = plan.value
  const names = planned.map((p) => `${base}_${p.label}.pdf`)

  await run(async (onProgress): Promise<WorkerResult<ToolOutput>> => {
    const bytes = new Uint8Array(await file.arrayBuffer())
    const result = await pdf.worker().split(
      pdf.transfer(bytes, [bytes.buffer as ArrayBuffer]),
      planned.map((p) => p.indices),
      names,
      pdf.callback(onProgress),
    )
    if (!result.ok) return result
    const data = result.value.data as Uint8Array<ArrayBuffer>
    if (result.value.kind === 'pdf') {
      return {
        ok: true,
        value: {
          blob: new Blob([data], { type: 'application/pdf' }),
          fileName: names[0]!,
          detail: t('common.pages', planned[0]!.indices.length),
        },
      }
    }
    return {
      ok: true,
      value: {
        blob: new Blob([data], { type: 'application/zip' }),
        fileName: `${base}_${t('tools.split.zipSuffix')}.zip`,
        detail: t('tools.split.doneZip', { n: planned.length }),
      },
    }
  })
}

function processAnother() {
  reset()
  queue.clear()
  rangeText.value = ''
  joinRanges.value = false
  mode.value = 'ranges'
}
</script>

<template>
  <ToolPage :tool="tool">
    <ToolResultPanel v-if="phase === 'done' && output" :title="t('tools.split.doneTitle')" :output="output" @reset="processAnother" />

    <ToolProgressPanel v-else-if="phase === 'processing'" :label="t('tools.split.processing')" :progress="progress" @cancel="cancel" />

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
          <!-- Archivo elegido -->
          <ToolFileCard :item="item" @change="queue.add" />

          <!-- Vista previa de páginas -->
          <div v-if="ready && doc">
            <h2 id="titulo-vista" class="text-lg font-bold">{{ t('tools.split.previewTitle') }}</h2>
            <p class="mb-5 mt-1 text-sm text-muted">{{ t('tools.split.previewHint') }}</p>
            <ToolPageGrid :doc="doc" :page-count="pageCount" :assignments="assignments" show-tags />
          </div>
        </section>

        <!-- Opciones -->
        <aside class="card h-fit space-y-5 p-5 lg:sticky lg:top-24" aria-labelledby="titulo-opciones">
          <h2 id="titulo-opciones" class="text-lg font-bold">{{ t('common.options') }}</h2>

          <fieldset :disabled="!ready" class="space-y-2">
            <legend class="field-label">{{ t('tools.split.modeLabel') }}</legend>
            <label
              v-for="option in (['ranges', 'every'] as const)"
              :key="option"
              class="flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-crown"
              :class="mode === option ? 'border-royal-500 bg-royal-50 dark:bg-royal-900/40' : 'border-line hover:bg-sunken'"
            >
              <input v-model="mode" type="radio" name="modo" :value="option" class="mt-1 accent-royal-600" />
              <span>
                <span class="block font-semibold">{{ t(option === 'ranges' ? 'tools.split.modeRanges' : 'tools.split.modeEvery') }}</span>
                <span class="block text-sm text-muted">
                  {{ t(option === 'ranges' ? 'tools.split.modeRangesHint' : 'tools.split.modeEveryHint') }}
                </span>
              </span>
            </label>
          </fieldset>

          <div v-if="mode === 'ranges'" class="space-y-3">
            <div>
              <label for="rangos" class="field-label">{{ t('ranges.label') }}</label>
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
                @keydown.enter.prevent="split"
              />
              <p id="rangos-ayuda" class="mt-1.5 text-xs text-muted">{{ t('ranges.help') }}</p>
              <ul id="rangos-errores" class="mt-2 space-y-1 text-sm font-medium text-danger" aria-live="polite" data-testid="range-errors">
                <li v-for="issue in visibleIssues" :key="issue">{{ issue }}</li>
              </ul>
            </div>
            <label class="flex cursor-pointer items-center gap-2.5 text-sm">
              <input v-model="joinRanges" type="checkbox" class="size-4 accent-royal-600" :disabled="!ready" />
              {{ t('tools.split.joinRanges') }}
            </label>
          </div>

          <p v-if="plan.length" class="rounded-xl bg-sunken px-3 py-2 text-sm font-medium" data-testid="split-summary">
            {{ t('tools.split.outputs', plan.length) }}
          </p>

          <ToolAlertBox v-if="errorText" tone="error" :title="t('errors.title')">{{ errorText }}</ToolAlertBox>

          <button
            type="button"
            class="btn-primary btn-lg w-full"
            :disabled="!ready"
            data-testid="run-tool"
            @click="split"
          >
            <UiAppIcon name="split" class="size-5" />
            {{ t('tools.split.action') }}
          </button>
        </aside>
      </div>
    </div>
  </ToolPage>
</template>
