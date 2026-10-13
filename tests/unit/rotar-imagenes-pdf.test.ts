import { decodePDFRawStream, PDFArray, PDFDocument, PDFRawStream } from '@cantoo/pdf-lib'
import { describe, expect, it } from 'vitest'
import { normalizeAngle } from '../../app/lib/angles'
import { PdfKingdomError } from '../../app/lib/errors'
import { imagesToPdf } from '../../app/lib/pdf/images-to-pdf'
import { rotatePdf } from '../../app/lib/pdf/rotate'
import { fixture, numberedPdf } from './helpers'

async function expectPdfError(promise: Promise<unknown>): Promise<PdfKingdomError> {
  const error = await promise.then(
    () => null,
    (e: unknown) => e,
  )
  expect(error).toBeInstanceOf(PdfKingdomError)
  return error as PdfKingdomError
}

async function angles(bytes: Uint8Array) {
  const doc = await PDFDocument.load(bytes)
  return doc.getPages().map((p) => normalizeAngle(p.getRotation().angle))
}

/** Texto (descomprimido) de las instrucciones de dibujo de una página. */
function contentText(doc: PDFDocument, pageIndex: number): string {
  const contents = doc.getPage(pageIndex).node.Contents()
  // Puede ser un único flujo o una lista de flujos.
  const parts = contents instanceof PDFArray
    ? Array.from({ length: contents.size() }, (_, i) => contents.lookup(i))
    : [contents]
  return parts
    .filter((part): part is PDFRawStream => part instanceof PDFRawStream)
    .map((part) => new TextDecoder().decode(decodePDFRawStream(part).decode()))
    .join('\n')
}

describe('normalizeAngle', () => {
  it('lleva cualquier ángulo a 0-270', () => {
    expect([0, 90, -90, 180, 270, 360, 450, -450].map(normalizeAngle)).toEqual([0, 90, 270, 180, 270, 0, 90, 270])
  })
})

describe('rotatePdf', () => {
  it('gira solo las páginas indicadas', async () => {
    const out = await rotatePdf(await numberedPdf(3), [90, 0, -90])
    expect(await angles(out)).toEqual([90, 0, 270])
  })

  it('suma el giro al que ya tenía la página', async () => {
    const out = await rotatePdf(fixture('con-giro-previo.pdf'), [90, 90])
    expect(await angles(out)).toEqual([90, 180])
  })

  it('conserva las páginas y su contenido', async () => {
    const source = await PDFDocument.load(fixture('diez-paginas.pdf'))
    const out = await PDFDocument.load(await rotatePdf(fixture('diez-paginas.pdf'), Array(10).fill(180)))
    expect(out.getPageCount()).toBe(10)
    expect(out.getTitle()).toBe(source.getTitle())
  })

  it('rechaza ángulos que no son múltiplos de 90 o listas de otro tamaño', async () => {
    const pdf = await numberedPdf(2)
    expect((await expectPdfError(rotatePdf(pdf, [45, 0]))).code).toBe('invalid-options')
    expect((await expectPdfError(rotatePdf(pdf, [90]))).code).toBe('invalid-options')
  })

  it('avisa si el PDF está protegido', async () => {
    expect((await expectPdfError(rotatePdf(fixture('con-contrasena.pdf'), [90, 0]))).code).toBe('encrypted')
  })
})

describe('imagesToPdf', () => {
  it('crea una página por imagen, en orden, con la orientación adecuada', async () => {
    const out = await imagesToPdf([
      fixture('foto-horizontal.jpg'),
      fixture('foto-vertical.jpg'),
      fixture('logo-transparente.png'),
    ])
    const doc = await PDFDocument.load(out)
    expect(doc.getPageCount()).toBe(3)
    const shape = doc.getPages().map((p) => (p.getWidth() > p.getHeight() ? 'horizontal' : 'vertical'))
    expect(shape).toEqual(['horizontal', 'vertical', 'horizontal'])
  })

  it('corrige la orientación EXIF de las fotos del móvil', async () => {
    const out = await imagesToPdf([fixture('foto-girada-exif.jpg')], {
      pageSize: 'fit',
      orientation: 'auto',
      margin: 'none',
    })
    const doc = await PDFDocument.load(out)
    const page = doc.getPage(0)
    // La foto se ve vertical (480 × 640), así que la página también.
    expect(page.getHeight() / page.getWidth()).toBeCloseTo(640 / 480)
    // La imagen se dibuja girada: la matriz lleva el ancho de la foto en vertical.
    const w = page.getWidth()
    const h = page.getHeight()
    const cm = contentText(doc, 0).match(/([-\d.]+) ([-\d.]+) ([-\d.]+) ([-\d.]+) ([-\d.]+) ([-\d.]+) cm/)
    expect(cm).not.toBeNull()
    const [a, b, c, d, e, f] = cm!.slice(1).map(Number)
    expect(a).toBeCloseTo(0)
    expect(b).toBeCloseTo(-h)
    expect(c).toBeCloseTo(w)
    expect(d).toBeCloseTo(0)
    expect(e).toBeCloseTo(0)
    expect(f).toBeCloseTo(h)
  })

  it('aplica tamaño de página y márgenes', async () => {
    const out = await imagesToPdf([fixture('foto-horizontal.jpg')], {
      pageSize: 'letter',
      orientation: 'portrait',
      margin: 'large',
    })
    const page = (await PDFDocument.load(out)).getPage(0)
    expect([page.getWidth(), page.getHeight()]).toEqual([612, 792])
  })

  it('indica qué imagen está dañada', async () => {
    const error = await expectPdfError(imagesToPdf([fixture('foto-horizontal.jpg'), fixture('imagen-danada.jpg')]))
    expect(error.code).toBe('corrupt')
    expect(error.fileIndex).toBe(1)
  })

  it('rechaza archivos que no son imágenes', async () => {
    const error = await expectPdfError(imagesToPdf([fixture('no-es-imagen.png')]))
    expect(error.code).toBe('invalid-format')
  })

  it('no acepta una lista vacía', async () => {
    expect((await expectPdfError(imagesToPdf([]))).code).toBe('empty')
  })
})

