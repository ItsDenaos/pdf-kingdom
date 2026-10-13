import { degrees } from '@cantoo/pdf-lib'
import { normalizeAngle } from '../angles'
import { PdfKingdomError } from '../errors'
import { loadPdf } from './load'
import type { ProgressCallback } from './merge'

/**
 * Gira las páginas de un PDF. `rotations` indica cuántos grados girar cada página
 * (múltiplos de 90; positivo = a la derecha). Se respeta el giro que ya tuviera.
 * Se conserva el resto del documento (marcadores, formularios, metadatos).
 */
export async function rotatePdf(
  input: Uint8Array,
  rotations: number[],
  onProgress?: ProgressCallback,
): Promise<Uint8Array> {
  const doc = await loadPdf(input)
  const pages = doc.getPages()

  if (rotations.length !== pages.length || rotations.some((r) => !Number.isFinite(r) || r % 90 !== 0)) {
    throw new PdfKingdomError('invalid-options')
  }

  pages.forEach((page, i) => {
    const delta = normalizeAngle(rotations[i]!)
    if (delta === 0) return
    const current = normalizeAngle(page.getRotation().angle)
    page.setRotation(degrees(normalizeAngle(current + delta)))
  })
  onProgress?.(0.5)

  const result = await doc.save({ useObjectStreams: true })
  onProgress?.(1)
  return result
}
