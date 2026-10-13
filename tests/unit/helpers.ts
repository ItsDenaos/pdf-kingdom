import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { PDFDocument } from '@cantoo/pdf-lib'
import jpeg from 'jpeg-js'
import type { ImageCodec, RasterImage } from '../../app/lib/pdf/compress-images'
import { configureQpdf } from '../../app/lib/qpdf'

const require = createRequire(import.meta.url)

/** En Node, qpdf.wasm se lee del disco (en el navegador se descarga del propio sitio). */
export function setupQpdf() {
  configureQpdf(() => require.resolve('@neslinesli93/qpdf-wasm/dist/qpdf.wasm'))
}

/** Reduce una imagen RGBA tomando el píxel más cercano (suficiente para las pruebas). */
function resize(image: RasterImage, width: number, height: number): RasterImage {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let y = 0; y < height; y++) {
    const sy = Math.min(image.height - 1, Math.floor((y * image.height) / height))
    for (let x = 0; x < width; x++) {
      const sx = Math.min(image.width - 1, Math.floor((x * image.width) / width))
      data.set(image.data.subarray((sy * image.width + sx) * 4, (sy * image.width + sx) * 4 + 4), (y * width + x) * 4)
    }
  }
  return { width, height, data }
}

/** Códec de imágenes para Node (en el navegador se usa el lienzo). */
export const nodeCodec: ImageCodec = {
  async toJpeg(source, width, height, quality) {
    const image: RasterImage =
      source.kind === 'jpeg'
        ? (() => {
            const decoded = jpeg.decode(source.bytes, { useTArray: true, formatAsRGBA: true })
            return { width: decoded.width, height: decoded.height, data: new Uint8ClampedArray(decoded.data) }
          })()
        : source.image
    const sized = image.width === width && image.height === height ? image : resize(image, width, height)
    return new Uint8Array(jpeg.encode({ data: sized.data, width, height }, Math.round(quality * 100)).data)
  },
}

const FIXTURES = join(import.meta.dirname, '..', 'fixtures')

/** Lee un PDF de tests/fixtures (generados con `npm run fixtures`). */
export function fixture(name: string): Uint8Array {
  return new Uint8Array(readFileSync(join(FIXTURES, name)))
}

/** Crea un PDF en memoria cuyas páginas miden 101, 102, 103… de ancho para identificarlas. */
export async function numberedPdf(pageCount: number): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  for (let i = 1; i <= pageCount; i++) doc.addPage([100 + i, 200])
  return doc.save()
}

/** Devuelve el "número" de cada página de un PDF creado con numberedPdf. */
export async function pageNumbers(bytes: Uint8Array): Promise<number[]> {
  const doc = await PDFDocument.load(bytes)
  return doc.getPages().map((p) => Math.round(p.getWidth()) - 100)
}
