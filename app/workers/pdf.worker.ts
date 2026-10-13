/// <reference lib="webworker" />
/**
 * Worker de PDF: hace el trabajo pesado en segundo plano para que la página no se congele.
 * La página lo llama como si fueran funciones normales gracias a Comlink.
 */
import { expose, transfer } from 'comlink'
import { toWorkerResult, type WorkerResult } from '../lib/errors'
import { imagesToPdf, type ImagesToPdfOptions } from '../lib/pdf/images-to-pdf'
import { mergePdfs } from '../lib/pdf/merge'
import { rotatePdf } from '../lib/pdf/rotate'
import { extractPageGroups } from '../lib/pdf/split'
import { makeZip, type NamedFile } from '../lib/zip'
import qpdfWasmUrl from '@neslinesli93/qpdf-wasm/dist/qpdf.wasm?url'
import type { CompressionLevel } from '../lib/pdf/compress'
import type { RasterPage } from '../lib/pdf/raster'
import { canvasCodec } from './image-codec'

type Progress = (fraction: number) => void

/** Carga qpdf (1,3 MB de WebAssembly) solo cuando se usa una herramienta que lo necesita. */
let qpdfConfigured = false
async function loadQpdfTools() {
  const [qpdf, compress] = await Promise.all([import('../lib/qpdf'), import('../lib/pdf/compress')])
  if (!qpdfConfigured) {
    qpdf.configureQpdf(() => new URL(qpdfWasmUrl, self.location.href).href)
    qpdfConfigured = true
  }
  return { ...qpdf, ...compress }
}

export interface SplitOutput {
  kind: 'pdf' | 'zip'
  data: Uint8Array
}

/** Pasa la propiedad del buffer a la página en vez de copiarlo (más rápido y menos memoria). */
function transferResult<T extends { ok: boolean }>(result: T, data?: Uint8Array): T {
  return data ? transfer(result, [data.buffer as ArrayBuffer]) : result
}

/** Ejecuta una tarea que devuelve bytes y los transfiere de vuelta a la página. */
async function bytesTask(task: () => Promise<Uint8Array>): Promise<WorkerResult<Uint8Array>> {
  const result = await toWorkerResult(task)
  return transferResult(result, result.ok ? result.value : undefined)
}

const api = {
  merge(inputs: Uint8Array[], onProgress?: Progress) {
    return bytesTask(() => mergePdfs(inputs, onProgress))
  },

  rotate(input: Uint8Array, rotations: number[], onProgress?: Progress) {
    return bytesTask(() => rotatePdf(input, rotations, onProgress))
  },

  imagesToPdf(images: Uint8Array[], options: ImagesToPdfOptions, onProgress?: Progress) {
    return bytesTask(() => imagesToPdf(images, options, onProgress))
  },

  /** Quita contraseña y restricciones (qpdf). */
  unlock(input: Uint8Array, password: string, onProgress?: Progress) {
    return bytesTask(async () => {
      const { unlockPdf } = await loadQpdfTools()
      onProgress?.(0.3)
      return unlockPdf(input, password)
    })
  },

  /** Pone contraseña con AES-256 (qpdf). */
  protect(input: Uint8Array, password: string, onProgress?: Progress) {
    return bytesTask(async () => {
      const { protectPdf } = await loadQpdfTools()
      onProgress?.(0.3)
      return protectPdf(input, password)
    })
  },

  /** Compresión baja o recomendada. */
  compress(input: Uint8Array, level: Exclude<CompressionLevel, 'extreme'>, onProgress?: Progress) {
    return bytesTask(async () => {
      const { compressPdf } = await loadQpdfTools()
      return compressPdf(input, level, canvasCodec, onProgress)
    })
  },

  /** Compresión extrema: monta un PDF con las páginas ya convertidas en imagen. */
  rasterToPdf(pages: RasterPage[], originalSize: number, onProgress?: Progress) {
    return bytesTask(async () => {
      const [{ rasterPagesToPdf }, { ensureSmaller }] = await Promise.all([
        import('../lib/pdf/raster'),
        import('../lib/pdf/compress'),
      ])
      return ensureSmaller(await rasterPagesToPdf(pages, onProgress), originalSize)
    })
  },

  /** Empaqueta archivos ya creados (p. ej. las imágenes de "PDF a JPG") en un .zip. */
  zip(files: NamedFile[]) {
    return bytesTask(async () => makeZip(files))
  },

  /**
   * Divide un PDF. Si sale un único archivo se devuelve el PDF tal cual;
   * si salen varios, se empaquetan en un .zip con los nombres indicados.
   */
  async split(
    input: Uint8Array,
    groups: number[][],
    names: string[],
    onProgress?: Progress,
  ): Promise<WorkerResult<SplitOutput>> {
    const result = await toWorkerResult<SplitOutput>(async () => {
      // El 90 % del progreso es crear los PDF; el resto, empaquetar el .zip.
      const outputs = await extractPageGroups(input, groups, (f) => onProgress?.(f * 0.9))
      if (outputs.length === 1) return { kind: 'pdf', data: outputs[0]! }
      const zip = makeZip(outputs.map((data, i) => ({ name: names[i] ?? `${i + 1}.pdf`, data })))
      onProgress?.(1)
      return { kind: 'zip', data: zip }
    })
    return transferResult(result, result.ok ? result.value.data : undefined)
  },
}

export type PdfWorkerApi = typeof api

expose(api)
