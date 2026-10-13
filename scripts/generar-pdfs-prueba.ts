/**
 * Genera los PDF e imágenes de prueba en tests/fixtures/.
 * Uso: npm run fixtures
 *
 * Contraseñas de los archivos protegidos (solo para pruebas):
 *   - con-contrasena.pdf     → contraseña para abrir: reino123
 *   - con-restricciones.pdf  → se abre sin contraseña; propietario: corona456
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PDFDocument, StandardFonts, degrees, rgb, type PDFFont } from '@cantoo/pdf-lib'
import UPNG from '@cantoo/pdf-lib/upng'
import createQpdf from '@neslinesli93/qpdf-wasm'
import jpeg from 'jpeg-js'

const require = createRequire(import.meta.url)
const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = join(root, 'tests', 'fixtures')

export const USER_PASSWORD = 'reino123'
export const OWNER_PASSWORD = 'corona456'

const A4: [number, number] = [595.28, 841.89]

/** Fecha fija: así los archivos generados son siempre idénticos y no ensucian git. */
const FIXED_DATE = new Date('2026-01-01T00:00:00Z')
function fixDates(doc: PDFDocument) {
  doc.setCreationDate(FIXED_DATE)
  doc.setModificationDate(FIXED_DATE)
}
const A4_LANDSCAPE: [number, number] = [841.89, 595.28]

const COLORS = [rgb(0.35, 0.16, 0.61), rgb(0.85, 0.6, 0.12), rgb(0.08, 0.5, 0.48), rgb(0.7, 0.15, 0.55)]

async function buildDocument(title: string, pageCount: number, size = A4): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  doc.setTitle(title)
  doc.setProducer('PDF Kingdom (pruebas)')
  fixDates(doc)
  const bold: PDFFont = await doc.embedFont(StandardFonts.HelveticaBold)
  const regular: PDFFont = await doc.embedFont(StandardFonts.Helvetica)

  for (let n = 1; n <= pageCount; n++) {
    const page = doc.addPage(size)
    const { width, height } = page.getSize()
    const color = COLORS[(n - 1) % COLORS.length]!
    page.drawRectangle({ x: 0, y: height - 90, width, height: 90, color })
    page.drawText(title, { x: 40, y: height - 58, size: 26, font: bold, color: rgb(1, 1, 1) })
    page.drawText(`Página ${n} de ${pageCount}`, { x: 40, y: height / 2, size: 54, font: bold, color })
    page.drawText('Archivo de prueba generado para PDF Kingdom.', {
      x: 40,
      y: height / 2 - 50,
      size: 14,
      font: regular,
      color: rgb(0.3, 0.3, 0.35),
    })
    page.drawText(String(n), { x: width - 70, y: 40, size: 28, font: bold, color })
  }
  return doc.save()
}

async function encrypt(input: Uint8Array, args: string[]): Promise<Uint8Array> {
  const qpdf = await createQpdf({
    locateFile: () => require.resolve('@neslinesli93/qpdf-wasm/dist/qpdf.wasm'),
  })
  qpdf.FS.writeFile('/entrada.pdf', input)
  const code = qpdf.callMain(['/entrada.pdf', '--encrypt', ...args, '--', '/salida.pdf'])
  if (code !== 0) throw new Error(`qpdf terminó con código ${code}`)
  return qpdf.FS.readFile('/salida.pdf')
}

// ---------- Imágenes ----------

type Pixel = [number, number, number, number]

/** Fondo degradado morado → dorado con una flecha blanca que apunta hacia arriba. */
function arrowUp(x: number, y: number, width: number, height: number): Pixel {
  const nx = x / width
  const ny = y / height
  const cx = 0.5
  const inHead = ny >= 0.15 && ny <= 0.45 && Math.abs(nx - cx) <= ((ny - 0.15) / 0.3) * 0.22
  const inShaft = ny > 0.45 && ny <= 0.85 && Math.abs(nx - cx) <= 0.07
  if (inHead || inShaft) return [255, 255, 255, 255]
  return [Math.round(90 + 140 * nx), Math.round(42 + 130 * nx), Math.round(156 - 120 * nx), 255]
}

function paint(width: number, height: number, fn: (x: number, y: number) => Pixel): Uint8Array {
  const data = new Uint8Array(width * height * 4)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) data.set(fn(x, y), (y * width + x) * 4)
  }
  return data
}

