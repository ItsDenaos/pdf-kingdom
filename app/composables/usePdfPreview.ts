import type { PDFDocumentProxy } from 'pdfjs-dist'

type PdfJs = typeof import('pdfjs-dist')

/**
 * Estado de un PDF tras abrirlo para la vista previa:
 * - ok: se puede usar
 * - restricted: se abre, pero tiene restricciones (contraseña de propietario)
 * - password: pide contraseña para abrirse
 * - corrupt: no se puede leer
 */
export type PreviewStatus = 'ok' | 'restricted' | 'password' | 'corrupt'

/** Acciones que un PDF con restricciones no permite. */
export type BlockedAction = 'print' | 'copy' | 'modify' | 'annotate'

export interface PreviewResult {
  status: PreviewStatus
  pageCount: number
  doc: PDFDocumentProxy | null
  blocked: BlockedAction[]
}

let pdfjsPromise: Promise<PdfJs> | null = null

/** Carga pdf.js solo cuando hace falta (no pesa en la carga inicial de la página). */
function loadPdfJs(): Promise<PdfJs> {
  pdfjsPromise ??= (async () => {
    const [lib, workerUrl] = await Promise.all([
      import('pdfjs-dist'),
      import('pdfjs-dist/build/pdf.worker.min.mjs?url').then((m) => m.default as string),
    ])
    lib.GlobalWorkerOptions.workerSrc = workerUrl
    return lib
  })()
  return pdfjsPromise
}

/** Abre un PDF con pdf.js para contar páginas, detectar protección y dibujar miniaturas. */
export async function openPreview(file: Blob): Promise<PreviewResult> {
  const pdfjs = await loadPdfJs()
  const data = new Uint8Array(await file.arrayBuffer())
  const task = pdfjs.getDocument({
    data,
    // Todos los recursos se sirven desde nuestro dominio: nada sale a internet.
    cMapUrl: '/pdfjs/cmaps/',
    cMapPacked: true,
    standardFontDataUrl: '/pdfjs/standard_fonts/',
    wasmUrl: '/pdfjs/wasm/',
    iccUrl: '/pdfjs/iccs/',
    enableXfa: false,
  })
  try {
    const doc = await task.promise
    // getPermissions() solo devuelve algo si el PDF está cifrado.
    const permissions = await doc.getPermissions()
    const allowed = new Set(permissions ?? [])
    const flags = pdfjs.PermissionFlag
    const blocked: BlockedAction[] = []
    if (permissions) {
      if (!allowed.has(flags.PRINT)) blocked.push('print')
      if (!allowed.has(flags.COPY)) blocked.push('copy')
      if (!allowed.has(flags.MODIFY_CONTENTS)) blocked.push('modify')
      if (!allowed.has(flags.MODIFY_ANNOTATIONS) && !allowed.has(flags.FILL_INTERACTIVE_FORMS)) blocked.push('annotate')
    }
    return { status: permissions ? 'restricted' : 'ok', pageCount: doc.numPages, doc, blocked }
  } catch (error) {
    // Sin `onPassword`, pdf.js rechaza con PasswordException si el PDF pide contraseña.
    const name = (error as { name?: string } | null)?.name
    const isPassword = error instanceof pdfjs.PasswordException || name === 'PasswordException'
    void task.destroy()
    return { status: isPassword ? 'password' : 'corrupt', pageCount: 0, doc: null, blocked: [] }
  }
}

/**
 * Dibuja una página en miniatura y devuelve una URL local (blob:) de la imagen.
 * Quien la reciba debe liberarla con URL.revokeObjectURL cuando ya no la use.
 */
export async function renderThumbnail(
  doc: PDFDocumentProxy,
  pageNumber: number,
  cssWidth = 120,
): Promise<string> {
  const page = await doc.getPage(pageNumber)
  try {
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2)
    const base = page.getViewport({ scale: 1 })
    const viewport = page.getViewport({ scale: (cssWidth * pixelRatio) / base.width })
    const canvas = document.createElement('canvas')
    canvas.width = Math.ceil(viewport.width)
    canvas.height = Math.ceil(viewport.height)
    await page.render({ canvas, viewport }).promise
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.82),
    )
    canvas.width = canvas.height = 0 // libera memoria en Safari
    if (!blob) throw new Error('thumbnail')
    return URL.createObjectURL(blob)
  } finally {
    page.cleanup()
  }
}

/** Límite de píxeles por imagen: Safari no permite lienzos mucho mayores (≈ 4096 × 4096). */
const MAX_CANVAS_PIXELS = 16_000_000

export interface RenderedImage {
  blob: Blob
  /** Tamaño de la imagen en píxeles. */
  width: number
  height: number
  /** Tamaño de la página en puntos PDF (ya girada si la página tenía giro). */
  pageWidth: number
  pageHeight: number
}

/**
 * Convierte una página en imagen JPG a la resolución indicada (ppp).
 * pdf.js interpreta el PDF en su propio worker; aquí solo se pinta el resultado.
 */
export async function renderPageToJpeg(
  doc: PDFDocumentProxy,
  pageNumber: number,
  dpi: number,
  quality = 0.88,
): Promise<RenderedImage> {
  const page = await doc.getPage(pageNumber)
  try {
    const base = page.getViewport({ scale: 1 }) // 1 unidad = 1 punto = 1/72 de pulgada
    let scale = dpi / 72
    const pixels = base.width * scale * base.height * scale
    if (pixels > MAX_CANVAS_PIXELS) scale *= Math.sqrt(MAX_CANVAS_PIXELS / pixels)

    const viewport = page.getViewport({ scale })
    const canvas = document.createElement('canvas')
    canvas.width = Math.floor(viewport.width)
    canvas.height = Math.floor(viewport.height)
    await page.render({ canvas, viewport, background: '#ffffff' }).promise
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
    const size = { width: canvas.width, height: canvas.height, pageWidth: base.width, pageHeight: base.height }
    canvas.width = canvas.height = 0
    if (!blob) throw new Error('render')
    return { blob, ...size }
  } finally {
    page.cleanup()
  }
}

/**
 * Miniatura pequeña de una foto (JPG/PNG). El navegador aplica la orientación EXIF.
 * Se reduce para no tener en memoria decenas de fotos a tamaño completo.
 */
export async function renderImageThumbnail(file: Blob, cssWidth = 120): Promise<string> {
  const source = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.src = source
    await img.decode()
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2)
    const scale = Math.min(1, (cssWidth * pixelRatio) / img.naturalWidth)
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale))
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale))
    canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
    // PNG conserva la transparencia de logotipos y capturas.
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
    canvas.width = canvas.height = 0
    if (!blob) throw new Error('thumbnail')
    return URL.createObjectURL(blob)
  } finally {
    URL.revokeObjectURL(source)
  }
}

/** Cola sencilla para no dibujar demasiadas miniaturas a la vez y mantener la página fluida. */
export function createRenderQueue(concurrency = 2) {
  let running = 0
  const pending: Array<() => void> = []

  const next = () => {
    if (running >= concurrency) return
    const start = pending.shift()
    if (start) start()
  }

  return function enqueue<T>(job: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      pending.push(() => {
        running++
        job()
          .then(resolve, reject)
          .finally(() => {
            running--
            next()
          })
      })
      next()
    })
  }
}

export const thumbnailQueue = createRenderQueue(2)
