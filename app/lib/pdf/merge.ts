import { PdfKingdomError } from '../errors'
import { createPdf, loadPdf, savePdf } from './load'

export type ProgressCallback = (fraction: number) => void

/** Une varios PDF en uno, respetando el orden recibido. */
export async function mergePdfs(
  inputs: Uint8Array[],
  onProgress?: ProgressCallback,
): Promise<Uint8Array> {
  if (inputs.length === 0) throw new PdfKingdomError('empty')

  const merged = await createPdf()
  // Un paso por archivo + uno final para guardar.
  const steps = inputs.length + 1

  for (const [fileIndex, bytes] of inputs.entries()) {
    const source = await loadPdf(bytes, { fileIndex })
    const pages = await merged.copyPages(source, source.getPageIndices())
    for (const page of pages) merged.addPage(page)
    onProgress?.((fileIndex + 1) / steps)
  }

  const result = await savePdf(merged)
  onProgress?.(1)
  return result
}
