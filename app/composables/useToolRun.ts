import type { PdfErrorCode, WorkerResult } from '../lib/errors'

export interface ToolOutput {
  blob: Blob
  fileName: string
  /** Detalle opcional para mostrar junto al archivo (p. ej. "12 páginas"). */
  detail?: string
  /** Solo al comprimir: tamaño antes y después, en bytes. */
  stats?: { before: number; after: number }
}

export interface ToolError {
  code: PdfErrorCode
  fileIndex?: number
}

type Phase = 'edit' | 'processing' | 'done'

export class CancelledError extends Error {}

/**
 * Controla el ciclo de una herramienta: editar → procesando (con progreso) → listo.
 * También permite cancelar (deteniendo el worker) y volver a empezar.
 */
export function useToolRun() {
  const { terminate } = usePdfWorker()

  const phase = ref<Phase>('edit')
  const progress = ref(0)
  const error = ref<ToolError | null>(null)
  const output = shallowRef<ToolOutput | null>(null)
  let cancelCurrent: (() => void) | null = null
  let controller: AbortController | null = null

  /**
   * Ejecuta una tarea. Recibe una función para informar del progreso (de 0 a 1) y una
   * señal que se activa al cancelar (para el trabajo que no corre en el worker).
   * Debe devolver el resultado de un worker.
   */
  async function run(
    task: (
      onProgress: (fraction: number) => void,
      signal: AbortSignal,
    ) => Promise<WorkerResult<ToolOutput>>,
  ) {
    error.value = null
    progress.value = 0
    phase.value = 'processing'

    controller = new AbortController()
    const signal = controller.signal
    const cancelled = new Promise<never>((_, reject) => {
      cancelCurrent = () => reject(new CancelledError())
    })

    const pending = task((fraction) => {
      if (!signal.aborted) progress.value = Math.max(progress.value, Math.min(1, fraction))
    }, signal)
    // Si se cancela, la tarea puede terminar con error más tarde: no es un fallo real.
    pending.catch(() => {})

    try {
      const result = await Promise.race([pending, cancelled])
      if (result.ok) {
        progress.value = 1
        output.value = result.value
        phase.value = 'done'
      } else {
        error.value = { code: result.code, fileIndex: result.fileIndex }
        phase.value = 'edit'
      }
    } catch (e) {
      if (!(e instanceof CancelledError)) {
        console.error(e)
        error.value = { code: 'unknown' }
      }
      phase.value = 'edit'
    } finally {
      cancelCurrent = null
      controller = null
    }
  }

  function cancel() {
    if (!cancelCurrent) return
    controller?.abort()
    terminate()
    cancelCurrent()
  }

  /** Vuelve al principio para procesar otro archivo. */
  function reset() {
    output.value = null
    error.value = null
    progress.value = 0
    phase.value = 'edit'
  }

  return { phase, progress, error, output, run, cancel, reset }
}
