import { PDFDocument, PDFName, PDFNumber, PDFRawStream } from '@cantoo/pdf-lib'
import { beforeAll, describe, expect, it } from 'vitest'
import { PdfKingdomError } from '../../app/lib/errors'
import { passwordStrength } from '../../app/lib/password'
import { compressImages, RECOMMENDED_IMAGES } from '../../app/lib/pdf/compress-images'
import { compressPdf, ensureSmaller } from '../../app/lib/pdf/compress'
import { rasterPagesToPdf } from '../../app/lib/pdf/raster'
import { isEncrypted, optimizePdf, protectPdf, unlockPdf } from '../../app/lib/qpdf'
import { fixture, nodeCodec, setupQpdf } from './helpers'

beforeAll(setupQpdf)

async function expectPdfError(promise: Promise<unknown>): Promise<PdfKingdomError> {
  const error = await promise.then(
    () => null,
    (e: unknown) => e,
  )
  expect(error).toBeInstanceOf(PdfKingdomError)
  return error as PdfKingdomError
}

/** Datos de cifrado del PDF: versión del algoritmo (V) y revisión (R). */
async function encryptionInfo(bytes: Uint8Array) {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true })
  const encrypt = doc.context.lookup(doc.context.trailerInfo.Encrypt)
  if (!encrypt || !('get' in encrypt)) return null
  const dict = encrypt as unknown as { get(n: PDFName): unknown }
  const num = (key: string) => (dict.get(PDFName.of(key)) as PDFNumber | undefined)?.asNumber()
  return { V: num('V'), R: num('R') }
}

/** Tamaños (ancho × alto) de las imágenes que contiene un PDF. */
async function imageSizes(bytes: Uint8Array) {
  const doc = await PDFDocument.load(bytes)
  return doc.context
    .enumerateIndirectObjects()
    .filter(([, obj]) => obj instanceof PDFRawStream && obj.dict.get(PDFName.of('Subtype')) === PDFName.of('Image'))
    .map(([, obj]) => {
      const dict = (obj as PDFRawStream).dict
      return `${(dict.get(PDFName.of('Width')) as PDFNumber).asNumber()}x${(dict.get(PDFName.of('Height')) as PDFNumber).asNumber()}`
    })
    .sort()
}

describe('Desbloquear (qpdf)', () => {
  it('quita la contraseña si se indica la correcta', async () => {
    expect(await isEncrypted(fixture('con-contrasena.pdf'))).toBe(true)
    const out = await unlockPdf(fixture('con-contrasena.pdf'), 'reino123')
    expect(await isEncrypted(out)).toBe(false)
    const doc = await PDFDocument.load(out)
    expect(doc.getPageCount()).toBe(2)
  })

  it('también sirve la contraseña de propietario', async () => {
    const out = await unlockPdf(fixture('con-contrasena.pdf'), 'corona456')
    expect(await isEncrypted(out)).toBe(false)
  })

  it('avisa si la contraseña es incorrecta o falta', async () => {
    expect((await expectPdfError(unlockPdf(fixture('con-contrasena.pdf'), 'mala'))).code).toBe('wrong-password')
    expect((await expectPdfError(unlockPdf(fixture('con-contrasena.pdf')))).code).toBe('wrong-password')
  })

  it('quita las restricciones sin necesidad de contraseña', async () => {
    const out = await unlockPdf(fixture('con-restricciones.pdf'))
    expect(await isEncrypted(out)).toBe(false)
  })

  it('detecta archivos dañados o que no son PDF', async () => {
    expect((await expectPdfError(unlockPdf(fixture('danado.pdf')))).code).toBe('corrupt')
    expect((await expectPdfError(unlockPdf(fixture('no-es-pdf.pdf')))).code).toBe('invalid-format')
  })
})

