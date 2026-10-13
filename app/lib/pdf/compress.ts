import type { CompressionLevel } from '../compression-levels'
import { PdfKingdomError } from '../errors'
import { optimizePdf } from '../qpdf'
import { compressImages, RECOMMENDED_IMAGES, type ImageCodec } from './compress-images'
import type { ProgressCallback } from './merge'

export type { CompressionLevel } from '../compression-levels'

/** Falla con "no-gain" si el resultado no es más pequeño que el original. */
export function ensureSmaller(result: Uint8Array, originalSize: number): Uint8Array {
  if (result.length >= originalSize) throw new PdfKingdomError('no-gain')
  return result
}

export async function compressPdf(
  input: Uint8Array,
  level: Exclude<CompressionLevel, 'extreme'>,
  codec: ImageCodec,
  onProgress?: ProgressCallback,
): Promise<Uint8Array> {
  const originalSize = input.length
  let data = input

  if (level === 'recommended') {
    const result = await compressImages(input, codec, RECOMMENDED_IMAGES, (f) => onProgress?.(f * 0.8))
    data = result.bytes
  }

  const optimized = await optimizePdf(data)
  onProgress?.(1)
  // qpdf casi siempre reduce, pero por si acaso nos quedamos con la versión más pequeña.
  return ensureSmaller(optimized.length < data.length ? optimized : data, originalSize)
}
