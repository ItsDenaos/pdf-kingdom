<script setup lang="ts">
import { TOOLS } from '~/data/tools'

const { t } = useI18n()
const year = new Date().getFullYear()
const tools = TOOLS.filter((tool) => tool.available)
</script>

<template>
  <footer class="mt-24 border-t border-line bg-sunken/60">
    <div class="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr]">
      <div class="max-w-sm">
        <div class="flex items-center gap-2.5">
          <LayoutBrandMark class="size-8" />
          <span class="font-display text-lg font-semibold">PDF Kingdom</span>
        </div>
        <p class="mt-3 text-sm text-muted">{{ t('footer.about') }}</p>
        <p class="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-success">
          <UiAppIcon name="shield" class="size-5" />
          {{ t('privacy.claim') }}
        </p>
      </div>

      <nav :aria-label="t('footer.toolsTitle')">
        <h2 class="text-sm font-semibold uppercase tracking-wider text-muted">
          {{ t('footer.toolsTitle') }}
        </h2>
        <ul class="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <li v-for="tool in tools" :key="tool.id">
            <NuxtLink :to="tool.path" class="hover:text-accent hover:underline">
              {{ t(`tools.${tool.key}.name`) }}
            </NuxtLink>
          </li>
        </ul>
      </nav>
    </div>
    <div class="border-t border-line/70 py-5 text-center text-xs text-muted">
      {{ t('footer.copyright', { year }) }} · {{ t('privacy.detail') }} ·
      <NuxtLink to="/privacidad" class="font-semibold underline-offset-2 hover:text-ink hover:underline">
        {{ t('footer.privacy') }}
      </NuxtLink>
    </div>
  </footer>
</template>