describe('Proteger (qpdf)', () => {
  it('cifra con AES-256 y la contraseña indicada', async () => {
    const out = await protectPdf(fixture('tres-paginas.pdf'), 'Corona#2026')
    expect(await isEncrypted(out)).toBe(true)
    // V=5 / R=6 es el cifrado AES de 256 bits de PDF 2.0.
    expect(await encryptionInfo(out)).toEqual({ V: 5, R: 6 })
    await expect(PDFDocument.load(out)).rejects.toThrow()
    const opened = await PDFDocument.load(out, { password: 'Corona#2026' })
    expect(opened.getPageCount()).toBe(3)
  })

  it('el resultado se puede volver a desbloquear con la misma contraseña', async () => {
    const out = await protectPdf(fixture('diez-paginas.pdf'), 'clave con espacios y ñ')
    const back = await unlockPdf(out, 'clave con espacios y ñ')
    expect((await PDFDocument.load(back)).getPageCount()).toBe(10)
  })

  it('no vuelve a proteger un PDF que ya lo está', async () => {
    expect((await expectPdfError(protectPdf(fixture('con-restricciones.pdf'), 'x'))).code).toBe('encrypted')
  })

  it('exige una contraseña', async () => {
    expect((await expectPdfError(protectPdf(fixture('tres-paginas.pdf'), ''))).code).toBe('invalid-options')
  })
})

describe('passwordStrength', () => {
  it('valora la longitud y la variedad', () => {
    expect(passwordStrength('')).toBe('empty')
    expect(passwordStrength('1234')).toBe('weak')
    expect(passwordStrength('corona2026')).toBe('weak')
    expect(passwordStrength('Corona2026')).toBe('fair')
    expect(passwordStrength('Corona#2026!')).toBe('strong')
    expect(passwordStrength('El-Reino#De_Los-PDF-2026')).toBe('very-strong')
  })
})

describe('Comprimir', () => {
  it('baja: reduce mucho un PDF sin comprimir y conserva todas las páginas', async () => {
    const input = fixture('sin-comprimir.pdf')
    const out = await compressPdf(input, 'low', nodeCodec)
    expect(out.length).toBeLessThan(input.length * 0.5)
    expect((await PDFDocument.load(out)).getPageCount()).toBe(20)
  })

  it('baja: no cambia las imágenes', async () => {
    const input = fixture('con-fotos.pdf')
    const out = await optimizePdf(input)
    expect(await imageSizes(out)).toEqual(await imageSizes(input))
  })

  it('recomendada: reduce las fotos grandes y mantiene el texto', async () => {
    const input = fixture('con-fotos.pdf')
    const out = await compressPdf(input, 'recommended', nodeCodec)
    expect(out.length).toBeLessThan(input.length * 0.6)
    expect(await imageSizes(input)).toEqual(['2000x1500', '600x400'])
    // La foto grande baja a 1600 px de lado; la pequeña conserva su tamaño, pero en JPEG.
    expect(await imageSizes(out)).toEqual(['1600x1200', '600x400'])
    const doc = await PDFDocument.load(out)
    expect(doc.getPageCount()).toBe(2)
    expect(doc.getTitle()).toBe('Documento con fotos')
  })

  it('recomendada: deja intactas las imágenes pequeñas (como logotipos)', async () => {
    const doc = await PDFDocument.create()
    const logo = await doc.embedPng(fixture('logo-transparente.png'))
    doc.addPage().drawImage(logo, { x: 50, y: 50 })
    const input = await doc.save()
    const { changed, bytes } = await compressImages(input, nodeCodec, RECOMMENDED_IMAGES)
    expect(changed).toBe(0)
    expect(bytes).toBe(input)
  })

  it('avisa si no se consigue reducir el tamaño', async () => {
    const once = await optimizePdf(fixture('sin-comprimir.pdf'))
    expect((await expectPdfError(compressPdf(once, 'low', nodeCodec))).code).toBe('no-gain')
    expect(() => ensureSmaller(new Uint8Array(10), 10)).toThrow(PdfKingdomError)
  })

  it('no comprime PDF protegidos', async () => {
    expect((await expectPdfError(compressPdf(fixture('con-contrasena.pdf'), 'low', nodeCodec))).code).toBe('encrypted')
    expect((await expectPdfError(compressPdf(fixture('con-restricciones.pdf'), 'recommended', nodeCodec))).code).toBe('encrypted')
  })

  it('extrema: crea un PDF con una imagen por página del mismo tamaño', async () => {
    const jpeg = fixture('foto-horizontal.jpg')
    const out = await rasterPagesToPdf([
      { jpeg, width: 595.28, height: 841.89 },
      { jpeg, width: 841.89, height: 595.28 },
    ])
    const doc = await PDFDocument.load(out)
    expect(doc.getPages().map((p) => [Math.round(p.getWidth()), Math.round(p.getHeight())])).toEqual([
      [595, 842],
      [842, 595],
    ])
  })
})
