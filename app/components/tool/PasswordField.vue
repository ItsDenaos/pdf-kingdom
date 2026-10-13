<script setup lang="ts">
/**
 * Campo de contraseña con botón para mostrarla u ocultarla.
 * La contraseña solo vive en la memoria de la página: nunca se envía ni se guarda.
 */
const model = defineModel<string>({ required: true })
const props = withDefaults(
  defineProps<{
    id: string
    label: string
    /** "new-password" al crear una contraseña; "off" al escribir una existente. */
    autocomplete?: string
    error?: string | null
    describedBy?: string
    testid?: string
  }>(),
  { autocomplete: 'off', error: null, describedBy: undefined, testid: undefined },
)
const { t } = useI18n()
const visible = ref(false)
const input = ref<HTMLInputElement | null>(null)

defineExpose({
  focus: () => {
    input.value?.focus()
    input.value?.select()
  },
})
</script>

<template>
  <div>
    <label :for="props.id" class="field-label">{{ props.label }}</label>
    <div class="relative">
      <input
        :id="props.id"
        ref="input"
        v-model="model"
        :type="visible ? 'text' : 'password'"
        class="field-input pr-12"
        :class="props.error ? 'border-danger focus:border-danger focus:ring-danger/30' : ''"
        :autocomplete="props.autocomplete"
        autocapitalize="off"
        spellcheck="false"
        :aria-invalid="!!props.error"
        :aria-describedby="[props.error ? `${props.id}-error` : '', props.describedBy ?? ''].join(' ').trim() || undefined"
        :data-testid="props.testid"
      />
      <button
        type="button"
        class="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-r-xl text-muted hover:text-ink"
        :aria-label="visible ? t('common.hidePassword') : t('common.showPassword')"
        :aria-pressed="visible"
        @click="visible = !visible"
      >
        <UiAppIcon :name="visible ? 'eyeOff' : 'eye'" class="size-5" />
      </button>
    </div>
    <p v-if="props.error" :id="`${props.id}-error`" class="mt-1.5 text-sm font-medium text-danger" role="alert">
      {{ props.error }}
    </p>
  </div>
</template>
