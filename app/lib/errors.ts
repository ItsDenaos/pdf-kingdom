/**
 * Códigos de error que puede producir cualquier herramienta.
 * La interfaz los traduce a mensajes claros (ver `errors.*` en i18n/locales/es.json).
 */
export type PdfErrorCode =
  | 'invalid-format' // no es un PDF
  | 'corrupt' // es un PDF, pero está dañado o no se puede leer
  | 'encrypted' // tiene contraseña o restricciones
  | 'wrong-password' // la contraseña indicada no es correcta
  | 'empty' // no hay nada que procesar
  | 'invalid-options' // opciones incorrectas (rangos imposibles, etc.)
  | 'no-gain' // al comprimir, el resultado no es más pequeño que el original
  | 'unknown'

export class PdfKingdomError extends Error {
  readonly code: PdfErrorCode
  /** Posición del archivo que causó el error (cuando hay varios). */
  readonly fileIndex?: number

  constructor(code: PdfErrorCode, options: { fileIndex?: number; cause?: unknown } = {}) {
    super(code, { cause: options.cause })
    this.name = 'PdfKingdomError'
    this.code = code
    this.fileIndex = options.fileIndex
  }
}

/**
 * Resultado que devuelve un worker. Se usa en vez de lanzar errores porque al cruzar
 * del worker a la página los errores pierden sus datos extra (código, archivo…).
 */
export type WorkerResult<T> =
  | { ok: true; value: T }
  | { ok: false; code: PdfErrorCode; fileIndex?: number }

export async function toWorkerResult<T>(task: () => Promise<T>): Promise<WorkerResult<T>> {
  try {
    return { ok: true, value: await task() }
  } catch (error) {
    if (error instanceof PdfKingdomError) {
      return { ok: false, code: error.code, fileIndex: error.fileIndex }
    }
    console.error(error)
    return { ok: false, code: 'unknown' }
  }
}
