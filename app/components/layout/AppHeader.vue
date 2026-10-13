<script setup lang="ts">
const { t } = useI18n()
</script>

<template>
  <header class="sticky top-0 z-30 border-b border-line/70 bg-surface/85 backdrop-blur-md">
    <div class="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
      <NuxtLink to="/" class="group flex items-center gap-2.5 rounded-lg" :aria-label="t('nav.home')">
        <LayoutBrandMark class="size-9 shrink-0 transition-transform group-hover:-rotate-6" />
        <span class="font-display text-xl font-semibold tracking-tight">
          PDF <span class="text-crown-ink">Kingdom</span>
        </span>
      </NuxtLink>

      <nav :aria-label="t('nav.main')" class="flex items-center gap-1">
        <NuxtLink to="/#herramientas" class="btn-ghost hidden sm:inline-flex">
          {{ t('nav.tools') }}
        </NuxtLink>
        <LayoutThemeToggle />
      </nav>
    </div>
  </header>
</template>
