<script setup lang="ts">
const route = useRoute()
const { t } = useI18n()
const { siteUrl } = useRuntimeConfig().public

// Dirección "oficial" de cada página (sin barra final), para buscadores y redes sociales.
const canonical = computed(() => (route.path === '/' ? `${siteUrl}/` : `${siteUrl}${route.path.replace(/\/$/, '')}`))
const ogImage = `${siteUrl}/og-image.png`

useHead({
  link: [{ rel: 'canonical', href: canonical }],
})

useSeoMeta({
  ogUrl: canonical,
  ogType: 'website',
  ogSiteName: 'PDF Kingdom',
  ogLocale: 'es_ES',
  ogImage,
  ogImageWidth: 1200,
  ogImageHeight: 630,
  ogImageAlt: () => t('seo.ogImageAlt'),
  twitterCard: 'summary_large_image',
  twitterImage: ogImage,
})
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
