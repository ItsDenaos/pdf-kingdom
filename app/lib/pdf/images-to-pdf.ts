import {
  concatTransformationMatrix,
  drawObject,
  popGraphicsState,
  pushGraphicsState,
  type PDFImage,
  type PDFPage,
} from '@cantoo/pdf-lib'
import { PdfKingdomError } from '../errors'
import { displaySize, orientationMatrix, readImageInfo } from '../images'
import { computeLayout, DEFAULT_IMAGE_OPTIONS, type ImagesToPdfOptions, type PageLayout } from '../page-layout'
import { createPdf, savePdf } from './load'
import type { ProgressCallback } from './merge'

export type { ImagesToPdfOptions } from '../page-layout'

/** Dibuja la imagen en el rectángulo indicado aplicando su orientación EXIF. */
function drawOriented(page: PDFPage, image: PDFImage, orientation: number, box: PageLayout) {
  const [a, b, c, d, e, f] = orientationMatrix(orientation)
  const { x, y, width: w, height: h } = box
  const name = page.node.newXObject('Image', image.ref)
  page.pushOperators(
    pushGraphicsState(),
    concatTransformationMatrix(w * a, h * b, w * c, h * d, x + w * e, y + h * f),
    drawObject(name),
    popGraphicsState(),
  )
}

/** Crea un PDF con una imagen (JPG o PNG) por página, en el orden recibido. */
export async function imagesToPdf(
  images: Uint8Array[],
  options: ImagesToPdfOptions = DEFAULT_IMAGE_OPTIONS,
  onProgress?: ProgressCallback,
): Promise<Uint8Array> {
  if (images.length === 0) throw new PdfKingdomError('empty')

  const doc = await createPdf()
  const steps = images.length + 1

  for (const [fileIndex, bytes] of images.entries()) {
    const info = readImageInfo(bytes)
    if (!info) {
      const known = bytes[0] === 0xff || bytes[0] === 0x89
      throw new PdfKingdomError(known ? 'corrupt' : 'invalid-format', { fileIndex })
    }

    let image: PDFImage
    try {
      image = info.type === 'jpeg' ? await doc.embedJpg(bytes) : await doc.embedPng(bytes)
    } catch (error) {
      throw new PdfKingdomError('corrupt', { fileIndex, cause: error })
    }

    const shown = displaySize({ width: image.width, height: image.height, orientation: info.orientation })
    const layout = computeLayout(shown.width, shown.height, options)
    const page = doc.addPage([layout.pageWidth, layout.pageHeight])
    drawOriented(page, image, info.orientation, layout)
    onProgress?.((fileIndex + 1) / steps)
  }

  const result = await savePdf(doc)
  onProgress?.(1)
  return result
}
