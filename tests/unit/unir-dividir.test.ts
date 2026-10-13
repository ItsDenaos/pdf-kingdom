import { PDFDocument } from '@cantoo/pdf-lib'
import { unzipSync } from 'fflate'
import { describe, expect, it, vi } from 'vitest'
import { PdfKingdomError } from '../../app/lib/errors'
import { loadPdf } from '../../app/lib/pdf/load'
import { mergePdfs } from '../../app/lib/pdf/merge'
import { extractPageGroups } from '../../app/lib/pdf/split'
import { makeZip } from '../../app/lib/zip'
import { fixture, numberedPdf, pageNumbers } from './helpers'

/** Espera que la promesa falle con un error de PDF Kingdom y lo devuelve. */
async function expectPdfError(promise: Promise<unknown>): Promise<PdfKingdomError> {
  const error = await promise.then(
    () => null,
    (e: unknown) => e,
  )
  expect(error).toBeInstanceOf(PdfKingdomError)
  return error as PdfKingdomError
}

describe('loadPdf', () => {
  it('abre un PDF normal', async () => {
    const doc = await loadPdf(fixture('tres-paginas.pdf'))
    expect(doc.getPageCount()).toBe(3)
  })

  it('rechaza archivos que no son PDF', async () => {
    expect((await expectPdfError(loadPdf(fixture('no-es-pdf.pdf')))).code).toBe('invalid-format')
  })

  it('detecta PDF dañados', async () => {
    expect((await expectPdfError(loadPdf(fixture('danado.pdf')))).code).toBe('corrupt')
  })

  it('detecta PDF con contraseña o con restricciones', async () => {
    expect((await expectPdfError(loadPdf(fixture('con-contrasena.pdf')))).code).toBe('encrypted')
    expect((await expectPdfError(loadPdf(fixture('con-restricciones.pdf')))).code).toBe('encrypted')
  })

  it('distingue una contraseña incorrecta', async () => {
    const error = await expectPdfError(loadPdf(fixture('con-contrasena.pdf'), { password: 'mala' }))
    expect(error.code).toBe('wrong-password')
  })
})

describe('mergePdfs', () => {
  it('une los PDF en el orden indicado', async () => {
    const a = await numberedPdf(2) // páginas 1, 2
    const b = await numberedPdf(3) // páginas 1, 2, 3
    const merged = await mergePdfs([b, a])
    expect(await pageNumbers(merged)).toEqual([1, 2, 3, 1, 2])
  })

  it('une los PDF de prueba (3 + 10 + 2 páginas)', async () => {
    const merged = await mergePdfs([
      fixture('tres-paginas.pdf'),
      fixture('diez-paginas.pdf'),
      fixture('horizontal.pdf'),
    ])
    const doc = await PDFDocument.load(merged, { updateMetadata: false })
    expect(doc.getPageCount()).toBe(15)
    expect(doc.getProducer()).toBe('PDF Kingdom')
    // La última página conserva su orientación horizontal.
    const last = doc.getPage(14)
    expect(last.getWidth()).toBeGreaterThan(last.getHeight())
  })

  it('informa del progreso hasta llegar al 100 %', async () => {
    const onProgress = vi.fn()
    await mergePdfs([await numberedPdf(1), await numberedPdf(1)], onProgress)
    expect(onProgress).toHaveBeenLastCalledWith(1)
    const values = onProgress.mock.calls.map(([v]) => v as number)
    expect([...values].sort((x, y) => x - y)).toEqual(values)
  })

  it('indica qué archivo falló', async () => {
    const error = await expectPdfError(
      mergePdfs([fixture('tres-paginas.pdf'), fixture('con-contrasena.pdf')]),
    )
    expect(error.code).toBe('encrypted')
    expect(error.fileIndex).toBe(1)
  })

  it('no acepta una lista vacía', async () => {
    expect((await expectPdfError(mergePdfs([]))).code).toBe('empty')
  })
})

describe('extractPageGroups', () => {
  it('crea un PDF por grupo con las páginas correctas', async () => {
    const source = await numberedPdf(10)
    const outputs = await extractPageGroups(source, [[0, 1, 2], [4], [7, 8, 9]])
    expect(outputs).toHaveLength(3)
    expect(await pageNumbers(outputs[0]!)).toEqual([1, 2, 3])
    expect(await pageNumbers(outputs[1]!)).toEqual([5])
    expect(await pageNumbers(outputs[2]!)).toEqual([8, 9, 10])
  })

  it('una página por archivo', async () => {
    const groups = Array.from({ length: 10 }, (_, i) => [i])
    const outputs = await extractPageGroups(fixture('diez-paginas.pdf'), groups)
    expect(outputs).toHaveLength(10)
    for (const out of outputs) expect((await PDFDocument.load(out)).getPageCount()).toBe(1)
  })

  it('rechaza páginas que no existen o grupos vacíos', async () => {
    const source = await numberedPdf(3)
    expect((await expectPdfError(extractPageGroups(source, [[0, 5]]))).code).toBe('invalid-options')
    expect((await expectPdfError(extractPageGroups(source, [[]]))).code).toBe('invalid-options')
    expect((await expectPdfError(extractPageGroups(source, []))).code).toBe('invalid-options')
  })
})

describe('makeZip', () => {
  it('empaqueta los archivos y evita nombres repetidos', () => {
    const zip = makeZip([
      { name: 'a.pdf', data: new Uint8Array([1, 2, 3]) },
      { name: 'a.pdf', data: new Uint8Array([4]) },
    ])
    const files = unzipSync(zip)
    expect(Object.keys(files)).toEqual(['a.pdf', 'a (2).pdf'])
    expect(Array.from(files['a (2).pdf']!)).toEqual([4])
  })
})
