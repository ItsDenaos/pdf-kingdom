import { PdfKingdomError } from '../errors'
import { createPdf, loadPdf, savePdf } from './load'
import type { ProgressCallback } from './merge'

/**
 * Crea un PDF nuevo por cada grupo de páginas.
 * Cada grupo es una lista de índices (desde 0), p. ej. [[0, 1, 2], [4]].
 */
export async function extractPageGroups(
  input: Uint8Array,
  groups: number[][],
  onProgress?: ProgressCallback,
): Promise<Uint8Array[]> {
  if (groups.length === 0 || groups.some((g) => g.length === 0)) {
    throw new PdfKingdomError('invalid-options')
  }

  const source = await loadPdf(input)
  const pageCount = source.getPageCount()
  if (groups.some((g) => g.some((i) => !Number.isInteger(i) || i < 0 || i >= pageCount))) {
    throw new PdfKingdomError('invalid-options')
  }

  const outputs: Uint8Array[] = []
  for (const [n, indices] of groups.entries()) {
    const doc = await createPdf()
    const pages = await doc.copyPages(source, indices)
    for (const page of pages) doc.addPage(page)
    outputs.push(await savePdf(doc))
    onProgress?.((n + 1) / groups.length)
  }
  return outputs
}
