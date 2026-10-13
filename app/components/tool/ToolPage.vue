<script setup lang="ts">
import { CATEGORY_STYLES, TOOLS, type ToolDef } from '~/data/tools'

/** Estructura común de cada herramienta: encabezado, zona de trabajo y "cómo se usa". */
const props = defineProps<{ tool: ToolDef }>()
const { t } = useI18n()
const steps = [1, 2, 3] as const
const related = computed(() => TOOLS.filter((tool) => tool.available && tool.id !== props.tool.id))
</script>

<template>
  <div class="mx-auto max-w-6xl px-4 pb-8 pt-6 sm:px-6 sm:pt-10">
    <NuxtLink to="/#herramientas" class="btn-ghost -ml-3 px-3">
      <UiAppIcon name="arrowLeft" class="size-4" />
      {{ t('nav.allTools') }}
    </NuxtLink>

    <header class="mt-4 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div class="flex items-start gap-4">
        <span class="grid size-14 shrink-0 place-items-center rounded-2xl" :class="CATEGORY_STYLES[props.tool.category]">
          <UiAppIcon :name="props.tool.icon" class="size-8" />
        </span>
        <div>
          <h1 class="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            {{ t(`tools.${props.tool.key}.heading`) }}
          </h1>
          <p class="mt-1.5 max-w-2xl text-muted sm:text-lg">{{ t(`tools.${props.tool.key}.lead`) }}</p>
        </div>
      </div>
      <UiPrivacyBadge compact class="shrink-0" />
    </header>

    <div class="mt-8">
      <slot />
    </div>

    <section class="mt-16" aria-labelledby="como-se-usa">
      <h2 id="como-se-usa" class="font-display text-xl font-semibold">{{ t('common.howTitle') }}</h2>
      <ol class="mt-4 grid gap-3 md:grid-cols-3">
        <li v-for="n in steps" :key="n" class="flex gap-3 rounded-2xl bg-sunken/70 p-4">
          <span
            class="grid size-7 shrink-0 place-items-center rounded-full bg-accent text-sm font-bold text-on-accent"
            aria-hidden="true"
          >
            {{ n }}
          </span>
          <p class="text-sm">{{ t(`tools.${props.tool.key}.step${n}`) }}</p>
        </li>
      </ol>
    </section>

    <nav class="mt-14" aria-labelledby="otras-herramientas">
      <h2 id="otras-herramientas" class="font-display text-xl font-semibold">{{ t('common.relatedTitle') }}</h2>
      <ul class="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        <li v-for="other in related" :key="other.id">
          <NuxtLink
            :to="other.path"
            class="flex items-center gap-3 rounded-xl border border-line bg-raised p-2.5 text-sm font-semibold transition hover:border-royal-300 hover:shadow-sm dark:hover:border-royal-600"
          >
            <span class="grid size-9 shrink-0 place-items-center rounded-lg" :class="CATEGORY_STYLES[other.category]">
              <UiAppIcon :name="other.icon" class="size-5" />
            </span>
            {{ t(`tools.${other.key}.name`) }}
          </NuxtLink>
        </li>
      </ul>
    </nav>
  </div>
</template>