function encodeJpeg(width: number, height: number, fn: (x: number, y: number) => Pixel): Uint8Array {
  return new Uint8Array(jpeg.encode({ data: paint(width, height, fn), width, height }, 85).data)
}

/** Inserta un bloque EXIF con la orientación indicada justo después de la cabecera del JPG. */
function withExifOrientation(jpg: Uint8Array, orientation: number): Uint8Array {
  const exif = [
    0xff, 0xe1, 0x00, 0x22, // APP1, longitud 34
    0x45, 0x78, 0x69, 0x66, 0x00, 0x00, // "Exif\0\0"
    0x4d, 0x4d, 0x00, 0x2a, 0x00, 0x00, 0x00, 0x08, // TIFF big endian, IFD en 8
    0x00, 0x01, // 1 entrada
    0x01, 0x12, 0x00, 0x03, 0x00, 0x00, 0x00, 0x01, 0x00, orientation, 0x00, 0x00, // Orientation
    0x00, 0x00, 0x00, 0x00, // sin más IFD
  ]
  const out = new Uint8Array(jpg.length + exif.length)
  out.set(jpg.subarray(0, 2), 0) // FFD8
  out.set(exif, 2)
  out.set(jpg.subarray(2), 2 + exif.length)
  return out
}

/** PNG con fondo transparente y un círculo dorado. */
function transparentPng(width: number, height: number): Uint8Array {
  const data = paint(width, height, (x, y) => {
    const d = Math.hypot(x - width / 2, y - height / 2)
    return d < Math.min(width, height) * 0.4 ? [233, 176, 47, 255] : [0, 0, 0, 0]
  })
  return new Uint8Array(UPNG.encode([data.buffer as ArrayBuffer], width, height, 0))
}

// ---------- PDF para comprimir ----------

/**
 * PDF de texto escrito "a mano" sin comprimir nada (como hacen algunos programas antiguos).
 * Con compresión sin pérdida debería reducirse mucho.
 */
function uncompressedTextPdf(pageCount: number): string {
  const sentences = [
    'El reino de los PDF guarda cada documento con cuidado y sin prisas.',
    'Las paginas viajan ordenadas por el castillo hasta llegar a su destino.',
    'Ningun archivo sale de este dispositivo: todo ocurre en el navegador.',
    'La corona dorada vigila que cada hoja conserve su texto intacto.',
  ]
  const objects: string[] = []
  const pageIds: number[] = []
  let nextId = 4
  const pageObjects: string[] = []
  for (let p = 1; p <= pageCount; p++) {
    const pageId = nextId++
    const contentId = nextId++
    pageIds.push(pageId)
    const lines = Array.from({ length: 48 }, (_, i) => `(Pagina ${p}, linea ${i + 1}: ${sentences[(p + i) % 4]}) '`)
    const content = `BT\n/F1 10 Tf\n14 TL\n50 800 Td\n${lines.join('\n')}\nET`
    pageObjects[pageId] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentId} 0 R >>`
    pageObjects[contentId] = `<< /Length ${content.length} >>\nstream\n${content}\nendstream`
  }
  objects[1] = '<< /Type /Catalog /Pages 2 0 R >>'
  objects[2] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageCount} >>`
  objects[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'
  for (let id = 4; id < nextId; id++) objects[id] = pageObjects[id]!

  let pdf = '%PDF-1.4\n'
  const offsets: number[] = []
  for (let id = 1; id < nextId; id++) {
    offsets[id] = pdf.length
    pdf += `${id} 0 obj\n${objects[id]}\nendobj\n`
  }
  const xref = pdf.length
  pdf += `xref\n0 ${nextId}\n0000000000 65535 f \n`
  for (let id = 1; id < nextId; id++) pdf += `${String(offsets[id]).padStart(10, '0')} 00000 n \n`
  pdf += `trailer\n<< /Size ${nextId} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`
  return pdf
}

/** Generador de números pseudoaleatorios con semilla (para que el archivo siempre sea igual). */
function seeded(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0
    return seed / 2 ** 32
  }
}

