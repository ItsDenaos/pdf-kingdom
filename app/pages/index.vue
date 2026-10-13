<script setup lang="ts">
import { TOOLS } from '~/data/tools'

const { t } = useI18n()
const { siteUrl } = useRuntimeConfig().public

useSeoMeta({
  title: t('home.seoTitle'),
  description: t('home.seoDescription'),
  ogTitle: `PDF Kingdom · ${t('home.seoTitle')}`,
  ogDescription: t('home.seoDescription'),
})

const faqNumbers = [1, 2, 3, 4, 5] as const

// Datos estructurados: el sitio y sus preguntas frecuentes (los buscadores pueden mostrarlas).
useHead({
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'WebSite',
            name: 'PDF Kingdom',
            url: `${siteUrl}/`,
            inLanguage: 'es',
            description: t('home.seoDescription'),
          },
          {
            '@type': 'FAQPage',
            mainEntity: faqNumbers.map((n) => ({
              '@type': 'Question',
              name: t(`home.faq${n}Q`),
              acceptedAnswer: { '@type': 'Answer', text: t(`home.faq${n}A`) },
            })),
          },
        ],
      }),
    },
  ],
})

const privacyPoints = [
  { icon: 'shield', title: 'home.privacy1Title', text: 'home.privacy1Text' },
  { icon: 'userOff', title: 'home.privacy2Title', text: 'home.privacy2Text' },
  { icon: 'protect', title: 'home.privacy3Title', text: 'home.privacy3Text' },
]

const trust = [
  { icon: 'shield', key: 'home.trustLocal' },
  { icon: 'userOff', key: 'home.trustSignup' },
  { icon: 'cookieOff', key: 'home.trustCookies' },
  { icon: 'gift', key: 'home.trustFree' },
]

const steps = [1, 2, 3] as const
</script>

