<script setup lang="ts">
/** Sello de privacidad: recuerda que los archivos no salen del dispositivo. */
defineProps<{ compact?: boolean }>()
const { t } = useI18n()
</script>

<template>
  <div
    class="inline-flex items-start gap-3 rounded-2xl border border-success/25 bg-success-soft text-left text-success"
    :class="compact ? 'px-3 py-2' : 'px-4 py-3'"
  >
    <UiAppIcon name="shield" :class="compact ? 'mt-px size-5' : 'size-6'" class="shrink-0" />
    <p :class="compact ? 'text-sm' : 'text-sm sm:text-base'">
      <strong class="font-semibold">{{ t('privacy.claim') }}</strong>
      <span v-if="!compact" class="block text-sm font-normal opacity-90">{{ t('privacy.detail') }}</span>
    </p>
  </div>
</template>
