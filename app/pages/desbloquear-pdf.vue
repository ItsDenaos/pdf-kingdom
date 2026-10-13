<script setup lang="ts">
import type { BlockedAction } from '~/composables/usePdfPreview'
import type { ToolOutput } from '~/composables/useToolRun'
import type { WorkerResult } from '~/lib/errors'
import { withSuffix } from '~/lib/filenames'

const tool = useToolSeo('unlock')
const { t } = useI18n()
const queue = useFileQueue({ multiple: false })
const { items, rejected } = queue
const { phase, progress, error, output, run, cancel, reset } = useToolRun()
const pdf = usePdfWorker()
const { errorMessage } = useErrorMessage()

const workspace = ref<HTMLElement | null>(null)
const { isOver } = useFileDrop(workspace, (files) => queue.add(files))

const item = computed(() => items.value[0] ?? null)
const status = computed(() => item.value?.status ?? null)
const password = ref('')
const passwordField = ref<{ focus: () => void } | null>(null)

// Al cambiar de archivo se borra la contraseña escrita.
watch(() => item.value?.id, () => (password.value = ''))

const BLOCKED_KEYS: Record<BlockedAction, string> = {
  print: 'tools.unlock.blockedPrint',
  copy: 'tools.unlock.blockedCopy',
  modify: 'tools.unlock.blockedModify',
  annotate: 'tools.unlock.blockedAnnotate',
}
const restrictionsText = computed(() => {
  const blocked = item.value?.blocked ?? []
  if (!blocked.length) return t('tools.unlock.restrictedGeneric')
  return t('tools.unlock.restricted', { list: blocked.map((b) => t(BLOCKED_KEYS[b])).join(', ') })
})

const canUnlock = computed(
  () => status.value === 'restricted' || (status.value === 'password' && password.value.length > 0),
)

const errorText = computed(() => (error.value ? errorMessage(error.value.code) : null))
const passwordError = computed(() => (error.value?.code === 'wrong-password' ? errorText.value : null))

async function unlock() {
  if (!canUnlock.value || !item.value) return
  const file = item.value.file
  const name = item.value.name
  const secret = status.value === 'password' ? password.value : ''

  await run(async (onProgress): Promise<WorkerResult<ToolOutput>> => {
    const bytes = new Uint8Array(await file.arrayBuffer())
    const result = await pdf.worker().unlock(
      pdf.transfer(bytes, [bytes.buffer as ArrayBuffer]),
      secret,
      pdf.callback(onProgress),
    )
    if (!result.ok) return result
    return {
      ok: true,
      value: {
        blob: new Blob([result.value as Uint8Array<ArrayBuffer>], { type: 'application/pdf' }),
        fileName: withSuffix(name, t('tools.unlock.fileSuffix')),
        detail: t('tools.unlock.doneDetail'),
      },
    }
  })

  if (error.value?.code === 'wrong-password') {
    await nextTick()
    passwordField.value?.focus()
  }
}

function processAnother() {
  reset()
  queue.clear()
  password.value = ''
}
</script>

<template>
  <ToolPage :tool="tool">
    <ToolAlertBox tone="warning" class="mb-5" data-testid="legal-notice">
      <strong class="font-semibold">{{ t('tools.unlock.legalNotice') }}</strong>
      {{ t('tools.unlock.legalDetail') }}
    </ToolAlertBox>

    <ToolResultPanel v-if="phase === 'done' && output" :title="t('tools.unlock.doneTitle')" :output="output" @reset="processAnother" />

    <ToolProgressPanel v-else-if="phase === 'processing'" :label="t('tools.unlock.processing')" :progress="progress" @cancel="cancel" />

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
        <ToolFileCard :item="item" :show-status="status === 'corrupt'" @change="queue.add" />

        <form v-if="status !== 'checking' && status !== 'corrupt'" class="card space-y-4 p-5" @submit.prevent="unlock">
          <template v-if="status === 'password'">
            <p class="flex items-start gap-2 text-sm" data-testid="unlock-state">
              <UiAppIcon name="protect" class="mt-px size-5 shrink-0 text-royal-600 dark:text-royal-300" />
              {{ t('tools.unlock.needsPassword') }}
            </p>
            <ToolPasswordField
              id="contrasena-pdf"
              ref="passwordField"
              v-model="password"
              :label="t('tools.unlock.passwordLabel')"
              :error="passwordError"
              testid="password-input"
            />
          </template>

          <p v-else-if="status === 'restricted'" class="flex items-start gap-2 text-sm" data-testid="unlock-state">
            <UiAppIcon name="unlock" class="mt-px size-5 shrink-0 text-royal-600 dark:text-royal-300" />
            {{ restrictionsText }}
          </p>

          <p v-else-if="status === 'ok'" class="flex items-start gap-2 text-sm" data-testid="unlock-state">
            <UiAppIcon name="checkCircle" class="mt-px size-5 shrink-0 text-success" />
            {{ t('tools.unlock.notProtected') }}
          </p>

          <ToolAlertBox v-if="errorText && !passwordError" tone="error" :title="t('errors.title')">{{ errorText }}</ToolAlertBox>

          <button type="submit" class="btn-primary btn-lg w-full" :disabled="!canUnlock" data-testid="run-tool">
            <UiAppIcon name="unlock" class="size-5" />
            {{ t('tools.unlock.action') }}
          </button>
        </form>
      </div>
    </div>
  </ToolPage>
</template>