<template>
  <div>
    <!-- Portada -->
    <section class="relative isolate overflow-hidden">
      <div
        aria-hidden="true"
        class="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60rem_30rem_at_15%_-10%,rgb(131_80_214/0.22),transparent_60%),radial-gradient(40rem_24rem_at_95%_0%,rgb(233_176_47/0.20),transparent_60%)]"
      />
      <div class="mx-auto max-w-6xl px-4 pb-14 pt-14 sm:px-6 sm:pt-20">
        <p
          class="inline-flex items-center gap-2 rounded-full border border-gold-300/60 bg-gold-50/80 px-3 py-1 text-xs font-semibold text-gold-800 dark:border-gold-700/50 dark:bg-gold-900/30 dark:text-gold-200"
        >
          <UiAppIcon name="crown" class="size-4" />
          {{ t('home.eyebrow') }}
        </p>
        <h1 class="mt-5 max-w-3xl font-display text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
          {{ t('home.title') }}
          <span
            class="block bg-linear-to-r from-royal-600 via-royal-500 to-gold-600 bg-clip-text text-transparent dark:from-royal-300 dark:via-royal-200 dark:to-gold-300"
          >
            {{ t('home.titleAccent') }}
          </span>
        </h1>
        <p class="mt-5 max-w-2xl text-lg text-muted">{{ t('home.lead') }}</p>

        <div class="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
          <a href="#herramientas" class="btn-primary btn-lg w-full sm:w-auto">
            {{ t('home.cta') }}
            <UiAppIcon name="arrowDown" class="size-5" />
          </a>
          <UiPrivacyBadge compact />
        </div>

        <ul class="mt-10 grid grid-cols-2 gap-3 text-sm sm:flex sm:flex-wrap sm:gap-6">
          <li v-for="item in trust" :key="item.key" class="flex items-center gap-2 text-muted">
            <UiAppIcon :name="item.icon" class="size-5 shrink-0 text-crown-ink" />
            {{ t(item.key) }}
          </li>
        </ul>
      </div>
    </section>

    <!-- Herramientas -->
    <section id="herramientas" class="mx-auto max-w-6xl scroll-mt-20 px-4 sm:px-6" aria-labelledby="titulo-herramientas">
      <h2 id="titulo-herramientas" class="font-display text-2xl font-semibold sm:text-3xl">
        {{ t('home.toolsTitle') }}
      </h2>
      <ul class="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <li v-for="tool in TOOLS" :key="tool.id">
          <HomeToolCard :tool="tool" />
        </li>
      </ul>
    </section>

    <!-- Cómo funciona -->
    <section class="mx-auto mt-20 max-w-6xl px-4 sm:px-6" aria-labelledby="titulo-como">
      <h2 id="titulo-como" class="font-display text-2xl font-semibold sm:text-3xl">{{ t('home.howTitle') }}</h2>
      <ol class="mt-6 grid gap-4 md:grid-cols-3">
        <li v-for="n in steps" :key="n" class="card p-6">
          <span
            class="grid size-9 place-items-center rounded-full bg-accent font-display text-lg font-semibold text-on-accent"
            aria-hidden="true"
          >
            {{ n }}
          </span>
          <h3 class="mt-4 text-lg font-bold">{{ t(`home.how${n}Title`) }}</h3>
          <p class="mt-1 text-muted">{{ t(`home.how${n}Text`) }}</p>
        </li>
      </ol>
    </section>

    <!-- Privacidad -->
    <section class="mx-auto mt-20 max-w-6xl px-4 sm:px-6" aria-labelledby="titulo-privacidad">
      <div class="relative overflow-hidden rounded-3xl bg-royal-900 px-6 py-10 text-white sm:px-10 sm:py-14 dark:bg-royal-950">
        <div
          aria-hidden="true"
          class="pointer-events-none absolute -right-24 -top-24 size-80 rounded-full bg-gold-400/20 blur-3xl"
        />
        <h2 id="titulo-privacidad" class="relative font-display text-2xl font-semibold sm:text-3xl">
          {{ t('home.privacyTitle') }}
        </h2>
        <p class="relative mt-3 max-w-2xl text-royal-100">{{ t('home.privacyLead') }}</p>
        <ul class="relative mt-8 grid gap-6 md:grid-cols-3">
          <li v-for="item in privacyPoints" :key="item.title">
            <span class="grid size-11 place-items-center rounded-xl bg-white/10 text-gold-300">
              <UiAppIcon :name="item.icon" class="size-6" />
            </span>
            <h3 class="mt-3 text-lg font-bold">{{ t(item.title) }}</h3>
            <p class="mt-1 text-royal-100">{{ t(item.text) }}</p>
          </li>
        </ul>
        <NuxtLink
          to="/privacidad"
          class="relative mt-8 inline-flex items-center gap-2 font-semibold text-gold-300 underline-offset-4 hover:underline"
        >
          {{ t('home.privacyLink') }}
          <UiAppIcon name="arrowRight" class="size-4" />
        </NuxtLink>
      </div>
    </section>

    <!-- Preguntas frecuentes -->
    <section class="mx-auto mt-20 max-w-3xl px-4 sm:px-6" aria-labelledby="titulo-faq">
      <h2 id="titulo-faq" class="font-display text-2xl font-semibold sm:text-3xl">{{ t('home.faqTitle') }}</h2>
      <div class="mt-6 space-y-3">
        <details v-for="n in faqNumbers" :key="n" class="card group p-0" data-testid="faq-item">
          <summary
            class="flex cursor-pointer list-none items-center justify-between gap-4 rounded-2xl px-5 py-4 font-semibold [&::-webkit-details-marker]:hidden"
          >
            {{ t(`home.faq${n}Q`) }}
            <UiAppIcon name="plus" class="size-5 shrink-0 text-muted transition-transform group-open:rotate-45" />
          </summary>
          <p class="px-5 pb-5 text-muted">{{ t(`home.faq${n}A`) }}</p>
        </details>
      </div>
    </section>
  </div>
</template>
