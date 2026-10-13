<script setup lang="ts" generic="T extends string | number">
/**
 * Grupo de opciones (botones de radio con aspecto de tarjeta).
 * `compact` las muestra en fila, como un selector segmentado.
 */
interface OptionItem<V> {
  value: V
  label: string
  hint?: string
}

const model = defineModel<T>({ required: true })
const props = defineProps<{
  legend: string
  name: string
  options: OptionItem<T>[]
  disabled?: boolean
  compact?: boolean
}>()
</script>

<template>
  <fieldset :disabled="props.disabled">
    <legend class="field-label">{{ props.legend }}</legend>
    <div :class="props.compact ? 'grid auto-cols-fr grid-flow-col gap-1 rounded-xl bg-sunken p-1' : 'space-y-2'">
      <label
        v-for="option in props.options"
        :key="String(option.value)"
        class="cursor-pointer transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-crown has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60"
        :class="[
          props.compact
            ? 'grid place-items-center rounded-lg px-2 py-2 text-center text-sm font-semibold'
            : 'flex items-start gap-3 rounded-xl border p-3',
          model === option.value
            ? props.compact
              ? 'bg-raised text-accent shadow-sm ring-1 ring-line dark:text-royal-200'
              : 'border-royal-500 bg-royal-50 dark:bg-royal-900/40'
            : props.compact
              ? 'text-muted hover:text-ink'
              : 'border-line hover:bg-sunken',
        ]"
      >
        <input
          v-model="model"
          type="radio"
          :name="props.name"
          :value="option.value"
          :class="props.compact ? 'sr-only' : 'mt-1 accent-royal-600'"
        />
        <span v-if="props.compact">{{ option.label }}</span>
        <span v-else>
          <span class="block font-semibold">{{ option.label }}</span>
          <span v-if="option.hint" class="block text-sm text-muted">{{ option.hint }}</span>
        </span>
      </label>
    </div>
  </fieldset>
</template>
