import type { PDFDocumentProxy } from 'pdfjs-dist'
import { isLargeFile, looksLikePdf } from '../lib/files'
import { displaySize, readImageInfo, sniffImageType } from '../lib/images'
import {
  openPreview,
  renderImageThumbnail,
  type BlockedAction,
  renderThumbnail,
  thumbnailQueue,
  type PreviewStatus,
} from './usePdfPreview'

export type QueueStatus = 'checking' | PreviewStatus
export type QueueKind = 'pdf' | 'image'

export interface QueueItem {
  id: string
  kind: QueueKind
  file: File
  name: string
  size: number
  /** Supera el umbral de "archivo grande" (100 MB). */
  large: boolean
  status: QueueStatus
  pageCount: number
  thumbUrl: string | null
  /** Solo PDF con restricciones: qué acciones no permite. */
  blocked?: BlockedAction[]
  /** Solo imágenes: tamaño con el que se ve (con la orientación EXIF aplicada). */
  width?: number
  height?: number
}

export interface FileQueueOptions {
  /** Permite varios archivos (Unir) o solo uno (Dividir). */
  multiple?: boolean
  /** Mantiene abierto el documento de pdf.js para dibujar todas sus páginas. */
  keepDocs?: boolean
  /** Tipo de archivo que se acepta: PDF (por defecto) o imágenes JPG/PNG. */
  kind?: QueueKind
}

let nextId = 0

/**
 * Lista de archivos que el usuario ha elegido: los valida, cuenta sus páginas,
 * genera la miniatura y permite reordenarlos o quitarlos.
 */
export function useFileQueue(options: FileQueueOptions = {}) {
  const kind: QueueKind = options.kind ?? 'pdf'
  const items = ref<QueueItem[]>([])
  /** Nombres de archivos descartados por no ser del tipo aceptado (para avisar al usuario). */
  const rejected = ref<string[]>([])
  // Documentos de pdf.js abiertos. shallowReactive: Vue avisa de los cambios del mapa,
  // pero no envuelve los documentos (romperían sus campos privados).
  const docs = shallowReactive(new Map<string, PDFDocumentProxy>())

  const find = (id: string) => items.value.find((item) => item.id === id)

  const isChecking = computed(() => items.value.some((i) => i.status === 'checking'))
  const problemItems = computed(() =>
    items.value.filter((i) => i.status !== 'ok' && i.status !== 'checking'),
  )
  const readyItems = computed(() => items.value.filter((i) => i.status === 'ok'))
  const totalPages = computed(() => readyItems.value.reduce((sum, i) => sum + i.pageCount, 0))

  async function add(files: FileList | File[]) {
    rejected.value = []
    const incoming = options.multiple ? Array.from(files) : Array.from(files).slice(0, 1)
    const accepted: QueueItem[] = []

    for (const file of incoming) {
      const valid = kind === 'pdf' ? await looksLikePdf(file) : (await sniffImageType(file)) !== null
      if (!valid) {
        rejected.value.push(file.name)
        continue
      }
      accepted.push({
        id: `archivo-${++nextId}`,
        kind,
        file,
        name: file.name,
        size: file.size,
        large: isLargeFile(file.size),
        status: 'checking',
        pageCount: 0,
        thumbUrl: null,
      })
    }

    if (!accepted.length) return
    if (!options.multiple) clear()
    items.value.push(...accepted)
    await Promise.all(accepted.map((item) => inspect(item.id)))
  }

  async function inspect(id: string) {
    const item = find(id)
    if (!item) return
    if (item.kind === 'image') return inspectImage(id, item.file)

    const preview = await openPreview(item.file)
    const current = find(id)
    if (!current) {
      // Lo quitaron mientras se revisaba.
      void preview.doc?.loadingTask.destroy()
      return
    }
    current.status = preview.status
    current.pageCount = preview.pageCount
    current.blocked = preview.blocked

    const doc = preview.doc
    if (!doc) return
    if (options.keepDocs) docs.set(id, markRaw(doc))

    try {
      const url = await thumbnailQueue(() => renderThumbnail(doc, 1, 96))
      const stillThere = find(id)
      if (stillThere) stillThere.thumbUrl = url
      else URL.revokeObjectURL(url)
    } catch {
      // Sin miniatura no pasa nada: se muestra un icono genérico.
    }

    if (!options.keepDocs) void doc.loadingTask.destroy()
  }

  /** Comprueba que la imagen se puede leer, guarda su tamaño y crea la miniatura. */
  async function inspectImage(id: string, file: File) {
    const info = readImageInfo(new Uint8Array(await file.arrayBuffer()))
    let url: string | null = null
    if (info) {
      try {
        url = await thumbnailQueue(() => renderImageThumbnail(file, 120))
      } catch {
        url = null // el navegador no pudo decodificarla: está dañada
      }
    }
    const current = find(id)
    if (!current) {
      if (url) URL.revokeObjectURL(url)
      return
    }
    if (!info || !url) {
      current.status = 'corrupt'
      return
    }
    const shown = displaySize(info)
    current.width = shown.width
    current.height = shown.height
    current.thumbUrl = url
    current.pageCount = 1
    current.status = 'ok'
  }

  function release(item: QueueItem) {
    if (item.thumbUrl) URL.revokeObjectURL(item.thumbUrl)
    const doc = docs.get(item.id)
    if (doc) {
      void doc.loadingTask.destroy()
      docs.delete(item.id)
    }
  }

  function remove(id: string) {
    const index = items.value.findIndex((i) => i.id === id)
    if (index === -1) return
    release(items.value[index]!)
    items.value.splice(index, 1)
  }

  function move(from: number, to: number) {
    if (to < 0 || to >= items.value.length || from === to) return
    const [moved] = items.value.splice(from, 1)
    items.value.splice(to, 0, moved!)
  }

  function sortByName() {
    items.value.sort((a, b) => a.name.localeCompare(b.name, 'es', { numeric: true }))
  }

  function clear() {
    for (const item of items.value) release(item)
    items.value = []
  }

  onScopeDispose(clear)

  return {
    items,
    rejected,
    isChecking,
    problemItems,
    readyItems,
    totalPages,
    add,
    remove,
    move,
    sortByName,
    clear,
    getDoc: (id: string) => docs.get(id) ?? null,
  }
}