/** PDF con una foto JPEG grande y otra imagen sin comprimir con JPEG (Flate), más texto. */
async function photosPdf(): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  doc.setTitle('Documento con fotos')
  fixDates(doc)
  const font = await doc.embedFont(StandardFonts.HelveticaBold)

  const photo = encodeJpeg(2000, 1500, (x, y) => {
    const wave = Math.sin(x / 23) * Math.cos(y / 17) * 40 + Math.sin((x + y) / 9) * 18
    return [Math.round(120 + wave + (x / 2000) * 90), Math.round(80 + wave + (y / 1500) * 60), Math.round(160 - wave), 255]
  })
  const random = seeded(42)
  const textured = paint(600, 400, (x, y) => {
    const noise = random() * 50
    return [Math.round(60 + (x / 600) * 150 + noise), Math.round(40 + (y / 400) * 120 + noise), Math.round(140 + noise), 255]
  })
  const png = new Uint8Array(UPNG.encode([textured.buffer as ArrayBuffer], 600, 400, 0))

  const page1 = doc.addPage([595.28, 841.89])
  const jpg = await doc.embedJpg(photo)
  page1.drawText('Pagina 1: foto JPEG grande', { x: 40, y: 790, size: 20, font })
  page1.drawImage(jpg, { x: 40, y: 340, width: 515, height: 386 })

  const page2 = doc.addPage([595.28, 841.89])
  const flate = await doc.embedPng(png)
  page2.drawText('Pagina 2: imagen guardada sin JPEG', { x: 40, y: 790, size: 20, font })
  page2.drawImage(flate, { x: 40, y: 340, width: 515, height: 343 })

  return doc.save({ useObjectStreams: false })
}

function write(name: string, bytes: Uint8Array | string) {
  writeFileSync(join(outDir, name), bytes)
  const size = typeof bytes === 'string' ? Buffer.byteLength(bytes) : bytes.length
  console.log(`  ✓ ${name} (${(size / 1024).toFixed(1)} KB)`)
}

async function main() {
  mkdirSync(outDir, { recursive: true })
  console.log(`Generando PDF de prueba en ${outDir}`)

  write('tres-paginas.pdf', await buildDocument('Documento A', 3))
  write('diez-paginas.pdf', await buildDocument('Documento B', 10))
  write('horizontal.pdf', await buildDocument('Documento C (horizontal)', 2, A4_LANDSCAPE))

  const secret = await buildDocument('Documento secreto', 2)
  // AES-256 con contraseña para abrir.
  write('con-contrasena.pdf', await encrypt(secret, [USER_PASSWORD, OWNER_PASSWORD, '256']))
  // AES-256 sin contraseña para abrir, pero con restricciones (no imprimir, no modificar).
  write(
    'con-restricciones.pdf',
    await encrypt(secret, ['', OWNER_PASSWORD, '256', '--print=none', '--modify=none', '--extract=n']),
  )

  // Empieza como un PDF pero el resto son datos sin sentido.
  const junk = Array.from({ length: 4000 }, (_, i) => String.fromCharCode(33 + ((i * 7919) % 90))).join('')
  write('danado.pdf', `%PDF-1.7\n%âãÏÓ\n1 0 obj\n<< /Type /Catalog /Pages 9 0 R ${junk}`)

  // Un archivo de texto con extensión .pdf.
  write('no-es-pdf.pdf', 'Esto no es un PDF, solo un archivo de texto con la extensión cambiada.\n')

  // PDF cuya segunda página ya viene girada 90° (para probar que Rotar respeta el giro previo).
  const rotated = await PDFDocument.load(await buildDocument('Documento D (con giro previo)', 2), { updateMetadata: false })
  rotated.getPage(1).setRotation(degrees(90))
  fixDates(rotated)
  write('con-giro-previo.pdf', await rotated.save({ updateFieldAppearances: false }))

  // Imágenes para "JPG a PDF".
  write('foto-horizontal.jpg', encodeJpeg(640, 480, (x, y) => arrowUp(x, y, 640, 480)))
  write('foto-vertical.jpg', encodeJpeg(480, 640, (x, y) => arrowUp(x, y, 480, 640)))
  // Como las fotos del móvil: guardada en horizontal (640×480, flecha a la izquierda) con
  // orientación EXIF 6. Bien mostrada es vertical (480×640) y la flecha apunta hacia arriba.
  write(
    'foto-girada-exif.jpg',
    withExifOrientation(encodeJpeg(640, 480, (x, y) => arrowUp(479 - y, x, 480, 640)), 6),
  )
  write('logo-transparente.png', transparentPng(300, 200))
  write('imagen-danada.jpg', new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 1, 2, 3, 4, 5, 6]))
  write('no-es-imagen.png', 'Esto es texto, no una imagen PNG.\n')

  // PDF para "Comprimir".
  write('sin-comprimir.pdf', uncompressedTextPdf(20))
  write('con-fotos.pdf', await photosPdf())

  console.log('Listo.')
}

await main()
