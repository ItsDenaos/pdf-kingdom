export type ImageType = 'jpeg' | 'png'

export interface ImageInfo {
  type: ImageType
  /** Tamaño tal como está guardado en el archivo (sin girar). */
  width: number
  height: number
  /** Orientación EXIF de 1 a 8 (1 = normal). Los móviles la usan para fotos en vertical. */
  orientation: number
}

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]

/** Reconoce JPG y PNG por sus primeros bytes (no por la extensión, que puede mentir). */
export function detectImageType(bytes: Uint8Array): ImageType | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'jpeg'
  if (bytes.length >= 8 && PNG_SIGNATURE.every((b, i) => bytes[i] === b)) return 'png'
  return null
}

export async function sniffImageType(file: Blob): Promise<ImageType | null> {
  return detectImageType(new Uint8Array(await file.slice(0, 16).arrayBuffer()))
}

/** Lee tamaño y orientación de la cabecera de la imagen. Devuelve null si está dañada. */
export function readImageInfo(bytes: Uint8Array): ImageInfo | null {
  const type = detectImageType(bytes)
  if (type === 'png') return readPngInfo(bytes)
  if (type === 'jpeg') return readJpegInfo(bytes)
  return null
}

function readPngInfo(bytes: Uint8Array): ImageInfo | null {
  // Firma (8) + longitud (4) + "IHDR" (4) + ancho (4) + alto (4)
  if (bytes.length < 24) return null
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const isIhdr = bytes[12] === 0x49 && bytes[13] === 0x48 && bytes[14] === 0x44 && bytes[15] === 0x52
  if (!isIhdr) return null
  const width = view.getUint32(16)
  const height = view.getUint32(20)
  return width > 0 && height > 0 ? { type: 'png', width, height, orientation: 1 } : null
}

// Marcadores SOF (inicio de fotograma) que contienen el tamaño de la imagen.
const SOF_MARKERS = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf])

function readJpegInfo(bytes: Uint8Array): ImageInfo | null {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  let orientation = 1
  let pos = 2 // después de FFD8

  while (pos + 4 <= bytes.length) {
    if (bytes[pos] !== 0xff) return null
    const marker = bytes[pos + 1]!
    if (marker === 0xff) {
      pos++ // relleno
      continue
    }
    if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) {
      pos += 2 // marcadores sin longitud
      continue
    }
    if (marker === 0xd9 || marker === 0xda) return null // fin o datos de imagen sin haber visto el tamaño

    const length = view.getUint16(pos + 2)
    if (length < 2 || pos + 2 + length > bytes.length) return null

    if (marker === 0xe1) {
      orientation = readExifOrientation(bytes, pos + 4, length - 2) ?? orientation
    } else if (SOF_MARKERS.has(marker)) {
      if (length < 7) return null
      const height = view.getUint16(pos + 5)
      const width = view.getUint16(pos + 7)
      return width > 0 && height > 0 ? { type: 'jpeg', width, height, orientation } : null
    }
    pos += 2 + length
  }
  return null
}

/** Busca la etiqueta de orientación (0x0112) dentro de un bloque EXIF. */
function readExifOrientation(bytes: Uint8Array, start: number, length: number): number | null {
  // "Exif\0\0"
  const header = [0x45, 0x78, 0x69, 0x66, 0x00, 0x00]
  if (length < 14 || !header.every((b, i) => bytes[start + i] === b)) return null
  const tiff = start + 6
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const little = bytes[tiff] === 0x49 // "II" = little endian, "MM" = big endian
  const end = start + length
  const u16 = (at: number) => (at + 2 <= end ? view.getUint16(at, little) : null)
  const u32 = (at: number) => (at + 4 <= end ? view.getUint32(at, little) : null)

  const ifdOffset = u32(tiff + 4)
  if (ifdOffset == null) return null
  const ifd = tiff + ifdOffset
  const count = u16(ifd)
  if (count == null) return null
  for (let i = 0; i < count; i++) {
    const entry = ifd + 2 + i * 12
    if (u16(entry) === 0x0112) {
      const value = u16(entry + 8)
      return value != null && value >= 1 && value <= 8 ? value : null
    }
  }
  return null
}

/** Tamaño con el que se ve la imagen (las orientaciones 5 a 8 intercambian ancho y alto). */
export function displaySize(info: Pick<ImageInfo, 'width' | 'height' | 'orientation'>) {
  return info.orientation >= 5
    ? { width: info.height, height: info.width }
    : { width: info.width, height: info.height }
}

/**
 * Matriz [a, b, c, d, e, f] que coloca la imagen guardada (cuadrado unidad del PDF)
 * con la orientación correcta: x' = a·u + c·v + e,  y' = b·u + d·v + f.
 */
export function orientationMatrix(orientation: number): [number, number, number, number, number, number] {
  switch (orientation) {
    case 2: return [-1, 0, 0, 1, 1, 0] // espejo horizontal
    case 3: return [-1, 0, 0, -1, 1, 1] // girada 180°
    case 4: return [1, 0, 0, -1, 0, 1] // espejo vertical
    case 5: return [0, -1, -1, 0, 1, 1] // traspuesta
    case 6: return [0, -1, 1, 0, 0, 1] // girada 90° a la derecha
    case 7: return [0, 1, 1, 0, 0, 0] // traspuesta inversa
    case 8: return [0, 1, -1, 0, 1, 0] // girada 90° a la izquierda
    default: return [1, 0, 0, 1, 0, 0]
  }
}
