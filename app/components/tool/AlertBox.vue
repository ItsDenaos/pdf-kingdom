<script setup lang="ts">
/** Aviso destacado (error, advertencia o información). */
const props = withDefaults(
  defineProps<{
    tone?: 'error' | 'warning' | 'info'
    title?: string
    dismissible?: boolean
  }>(),
  { tone: 'error', title: undefined, dismissible: false },
)
defineEmits<{ dismiss: [] }>()
const { t } = useI18n()

const styles = {
  error: { box: 'border-danger/30 bg-danger-soft text-danger', icon: 'alert' },
  warning: { box: 'border-warning/30 bg-warning-soft text-warning', icon: 'alert' },
  info: { box: 'border-royal-300/50 bg-royal-50 text-royal-800 dark:bg-royal-900/40 dark:text-royal-100', icon: 'info' },
} as const
</script>

<template>
  <div
    :role="props.tone === 'error' ? 'alert' : 'status'"
    class="flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm"
    :class="styles[props.tone].box"
  >
    <UiAppIcon :name="styles[props.tone].icon" class="mt-px size-5 shrink-0" />
    <div class="min-w-0 flex-1">
      <p v-if="props.title" class="font-semibold">{{ props.title }}</p>
      <div :class="props.title ? 'mt-0.5' : ''"><slot /></div>
    </div>
    <button
      v-if="props.dismissible"
      type="button"
      class="-m-1 rounded-md p-1 opacity-70 hover:opacity-100"
      :aria-label="t('common.dismiss')"
      @click="$emit('dismiss')"
    >
      <UiAppIcon name="close" class="size-4" />
    </button>
  </div>
</template>
