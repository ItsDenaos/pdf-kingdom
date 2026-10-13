<script setup lang="ts">
import type { NuxtError } from '#app'
import { TOOLS } from '~/data/tools'

/** Página de error (por ejemplo, "esta página no existe"), con las herramientas a mano. */
const props = defineProps<{ error: NuxtError }>()
const { t } = useI18n()

const notFound = computed(() => props.error.statusCode === 404)
useSeoMeta({
  title: () => t(notFound.value ? 'errorPage.notFoundSeoTitle' : 'errorPage.genericSeoTitle'),
  robots: 'noindex',
})
</script>

<template>
  <NuxtLayout>
    <div class="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6">
      <LayoutBrandMark class="mx-auto size-16" />
      <p class="mt-6 font-display text-6xl font-semibold text-crown-ink">{{ props.error.statusCode }}</p>
      <h1 class="mt-2 font-display text-3xl font-semibold sm:text-4xl">
        {{ t(notFound ? 'errorPage.notFoundTitle' : 'errorPage.genericTitle') }}
      </h1>
      <p class="mx-auto mt-3 max-w-xl text-muted">
        {{ t(notFound ? 'errorPage.notFoundText' : 'errorPage.genericText') }}
      </p>
      <NuxtLink to="/" class="btn-primary btn-lg mt-8">
        <UiAppIcon name="arrowLeft" class="size-5" />
        {{ t('errorPage.home') }}
      </NuxtLink>

      <h2 class="mt-14 font-display text-2xl font-semibold">{{ t('home.toolsTitle') }}</h2>
      <ul class="mt-6 grid gap-3 text-left sm:grid-cols-2 lg:grid-cols-4">
        <li v-for="tool in TOOLS" :key="tool.id">
          <HomeToolCard :tool="tool" />
        </li>
      </ul>
    </div>
  </NuxtLayout>
</template>
