<script setup lang="ts">
import type { ToolOutput } from '~/composables/useToolRun'
import type { WorkerResult } from '~/lib/errors'
import { withSuffix } from '~/lib/filenames'
import { passwordStrength, type PasswordStrength } from '~/lib/password'

const tool = useToolSeo('protect')
const { t } = useI18n()
const queue = useFileQueue({ multiple: false })
const { items, rejected } = queue
const { phase, progress, error, output, run, cancel, reset } = useToolRun()
const pdf = usePdfWorker()
const { errorMessage } = useErrorMessage()

const workspace = ref<HTMLElement | null>(null)
const { isOver } = useFileDrop(workspace, (files) => queue.add(files))

const item = computed(() => items.value[0] ?? null)
const ready = computed(() => item.value?.status === 'ok')

const password = ref('')
const confirmation = ref('')
const submitted = ref(false)
const passwordField = ref<{ focus: () => void } | null>(null)
const confirmField = ref<{ focus: () => void } | null>(null)

const strength = computed(() => passwordStrength(password.value))
const STRENGTH: Record<Exclude<PasswordStrength, 'empty'>, { key: string; bars: number; color: string }> = {
  weak: { key: 'tools.protect.strengthWeak', bars: 1, color: 'bg-danger' },
  fair: { key: 'tools.protect.strengthFair', bars: 2, color: 'bg-gold-500' },
  strong: { key: 'tools.protect.strengthStrong', bars: 3, color: 'bg-success' },
  'very-strong': { key: 'tools.protect.strengthVeryStrong', bars: 4, color: 'bg-success' },
}
const strengthInfo = computed(() => (strength.value === 'empty' ? null : STRENGTH[strength.value]))

const passwordError = computed(() => (submitted.value && !password.value ? t('tools.protect.required') : null))
const confirmError = computed(() => {
  const showMismatch = confirmation.value.length > 0 || submitted.value
  return showMismatch && password.value && confirmation.value !== password.value ? t('tools.protect.mismatch') : null
})

const errorText = computed(() => (error.value ? errorMessage(error.value.code) : null))

async function protect() {
  submitted.value = true
  if (!ready.value || !item.value) return
  if (!password.value) return passwordField.value?.focus()
  if (password.value !== confirmation.value) return confirmField.value?.focus()

  const file = item.value.file
  const name = item.value.name
  const secret = password.value

  await run(async (onProgress): Promise<WorkerResult<ToolOutput>> => {
    const bytes = new Uint8Array(await file.arrayBuffer())
    const result = await pdf.worker().protect(
      pdf.transfer(bytes, [bytes.buffer as ArrayBuffer]),
      secret,
      pdf.callback(onProgress),
    )
    if (!result.ok) return result
    return {
      ok: true,
      value: {
        blob: new Blob([result.value as Uint8Array<ArrayBuffer>], { type: 'application/pdf' }),
        fileName: withSuffix(name, t('tools.protect.fileSuffix')),
        detail: t('tools.protect.doneDetail'),
      },
    }
  })
  // Una vez creado el archivo, la contraseña ya no se necesita en la página.
  if (phase.value === 'done') clearPasswords()
}

function clearPasswords() {
  password.value = ''
  confirmation.value = ''
  submitted.value = false
}

function processAnother() {
  reset()
  queue.clear()
  clearPasswords()
}
</script>

<template>
  <ToolPage :tool="tool">
    <ToolResultPanel v-if="phase === 'done' && output" :title="t('tools.protect.doneTitle')" :output="output" @reset="processAnother" />

    <ToolProgressPanel v-else-if="phase === 'processing'" :label="t('tools.protect.processing')" :progress="progress" @cancel="cancel" />

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

        <form v-if="ready" class="card space-y-4 p-5" novalidate @submit.prevent="protect">
          <ToolPasswordField
            id="contrasena-nueva"
            ref="passwordField"
            v-model="password"
            :label="t('tools.protect.passwordLabel')"
            autocomplete="new-password"
            :error="passwordError"
            described-by="seguridad-contrasena"
            testid="password-input"
          />

          <div v-if="strengthInfo" id="seguridad-contrasena" class="space-y-1.5" aria-live="polite">
            <div class="grid grid-cols-4 gap-1.5" aria-hidden="true">
              <span
                v-for="n in 4"
                :key="n"
                class="h-1.5 rounded-full transition-colors"
                :class="n <= strengthInfo.bars ? strengthInfo.color : 'bg-line'"
              />
            </div>
            <p class="text-xs text-muted" data-testid="password-strength">
              {{ t('tools.protect.strength', { level: t(strengthInfo.key) }) }}
              <template v-if="strength === 'weak'"> {{ t('tools.protect.weakHint') }}</template>
            </p>
          </div>

          <ToolPasswordField
            id="contrasena-repetida"
            ref="confirmField"
            v-model="confirmation"
            :label="t('tools.protect.confirmLabel')"
            autocomplete="new-password"
            :error="confirmError"
            testid="confirm-input"
          />

          <p class="flex items-start gap-2 rounded-xl bg-sunken px-3 py-2.5 text-sm">
            <UiAppIcon name="protect" class="mt-px size-5 shrink-0 text-royal-600 dark:text-royal-300" />
            {{ t('tools.protect.aesNote') }}
          </p>

          <ToolAlertBox v-if="errorText" tone="error" :title="t('errors.title')">{{ errorText }}</ToolAlertBox>

          <button type="submit" class="btn-primary btn-lg w-full" data-testid="run-tool">
            <UiAppIcon name="protect" class="size-5" />
            {{ t('tools.protect.action') }}
          </button>
        </form>
      </div>
    </div>
  </ToolPage>
</template>
