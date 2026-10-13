<script setup lang="ts">
import { insertNodeAt, removeNode, useSortable } from '@vueuse/integrations/useSortable'
import type { QueueItem } from '~/composables/useFileQueue'
import { formatBytes } from '~/lib/format'

/**
 * Tarjetas de archivos con miniatura. Se reordenan arrastrando (ratón o dedo)
 * o con los botones de flecha (teclado y lectores de pantalla).
 */
const props = defineProps<{
  items: QueueItem[]
  sortable?: boolean
}>()
const emit = defineEmits<{
  remove: [id: string]
  move: [from: number, to: number]
}>()
const { t, locale } = useI18n()
const { statusMessage } = useErrorMessage()

const list = ref<HTMLElement | null>(null)
const announcement = ref('')

if (props.sortable) {
  useSortable(list, [], {
    watchElement: true,
    handle: '[data-drag-handle]',
    animation: 160,
    ghostClass: 'opacity-40',
    // Sortable mueve el DOM por su cuenta: lo deshacemos y dejamos que Vue lo pinte
    // a partir del nuevo orden de la lista.
    onUpdate: (event) => {
      const { oldIndex, newIndex, item, from } = event
      if (oldIndex == null || newIndex == null) return
      removeNode(item)
      insertNodeAt(from, item, oldIndex)
      move(oldIndex, newIndex)
    },
  })
}

function move(from: number, to: number) {
  const item = props.items[from]
  if (!item || to < 0 || to >= props.items.length) return
  emit('move', from, to)
  announcement.value = t('common.moved', { name: item.name, position: to + 1, total: props.items.length })
}
</script>

<template>
  <div>
    <ol ref="list" class="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4" data-testid="file-list">
      <li
        v-for="(item, index) in props.items"
        :key="item.id"
        class="card relative flex flex-col overflow-hidden"
        :class="statusMessage(item.status, item.kind) ? 'border-danger/50 ring-1 ring-danger/30' : ''"
        data-testid="file-item"
      >
        <div class="relative flex aspect-[4/5] items-center justify-center bg-sunken p-3">
          <img
            v-if="item.thumbUrl"
            :src="item.thumbUrl"
            :alt="t(item.kind === 'image' ? 'common.imageAlt' : 'common.thumbAlt', { name: item.name })"
            class="max-h-full max-w-full rounded-sm bg-white object-contain shadow-md ring-1 ring-black/5"
            draggable="false"
          />
          <UiAppIcon
            v-else
            name="file"
            class="size-12 text-royal-300"
            :class="item.status === 'checking' ? 'animate-pulse' : ''"
          />
          <span
            v-if="props.sortable"
            class="absolute left-2 top-2 grid size-7 place-items-center rounded-full bg-accent text-xs font-bold text-on-accent shadow"
            :aria-label="t('common.position', { n: index + 1 })"
          >
            {{ index + 1 }}
          </span>
          <button
            type="button"
            class="absolute right-2 top-2 grid size-8 place-items-center rounded-full bg-raised/95 text-muted shadow ring-1 ring-line hover:text-danger"
            :aria-label="t('common.remove', { name: item.name })"
            data-testid="remove-file"
            @click="emit('remove', item.id)"
          >
            <UiAppIcon name="trash" class="size-4" />
          </button>
        </div>

        <div class="flex flex-1 flex-col gap-1 p-3">
          <p class="truncate text-sm font-semibold" :title="item.name">{{ item.name }}</p>
          <p class="text-xs text-muted">
            {{ formatBytes(item.size, locale) }}
            <template v-if="item.status === 'checking'"> · {{ t('common.checking') }}</template>
            <template v-else-if="item.kind === 'image' && item.width"> · {{ item.width }} × {{ item.height }} px</template>
            <template v-else-if="item.pageCount"> · {{ t('common.pages', item.pageCount) }}</template>
          </p>
          <p v-if="statusMessage(item.status, item.kind)" class="text-xs font-medium text-danger" data-testid="file-error">
            {{ statusMessage(item.status, item.kind) }}
          </p>
          <p v-else-if="item.large" class="text-xs font-medium text-warning">
            {{ t('common.largeFile', { size: formatBytes(item.size, locale) }) }}
          </p>

          <div v-if="props.sortable" class="mt-auto flex items-center justify-between pt-2">
            <span
              data-drag-handle
              class="icon-btn cursor-grab touch-none active:cursor-grabbing"
              :title="t('common.dragHandle', { name: item.name })"
              aria-hidden="true"
            >
              <UiAppIcon name="grip" class="size-5" />
            </span>
            <div class="flex gap-1">
              <button
                type="button"
                class="icon-btn"
                :disabled="index === 0"
                :aria-label="t('common.moveBefore', { name: item.name })"
                @click="move(index, index - 1)"
              >
                <UiAppIcon name="arrowLeft" class="size-4" />
              </button>
              <button
                type="button"
                class="icon-btn"
                :disabled="index === props.items.length - 1"
                :aria-label="t('common.moveAfter', { name: item.name })"
                @click="move(index, index + 1)"
              >
                <UiAppIcon name="arrowRight" class="size-4" />
              </button>
            </div>
          </div>
        </div>
      </li>
    </ol>
    <p class="sr-only" aria-live="polite">{{ announcement }}</p>
  </div>
</template>
