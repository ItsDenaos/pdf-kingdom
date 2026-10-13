<script setup lang="ts">
/** Botón que alterna entre tema del sistema → claro → oscuro. */
const colorMode = useColorMode()
const { t } = useI18n()

const ORDER = ['system', 'light', 'dark'] as const
type Mode = (typeof ORDER)[number]

const current = computed<Mode>(() =>
  ORDER.includes(colorMode.preference as Mode) ? (colorMode.preference as Mode) : 'system',
)
const icon = computed(() => ({ system: 'monitor', light: 'sun', dark: 'moon' })[current.value])

function cycle() {
  const index = ORDER.indexOf(current.value)
  colorMode.preference = ORDER[(index + 1) % ORDER.length]!
}
</script>

<template>
  <ClientOnly>
    <button
      type="button"
      class="icon-btn"
      :aria-label="t('theme.toggle', { current: t(`theme.${current}`) })"
      :title="t('theme.toggle', { current: t(`theme.${current}`) })"
      @click="cycle"
    >
      <UiAppIcon :name="icon" class="size-5" />
    </button>
    <template #fallback>
      <span class="inline-block size-9" aria-hidden="true" />
    </template>
  </ClientOnly>
</template>
