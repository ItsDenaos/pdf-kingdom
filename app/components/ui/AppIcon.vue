<script setup lang="ts">
/**
 * Iconos propios de PDF Kingdom (trazos de 24×24 dibujados para este proyecto).
 * Uso: <UiAppIcon name="merge" class="size-6" />
 */
const props = defineProps<{
  name: string
  /** Texto para lectores de pantalla. Sin él, el icono es decorativo. */
  label?: string
}>()

const ICONS: Record<string, string> = {
  // Interfaz
  upload:
    '<path d="M12 15V4"/><path d="m7.5 8.5 4.5-4.5 4.5 4.5"/><path d="M4 14v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4"/>',
  download:
    '<path d="M12 4v11"/><path d="m7.5 10.5 4.5 4.5 4.5-4.5"/><path d="M4 14v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  close: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
  trash:
    '<path d="M4 7h16"/><path d="M9.5 7V4.5h5V7"/><path d="m6.5 7 .8 12a1.8 1.8 0 0 0 1.8 1.7h5.8a1.8 1.8 0 0 0 1.8-1.7l.8-12"/><path d="M10 11v5.5M14 11v5.5"/>',
  grip: '<g fill="currentColor" stroke="none"><circle cx="9" cy="6" r="1.4"/><circle cx="15" cy="6" r="1.4"/><circle cx="9" cy="12" r="1.4"/><circle cx="15" cy="12" r="1.4"/><circle cx="9" cy="18" r="1.4"/><circle cx="15" cy="18" r="1.4"/></g>',
  arrowUp: '<path d="M12 19V5"/><path d="m6 11 6-6 6 6"/>',
  arrowDown: '<path d="M12 5v14"/><path d="m6 13 6 6 6-6"/>',
  arrowLeft: '<path d="M19 12H5"/><path d="m11 6-6 6 6 6"/>',
  arrowRight: '<path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>',
  moon: '<path d="M19.5 14.6A8 8 0 1 1 9.4 4.5a6.4 6.4 0 0 0 10.1 10.1z"/>',
  monitor: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8.5 20h7M12 16v4"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  checkCircle: '<circle cx="12" cy="12" r="9"/><path d="m8 12.3 2.8 2.8 5.4-5.6"/>',
  alert:
    '<path d="M10.3 4.2 2.9 17.6A2 2 0 0 0 4.6 20.5h14.8a2 2 0 0 0 1.7-2.9L13.7 4.2a2 2 0 0 0-3.4 0z"/><path d="M12 9.5v4.5"/><circle cx="12" cy="17" r=".6" fill="currentColor"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5"/><circle cx="12" cy="7.9" r=".6" fill="currentColor"/>',
  shield:
    '<path d="M12 2.8 4.5 5.8v5.7c0 4.6 3.1 8.3 7.5 9.7 4.4-1.4 7.5-5.1 7.5-9.7V5.8z"/><path d="m8.7 12 2.3 2.3 4.4-4.6"/>',
  refresh:
    '<path d="M19.5 10.5A7.7 7.7 0 0 0 5.8 7L4.5 8.5"/><path d="M4.5 4v4.5H9"/><path d="M4.5 13.5A7.7 7.7 0 0 0 18.2 17l1.3-1.5"/><path d="M19.5 20v-4.5H15"/>',
  eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
  eyeOff:
    '<path d="M9.9 5.8A9.6 9.6 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-2.6 3.4"/><path d="M6.4 7.4C3.9 9.1 2.5 12 2.5 12S6 18.5 12 18.5c1.8 0 3.3-.5 4.6-1.3"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/><path d="m3 3 18 18"/>',
  rotateLeft:'<path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3"/><path d="M4.2 3.5v3.7h3.7"/>',
  rotateRight: '<path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3"/><path d="M19.8 3.5v3.7h-3.7"/>',
  sortAz:'<path d="M4 6h9M4 12h6.5M4 18h4"/><path d="M17.5 5v14"/><path d="m14.5 16 3 3 3-3"/>',
  file: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/>',
  archive:
    '<rect x="3.5" y="4" width="17" height="5" rx="1.2"/><path d="M5 9v9.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V9"/><path d="M10 13h4"/>',
  crown: '<path d="M4.5 17 3 7.5l5 3.8L12 4.5l4 6.8 5-3.8L19.5 17z"/><path d="M5 20.5h14"/>',
  userOff:
    '<circle cx="12" cy="8" r="3.5"/><path d="M5 20a7 7 0 0 1 11.2-5.6"/><path d="m16.5 16.5 4 4M20.5 16.5l-4 4"/>',
  cookieOff:
    '<path d="M20.5 12.5A8.5 8.5 0 1 1 11.5 3.5a3 3 0 0 0 4 3.5 3 3 0 0 0 5 5.5z"/><circle cx="8.5" cy="10" r=".8" fill="currentColor"/><circle cx="12" cy="15" r=".8" fill="currentColor"/><path d="m3 3 18 18"/>',
  gift: '<rect x="3.5" y="8" width="17" height="4.5" rx="1"/><path d="M5 12.5v7a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-7"/><path d="M12 8v12.5"/><path d="M12 8C10.5 4.5 7 4.5 7 6.5S10 8 12 8zM12 8c1.5-3.5 5-3.5 5-1.5S14 8 12 8z"/>',

  // Herramientas
  merge:
    '<rect x="2.5" y="3" width="7" height="7.5" rx="1.5"/><rect x="2.5" y="13.5" width="7" height="7.5" rx="1.5"/><path d="M9.5 6.75h1.5a1.5 1.5 0 0 1 1.5 1.5v7.5a1.5 1.5 0 0 1-1.5 1.5H9.5"/><path d="M12.5 12h2"/><rect x="14.5" y="7.5" width="7" height="9" rx="1.5"/>',
  split:
    '<rect x="2.5" y="7.5" width="7" height="9" rx="1.5"/><path d="M9.5 12h2"/><path d="M14.5 6.75H13a1.5 1.5 0 0 0-1.5 1.5v7.5a1.5 1.5 0 0 0 1.5 1.5h1.5"/><rect x="14.5" y="3" width="7" height="7.5" rx="1.5"/><rect x="14.5" y="13.5" width="7" height="7.5" rx="1.5"/>',
  rotate:
    '<rect x="8.5" y="9" width="10" height="12.5" rx="1.8"/><path d="M3.5 13A8.5 8.5 0 0 1 14.6 4.4"/><path d="m12.2 1.9 2.6 2.5-2.5 2.7"/>',
  compress:
    '<path d="M12 2.5v7"/><path d="m8.8 6.6 3.2 3.2 3.2-3.2"/><path d="M12 21.5v-7"/><path d="m8.8 17.4 3.2-3.2 3.2 3.2"/><path d="M4.5 12h15"/>',
  unlock:
    '<rect x="4.5" y="10.5" width="15" height="10.5" rx="2"/><path d="M8 10.5V7a4 4 0 0 1 7.6-1.8"/><path d="M12 14.5v2.5"/>',
  protect:
    '<rect x="4.5" y="10.5" width="15" height="10.5" rx="2"/><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5"/><path d="M12 14.5v2.5"/>',
  jpgToPdf:
    '<rect x="2.5" y="4" width="9.5" height="8.5" rx="1.5"/><path d="m2.5 11 3-2.8 2.4 2.1 1.3-1 2.8 2.4"/><circle cx="8.6" cy="6.9" r=".9"/><path d="M14.5 8.2h1.8a1.7 1.7 0 0 1 1.7 1.7v.6"/><path d="m16.3 9.2 1.7 1.7 1.7-1.7"/><path d="M12 13.5h5.5l3 3V21a1 1 0 0 1-1 1H13a1 1 0 0 1-1-1z"/>',
  pdfToJpg:
    '<path d="M3.5 2h5.5l3 3v6.5a1 1 0 0 1-1 1H4.5a1 1 0 0 1-1-1z"/><path d="M14.5 6.7h1.8A1.7 1.7 0 0 1 18 8.4v1.1"/><path d="m16.3 7.8 1.7 1.7 1.7-1.7"/><rect x="11" y="12.5" width="10.5" height="9" rx="1.5"/><path d="m11 20 3.2-3 2.5 2.2 1.4-1.1 3.4 2.9"/><circle cx="17.8" cy="15.4" r=".9"/>',
}

const svgInner = computed(() => ICONS[props.name] ?? ICONS.file!)
</script>

<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.75"
    stroke-linecap="round"
    stroke-linejoin="round"
    :role="label ? 'img' : undefined"
    :aria-label="label"
    :aria-hidden="label ? undefined : 'true'"
    focusable="false"
    v-html="svgInner"
  />
</template>
