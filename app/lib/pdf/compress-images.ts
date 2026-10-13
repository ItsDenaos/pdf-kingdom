/**
 * Compresión "recomendada": vuelve a guardar las fotos que hay dentro del PDF en JPEG,
 * más pequeñas y con algo menos de calidad. El texto, los vectores y las fuentes no se tocan,
 * así que el texto sigue siendo seleccionable.
 */
import {
  PDFArray,
  PDFBool,
  PDFDict,
  PDFName,
  PDFNumber,
  PDFRawStream,
  PDFRef,
  type PDFContext,
  type PDFObject,
} from '@cantoo/pdf-lib'
import { unzlibSync } from 'fflate'
import { loadPdf } from './load'
import type { ProgressCallback } from './merge'

/** Imagen en memoria: píxeles RGBA, 4 bytes por píxel. */
export interface RasterImage {
  width: number
  height: number
  data: Uint8ClampedArray
}

export type ImageSource = { kind: 'jpeg'; bytes: Uint8Array } | { kind: 'rgba'; image: RasterImage }

/**
 * Sabe decodificar y volver a codificar imágenes. En el navegador usa el lienzo
 * (OffscreenCanvas); en las pruebas, una librería JPEG en JavaScript.
 */
export interface ImageCodec {
  /** Devuelve la imagen como JPEG del tamaño indicado, o null si no puede. */
  toJpeg(source: ImageSource, width: number, height: number, quality: number): Promise<Uint8Array | null>
}

export interface ImageCompressionOptions {
  /** Lado más largo máximo, en píxeles. */
  maxDimension: number
  /** Calidad JPEG de 0 a 1. */
  quality: number
  /** No merece la pena tocar imágenes más pequeñas que esto (bytes). */
  minBytes: number
}

export const RECOMMENDED_IMAGES: ImageCompressionOptions = {
  maxDimension: 1600,
  quality: 0.72,
  minBytes: 16 * 1024,
}

/** Por encima de esto no se decodifica (evita quedarse sin memoria con imágenes gigantes). */
const MAX_PIXELS = 40_000_000

const name = (value: string) => PDFName.of(value)

function numberOf(context: PDFContext, value: PDFObject | undefined): number | null {
  const resolved = value instanceof PDFRef ? context.lookup(value) : value
  return resolved instanceof PDFNumber ? resolved.asNumber() : null
}

function filtersOf(context: PDFContext, value: PDFObject | undefined): string[] {
  const resolved = value instanceof PDFRef ? context.lookup(value) : value
  if (resolved instanceof PDFName) return [resolved.decodeText()]
  if (resolved instanceof PDFArray) {
    return resolved.asArray().map((item) => (item instanceof PDFName ? item.decodeText() : '?'))
  }
  return []
}

/** Número de componentes de color (1 = gris, 3 = RGB). null si no lo manejamos (CMYK, indexado…). */
function colorComponents(context: PDFContext, value: PDFObject | undefined): 1 | 3 | null {
  const resolved = value instanceof PDFRef ? context.lookup(value) : value
  if (resolved instanceof PDFName) {
    const cs = resolved.decodeText()
    return cs === 'DeviceGray' ? 1 : cs === 'DeviceRGB' ? 3 : null
  }
  if (resolved instanceof PDFArray && resolved.size() >= 1) {
    const family = resolved.get(0)
    const kind = family instanceof PDFName ? family.decodeText() : ''
    if (kind === 'CalGray') return 1
    if (kind === 'CalRGB') return 3
    if (kind === 'ICCBased') {
      const profile = context.lookup(resolved.get(1))
      const n = profile instanceof PDFRawStream ? numberOf(context, profile.dict.get(name('N'))) : null
      return n === 1 ? 1 : n === 3 ? 3 : null
    }
  }
  return null
}

/** Deshace el "predictor PNG" con el que a veces se guardan los píxeles comprimidos con Flate. */
function undoPngPredictor(data: Uint8Array, bytesPerPixel: number, rowBytes: number, rows: number): Uint8Array | null {
  const out = new Uint8Array(rowBytes * rows)
  let src = 0
  for (let row = 0; row < rows; row++) {
    if (src + 1 + rowBytes > data.length) return null
    const type = data[src++]!
    const offset = row * rowBytes
    for (let i = 0; i < rowBytes; i++) {
      const raw = data[src++]!
      const left = i >= bytesPerPixel ? out[offset + i - bytesPerPixel]! : 0
      const up = row > 0 ? out[offset - rowBytes + i]! : 0
      const upLeft = row > 0 && i >= bytesPerPixel ? out[offset - rowBytes + i - bytesPerPixel]! : 0
      let value: number
      switch (type) {
        case 0: value = raw; break
        case 1: value = raw + left; break
        case 2: value = raw + up; break
        case 3: value = raw + ((left + up) >> 1); break
        case 4: {
          const p = left + up - upLeft
          const pa = Math.abs(p - left)
          const pb = Math.abs(p - up)
          const pc = Math.abs(p - upLeft)
          value = raw + (pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft)
          break
        }
        default: return null
      }
      out[offset + i] = value & 0xff
    }
  }
  return out
}

