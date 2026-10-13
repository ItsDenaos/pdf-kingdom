/**
 * qpdf (compilado a WebAssembly) para quitar y poner contraseñas y optimizar PDF.
 * Funciona igual en el navegador (dentro del worker) y en Node (pruebas): solo cambia
 * cómo se obtiene el archivo .wasm, que se indica con `configureQpdf`.
 */
import createQpdf from '@neslinesli93/qpdf-wasm'
import { PdfKingdomError } from './errors'
import { hasPdfSignature } from './files'

/** Devuelve la ubicación de qpdf.wasm: una URL en el navegador o una ruta en Node. */
export type WasmLocator = () => string

type QpdfInstance = Awaited<ReturnType<typeof createQpdf>> & {
  FS: { writeFile(path: string, data: Uint8Array): void; unlink(path: string): void }
}

let locateWasm: WasmLocator | null = null
let instance: Promise<QpdfInstance> | null = null
/** Mientras qpdf trabaja, sus mensajes van aquí; el resto del tiempo, a la consola normal. */
let messageSink: ((text: string) => void) | null = null

/** Indica dónde está qpdf.wasm. qpdf se carga una sola vez y se reutiliza. */
export function configureQpdf(locator: WasmLocator) {
  locateWasm = locator
  instance = null
}

/**
 * qpdf escribe sus mensajes en la consola y se "queda" con ella al cargarse. Por eso, mientras
 * se carga, ponemos en la consola un desvío que después podemos dirigir a donde queramos.
 */
async function createInstance(locator: WasmLocator): Promise<QpdfInstance> {
  const original = { log: console.log, warn: console.warn, error: console.error }
  const forward =
    (fallback: (...parts: unknown[]) => void) =>
    (...parts: unknown[]) =>
      messageSink ? messageSink(parts.map(String).join(' ')) : fallback(...parts)
  console.log = forward(original.log)
  console.warn = forward(original.warn)
  console.error = forward(original.error)
  try {
    return (await createQpdf({ locateFile: locator })) as QpdfInstance
  } finally {
    Object.assign(console, original)
  }
}

function getInstance(): Promise<QpdfInstance> {
  if (!locateWasm) throw new Error('qpdf no está configurado')
  instance ??= createInstance(locateWasm).catch((error: unknown) => {
    instance = null
    throw error
  })
  return instance
}

const INPUT = '/entrada.pdf'
const OUTPUT = '/salida.pdf'

interface QpdfRun {
  /** 0 = bien, 3 = bien con avisos, 2 = error. */
  code: number
  messages: string[]
  output: Uint8Array | null
}

/**
 * Ejecuta qpdf como si fuera la línea de comandos, con el PDF en un disco virtual en memoria.
 * Al terminar se borran los archivos temporales para liberar memoria.
 */
async function runQpdf(args: string[], input: Uint8Array): Promise<QpdfRun> {
  const qpdf = await getInstance()
  qpdf.FS.writeFile(INPUT, input)

  // Recogemos los mensajes de qpdf para interpretarlos (p. ej. "invalid password").
  const messages: string[] = []
  messageSink = (text) => messages.push(text)
  let code: number
  try {
    code = qpdf.callMain(args)
  } catch (error) {
    instance = null // qpdf se detuvo de forma inesperada: la próxima vez se carga de nuevo
    throw error
  } finally {
    messageSink = null
  }

  let output: Uint8Array | null = null
  try {
    output = qpdf.FS.readFile(OUTPUT)
  } catch {
    output = null
  }
  for (const path of [INPUT, OUTPUT]) {
    try {
      qpdf.FS.unlink(path)
    } catch {
      // no existía
    }
  }
  return { code, messages, output }
}

function succeeded(run: QpdfRun): run is QpdfRun & { output: Uint8Array } {
  return (run.code === 0 || run.code === 3) && !!run.output && run.output.length > 0
}

function assertPdf(input: Uint8Array) {
  if (!hasPdfSignature(input)) throw new PdfKingdomError('invalid-format')
}

const wrongPassword = (run: QpdfRun) => run.messages.some((m) => /invalid password/i.test(m))

/**
 * ¿Tiene contraseña o restricciones? qpdf --is-encrypted devuelve 0 si está cifrado;
 * si además pide contraseña para abrirse, falla con "invalid password".
 */
export async function isEncrypted(input: Uint8Array): Promise<boolean> {
  assertPdf(input)
  const run = await runQpdf(['--is-encrypted', INPUT], input)
  return run.code === 0 || wrongPassword(run)
}

/**
 * Quita la contraseña y las restricciones. Si el PDF pide contraseña para abrirse,
 * hay que indicarla (vale la de usuario o la de propietario).
 */
export async function unlockPdf(input: Uint8Array, password = ''): Promise<Uint8Array> {
  assertPdf(input)
  const run = await runQpdf([`--password=${password}`, '--decrypt', INPUT, OUTPUT], input)
  if (wrongPassword(run)) throw new PdfKingdomError('wrong-password')
  if (!succeeded(run)) throw new PdfKingdomError('corrupt')
  return run.output
}

/** Contraseña de propietario aleatoria: nadie la necesita porque no se ponen restricciones. */
function randomOwnerPassword(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24))
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

/** Protege el PDF con contraseña para abrirlo, usando cifrado AES de 256 bits. */
export async function protectPdf(input: Uint8Array, userPassword: string): Promise<Uint8Array> {
  if (!userPassword) throw new PdfKingdomError('invalid-options')
  if (await isEncrypted(input)) throw new PdfKingdomError('encrypted')
  const run = await runQpdf(
    [
      '--encrypt',
      `--user-password=${userPassword}`,
      `--owner-password=${randomOwnerPassword()}`,
      '--bits=256',
      '--',
      INPUT,
      OUTPUT,
    ],
    input,
  )
  if (!succeeded(run)) throw new PdfKingdomError('corrupt')
  return run.output
}

/**
 * Compresión sin pérdida: agrupa objetos, recomprime todos los flujos al máximo
 * y elimina recursos que no se usan. No toca la calidad de imágenes ni texto.
 */
export async function optimizePdf(input: Uint8Array): Promise<Uint8Array> {
  if (await isEncrypted(input)) throw new PdfKingdomError('encrypted')
  const run = await runQpdf(
    [
      '--object-streams=generate',
      '--compress-streams=y',
      '--recompress-flate',
      '--compression-level=9',
      '--remove-unreferenced-resources=yes',
      INPUT,
      OUTPUT,
    ],
    input,
  )
  if (!succeeded(run)) throw new PdfKingdomError('corrupt')
  return run.output
}
