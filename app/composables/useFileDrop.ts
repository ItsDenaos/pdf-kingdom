import { useEventListener } from '@vueuse/core'
import type { Ref } from 'vue'

/**
 * Convierte un elemento en zona para soltar archivos.
 * `isOver` indica si el usuario está arrastrando archivos encima (para resaltarla).
 */
export function useFileDrop(target: Ref<HTMLElement | null | undefined>, onFiles: (files: File[]) => void) {
  const isOver = ref(false)
  let depth = 0

  const hasFiles = (event: DragEvent) => Array.from(event.dataTransfer?.types ?? []).includes('Files')

  function onEnter(event: DragEvent) {
    if (!hasFiles(event)) return
    event.preventDefault()
    depth++
    isOver.value = true
  }
  function onOver(event: DragEvent) {
    if (!hasFiles(event)) return
    event.preventDefault()
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy'
  }
  function onLeave() {
    depth = Math.max(0, depth - 1)
    if (depth === 0) isOver.value = false
  }
  function onDrop(event: DragEvent) {
    if (!hasFiles(event)) return
    event.preventDefault()
    depth = 0
    isOver.value = false
    const files = Array.from(event.dataTransfer?.files ?? [])
    if (files.length) onFiles(files)
  }

  useEventListener(target, 'dragenter', onEnter)
  useEventListener(target, 'dragover', onOver)
  useEventListener(target, 'dragleave', onLeave)
  useEventListener(target, 'drop', onDrop)

  return { isOver }
}
