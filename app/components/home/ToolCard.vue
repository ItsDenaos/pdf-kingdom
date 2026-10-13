<script setup lang="ts">
import { CATEGORY_STYLES, type ToolDef } from '~/data/tools'

const props = defineProps<{ tool: ToolDef }>()
const { t } = useI18n()
const tileClass = computed(() => CATEGORY_STYLES[props.tool.category])
// Las herramientas aún no disponibles se muestran como tarjeta sin enlace.
const NuxtLink = resolveComponent('NuxtLink')
</script>

<template>
  <component
    :is="tool.available ? NuxtLink : 'div'"
    :to="tool.available ? tool.path : undefined"
    :aria-disabled="tool.available ? undefined : 'true'"
    class="card group relative flex h-full flex-col gap-4 p-5 transition"
    :class="
      tool.available
        ? 'hover:-translate-y-0.5 hover:border-royal-300 hover:shadow-lg hover:shadow-royal-900/5 dark:hover:border-royal-600'
        : 'opacity-70'
    "
  >
    <div class="flex items-start justify-between gap-3">
      <span class="grid size-12 place-items-center rounded-xl" :class="tileClass">
        <UiAppIcon :name="tool.icon" class="size-7" />
      </span>
      <span
        v-if="!tool.available"
        class="rounded-full border border-line bg-sunken px-2.5 py-1 text-xs font-semibold text-muted"
      >
        {{ t('home.comingSoon') }}
      </span>
      <UiAppIcon
        v-else
        name="arrowRight"
        class="size-5 text-muted opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100"
      />
    </div>
    <div>
      <h3 class="text-lg font-bold">{{ t(`tools.${tool.key}.name`) }}</h3>
      <p class="mt-1 text-sm text-muted">{{ t(`tools.${tool.key}.short`) }}</p>
    </div>
  </component>
</template>
