<script setup lang="ts">
/** Fecha de la última revisión de esta política (actualízala si cambia el texto). */
const UPDATED = new Date('2026-10-12T12:00:00Z')

const { t, locale } = useI18n()
const { contactEmail } = useRuntimeConfig().public

useSeoMeta({
  title: t('privacyPage.seoTitle'),
  description: t('privacyPage.seoDescription'),
  ogTitle: `${t('privacyPage.seoTitle')} · PDF Kingdom`,
  ogDescription: t('privacyPage.seoDescription'),
})

const updated = computed(() =>
  new Intl.DateTimeFormat(locale.value, { day: 'numeric', month: 'long', year: 'numeric' }).format(UPDATED),
)

// Cada sección: título y párrafos (o lista de puntos).
const sections = [
  { title: 's1Title', paragraphs: ['s1p1', 's1p2', 's1p3'], icon: 'shield' },
  { title: 's2Title', items: ['s2i1', 's2i2', 's2i3', 's2i4'], icon: 'cookieOff' },
  { title: 's3Title', paragraphs: ['s3p1'], icon: 'monitor' },
  { title: 's4Title', paragraphs: ['s4p1'], icon: 'archive' },
  { title: 's5Title', paragraphs: ['s5p1'], icon: 'userOff' },
  { title: 's6Title', paragraphs: ['s6p1'], icon: 'protect' },
  { title: 's7Title', paragraphs: ['s7p1'], icon: 'refresh' },
]
</script>

<template>
  <article class="mx-auto max-w-3xl px-4 pb-8 pt-8 sm:px-6 sm:pt-12">
    <NuxtLink to="/" class="btn-ghost -ml-3 px-3">
      <UiAppIcon name="arrowLeft" class="size-4" />
      {{ t('nav.home') }}
    </NuxtLink>

    <header class="mt-4">
      <h1 class="font-display text-3xl font-semibold tracking-tight sm:text-5xl">{{ t('privacyPage.heading') }}</h1>
      <p class="mt-2 text-sm text-muted">{{ t('privacyPage.updated', { date: updated }) }}</p>
      <div class="mt-6">
        <UiPrivacyBadge />
      </div>
      <p class="mt-6 text-lg">{{ t('privacyPage.lead') }}</p>
    </header>

    <div class="mt-10 space-y-6">
      <section v-for="section in sections" :key="section.title" class="card p-6">
        <h2 class="flex items-center gap-3 text-xl font-bold">
          <span class="grid size-9 shrink-0 place-items-center rounded-xl bg-royal-100 text-royal-700 dark:bg-royal-900/70 dark:text-royal-200">
            <UiAppIcon :name="section.icon" class="size-5" />
          </span>
          {{ t(`privacyPage.${section.title}`) }}
        </h2>
        <p v-for="p in section.paragraphs ?? []" :key="p" class="mt-3 leading-relaxed text-muted">
          {{ t(`privacyPage.${p}`) }}
        </p>
        <ul v-if="section.items" class="mt-3 space-y-2">
          <li v-for="item in section.items" :key="item" class="flex items-start gap-2 text-muted">
            <UiAppIcon name="check" class="mt-0.5 size-5 shrink-0 text-success" />
            {{ t(`privacyPage.${item}`) }}
          </li>
        </ul>
      </section>

      <section v-if="contactEmail" class="card p-6">
        <h2 class="text-xl font-bold">{{ t('privacyPage.contactTitle') }}</h2>
        <i18n-t keypath="privacyPage.contactText" tag="p" class="mt-3 text-muted">
          <template #email>
            <a :href="`mailto:${contactEmail}`" class="font-semibold text-accent underline">{{ contactEmail }}</a>
          </template>
        </i18n-t>
      </section>
    </div>
  </article>
</template>
