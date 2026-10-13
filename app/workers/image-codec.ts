import type { ImageCodec, ImageSource } from '../lib/pdf/compress-images'

/** ¿Puede este navegador decodificar y codificar imágenes dentro de un worker? */
export function canvasCodecSupported(): boolean {
  return typeof OffscreenCanvas !== 'undefined' && typeof createImageBitmap === 'function'
}

async function toBitmap(source: ImageSource): Promise<ImageBitmap> {
  if (source.kind === 'jpeg') {
    return createImageBitmap(new Blob([source.bytes as Uint8Array<ArrayBuffer>], { type: 'image/jpeg' }))
  }
  const { width, height, data } = source.image
  return createImageBitmap(new ImageData(data as Uint8ClampedArray<ArrayBuffer>, width, height))
}

/** Códec basado en OffscreenCanvas: decodifica, reduce y vuelve a codificar en JPEG. */
export const canvasCodec: ImageCodec = {
  async toJpeg(source, width, height, quality) {
    if (!canvasCodecSupported()) return null
    let bitmap: ImageBitmap | null = null
    try {
      bitmap = await toBitmap(source)
      const canvas = new OffscreenCanvas(width, height)
      const ctx = canvas.getContext('2d')
      if (!ctx) return null
      ctx.fillStyle = '#ffffff' // el JPEG no tiene transparencia
      ctx.fillRect(0, 0, width, height)
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(bitmap, 0, 0, width, height)
      const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality })
      return new Uint8Array(await blob.arrayBuffer())
    } catch {
      return null
    } finally {
      bitmap?.close()
    }
  },
}
