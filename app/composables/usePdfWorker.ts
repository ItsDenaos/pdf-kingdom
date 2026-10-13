import { proxy, transfer, wrap, type Remote } from 'comlink'
import type { PdfWorkerApi } from '../workers/pdf.worker'

let worker: Worker | null = null
let remote: Remote<PdfWorkerApi> | null = null

/** Crea el worker la primera vez que se necesita (nunca durante el prerenderizado). */
function getWorker(): Remote<PdfWorkerApi> {
  if (!remote) {
    worker = new Worker(new URL('../workers/pdf.worker.ts', import.meta.url), {
      type: 'module',
      name: 'pdf-kingdom-pdf',
    })
    remote = wrap<PdfWorkerApi>(worker)
  }
  return remote
}

/** Detiene el worker en seco (para "Cancelar"). Se volverá a crear al usarlo de nuevo. */
function terminateWorker() {
  worker?.terminate()
  worker = null
  remote = null
}

export function usePdfWorker() {
  return {
    worker: getWorker,
    terminate: terminateWorker,
    /** Envuelve una función de progreso para poder llamarla desde el worker. */
    callback: (fn: (fraction: number) => void) => proxy(fn),
    /** Cede buffers al worker sin copiarlos. */
    transfer,
  }
}