/** Convierte píxeles Flate (gris o RGB, 8 bits) en una imagen RGBA. */
function decodeFlatePixels(
  context: PDFContext,
  stream: PDFRawStream,
  width: number,
  height: number,
  components: 1 | 3,
): RasterImage | null {
  let data: Uint8Array = unzlibSync(stream.contents)
  const rowBytes = width * components

  const parmsRaw = stream.dict.get(name('DecodeParms'))
  const parmsResolved = parmsRaw instanceof PDFRef ? context.lookup(parmsRaw) : parmsRaw
  const parms = parmsResolved instanceof PDFArray ? context.lookup(parmsResolved.get(0)) : parmsResolved
  if (parms instanceof PDFDict) {
    const predictor = numberOf(context, parms.get(name('Predictor'))) ?? 1
    if (predictor >= 10) {
      const undone = undoPngPredictor(data, components, rowBytes, height)
      if (!undone) return null
      data = undone
    } else if (predictor !== 1) {
      return null // predictor TIFF: poco común, no lo tratamos
    }
  }
  if (data.length < rowBytes * height) return null

  const rgba = new Uint8ClampedArray(width * height * 4)
  for (let p = 0, s = 0; p < rgba.length; p += 4, s += components) {
    const r = data[s]!
    rgba[p] = r
    rgba[p + 1] = components === 3 ? data[s + 1]! : r
    rgba[p + 2] = components === 3 ? data[s + 2]! : r
    rgba[p + 3] = 255
  }
  return { width, height, data: rgba }
}

/** Intenta crear una versión más ligera de una imagen. Devuelve null si no conviene. */
async function recompressImage(
  context: PDFContext,
  stream: PDFRawStream,
  codec: ImageCodec,
  options: ImageCompressionOptions,
): Promise<PDFRawStream | null> {
  const dict = stream.dict
  if (stream.contents.length < options.minBytes) return null
  if (dict.get(name('ImageMask')) instanceof PDFBool) return null // máscaras de 1 bit
  if (dict.get(name('Mask')) instanceof PDFArray) return null // transparencia por color: el JPEG la rompería
  if (dict.has(name('Decode'))) return null

  const width = numberOf(context, dict.get(name('Width')))
  const height = numberOf(context, dict.get(name('Height')))
  const bpc = numberOf(context, dict.get(name('BitsPerComponent')))
  const components = colorComponents(context, dict.get(name('ColorSpace')))
  if (!width || !height || bpc !== 8 || !components || width * height > MAX_PIXELS) return null

  const filters = filtersOf(context, dict.get(name('Filter')))
  let source: ImageSource
  if (filters.length === 1 && filters[0] === 'DCTDecode') {
    source = { kind: 'jpeg', bytes: stream.contents }
  } else if (filters.length === 1 && filters[0] === 'FlateDecode') {
    const image = decodeFlatePixels(context, stream, width, height, components)
    if (!image) return null
    source = { kind: 'rgba', image }
  } else {
    return null
  }

  const scale = Math.min(1, options.maxDimension / Math.max(width, height))
  const targetWidth = Math.max(1, Math.round(width * scale))
  const targetHeight = Math.max(1, Math.round(height * scale))
  const jpeg = await codec.toJpeg(source, targetWidth, targetHeight, options.quality)
  // Solo se cambia si ahorra al menos un 10 %.
  if (!jpeg || jpeg.length >= stream.contents.length * 0.9) return null

  const newDict: Record<string, PDFObject | string | number> = {
    Type: 'XObject',
    Subtype: 'Image',
    Width: targetWidth,
    Height: targetHeight,
    ColorSpace: 'DeviceRGB',
    BitsPerComponent: 8,
    Filter: 'DCTDecode',
  }
  // Se conservan la transparencia (SMask), las máscaras y otros ajustes de la imagen original.
  for (const key of ['SMask', 'Mask', 'Interpolate', 'Intent', 'OC', 'Metadata']) {
    const value = dict.get(name(key))
    if (value) newDict[key] = value
  }
  return context.stream(jpeg, newDict)
}

export interface ImageCompressionResult {
  bytes: Uint8Array
  /** Cuántas imágenes se recomprimieron. */
  changed: number
}

export async function compressImages(
  input: Uint8Array,
  codec: ImageCodec,
  options: ImageCompressionOptions = RECOMMENDED_IMAGES,
  onProgress?: ProgressCallback,
): Promise<ImageCompressionResult> {
  const doc = await loadPdf(input)
  const context = doc.context
  const images = context
    .enumerateIndirectObjects()
    .filter(
      (entry): entry is [PDFRef, PDFRawStream] =>
        entry[1] instanceof PDFRawStream && entry[1].dict.get(name('Subtype')) === name('Image'),
    )

  let changed = 0
  for (const [index, [ref, stream]] of images.entries()) {
    try {
      const replacement = await recompressImage(context, stream, codec, options)
      if (replacement) {
        context.assign(ref, replacement)
        changed++
      }
    } catch {
      // Si una imagen da problemas se deja como estaba.
    }
    onProgress?.((index + 1) / images.length)
  }

  if (changed === 0) return { bytes: input, changed }
  return { bytes: await doc.save({ useObjectStreams: true }), changed }
}
