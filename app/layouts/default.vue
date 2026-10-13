<script setup lang="ts">
const { t } = useI18n()
</script>

<template>
  <div class="flex min-h-dvh flex-col">
    <a
      href="#contenido"
      class="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-accent focus:px-4 focus:py-2 focus:text-on-accent"
    >
      {{ t('site.skipToContent') }}
    </a>
    <LayoutAppHeader />
    <main id="contenido" class="flex-1" tabindex="-1">
      <slot />
    </main>
    <LayoutAppFooter />
  </div>
</template>
