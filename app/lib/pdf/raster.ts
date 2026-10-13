import { PdfKingdomError } from '../errors'
import { createPdf, savePdf } from './load'
import type { ProgressCallback } from './merge'

export interface RasterPage {
  /** Imagen JPEG de la página completa. */
  jpeg: Uint8Array
  /** Tamaño de la página en puntos PDF. */
  width: number
  height: number
}

/**
 * Compresión "extrema": crea un PDF nuevo en el que cada página es una foto de la original.
 * Es lo que más reduce, pero el texto deja de ser seleccionable.
 */
export async function rasterPagesToPdf(pages: RasterPage[], onProgress?: ProgressCallback): Promise<Uint8Array> {
  if (pages.length === 0) throw new PdfKingdomError('empty')
  const doc = await createPdf()
  for (const [i, { jpeg, width, height }] of pages.entries()) {
    const image = await doc.embedJpg(jpeg)
    const page = doc.addPage([width, height])
    page.drawImage(image, { x: 0, y: 0, width, height })
    onProgress?.((i + 1) / pages.length)
  }
  return savePdf(doc)
}
