import { PDFDocument } from '@cantoo/pdf-lib'
import { unzipSync } from 'fflate'
import { downloadResult, expect, test, uploadFixtures } from './utils'

async function pageCount(bytes: Uint8Array) {
  return (await PDFDocument.load(bytes)).getPageCount()
}

test.describe('Dividir PDF', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dividir-pdf')
    await uploadFixtures(page, ['diez-paginas.pdf'])
    await expect(page.getByTestId('file-item')).toContainText('10 páginas')
  })

  test('divide por rangos y descarga un .zip', async ({ page }) => {
    await expect(page.getByTestId('page-grid').locator('li')).toHaveCount(10)
    await page.getByTestId('ranges-input').fill('1-3, 5, 8-10')
    await expect(page.getByTestId('split-summary')).toHaveText('Se crearán 3 PDF dentro de un archivo .zip.')
    // La vista previa marca 7 páginas incluidas.
    await expect(page.locator('[data-included="true"]')).toHaveCount(7)

    await page.getByTestId('run-tool').click()
    const { name, bytes } = await downloadResult(page)
    expect(name).toBe('diez-paginas_dividido.zip')

    const files = unzipSync(bytes)
    expect(Object.keys(files)).toEqual([
      'diez-paginas_paginas_1-3.pdf',
      'diez-paginas_pagina_5.pdf',
      'diez-paginas_paginas_8-10.pdf',
    ])
    expect(await pageCount(files['diez-paginas_paginas_1-3.pdf']!)).toBe(3)
    expect(await pageCount(files['diez-paginas_pagina_5.pdf']!)).toBe(1)
    expect(await pageCount(files['diez-paginas_paginas_8-10.pdf']!)).toBe(3)
  })

  test('una página por archivo', async ({ page }) => {
    await page.getByLabel(/Una página por archivo/).check()
    await expect(page.getByTestId('split-summary')).toHaveText('Se crearán 10 PDF dentro de un archivo .zip.')
    await page.getByTestId('run-tool').click()

    const { bytes } = await downloadResult(page)
    const names = Object.keys(unzipSync(bytes))
    expect(names).toHaveLength(10)
    expect(names[0]).toBe('diez-paginas_pagina_01.pdf')
    expect(names[9]).toBe('diez-paginas_pagina_10.pdf')
  })

  test('un solo rango se descarga directamente como PDF', async ({ page }) => {
    await page.getByTestId('ranges-input').fill('2-4')
    await expect(page.getByTestId('split-summary')).toHaveText('Se creará 1 PDF.')
    await page.getByTestId('run-tool').click()
    const { name, bytes } = await downloadResult(page)
    expect(name).toBe('diez-paginas_paginas_2-4.pdf')
    expect(await pageCount(bytes)).toBe(3)
  })

  test('puede juntar los rangos en un solo PDF', async ({ page }) => {
    await page.getByTestId('ranges-input').fill('1-3, 5, 8-10')
    await page.getByLabel('Juntar todos los rangos en un solo PDF').check()
    await page.getByTestId('run-tool').click()
    const { name, bytes } = await downloadResult(page)
    expect(name).toBe('diez-paginas_seleccion.pdf')
    expect(await pageCount(bytes)).toBe(7)
  })

  test('explica los rangos incorrectos', async ({ page }) => {
    const input = page.getByTestId('ranges-input')
    const errors = page.getByTestId('range-errors')

    await input.fill('4-12')
    await expect(errors).toHaveText('La página 12 no existe: el documento tiene 10 páginas.')
    await input.fill('abc')
    await expect(errors).toContainText('No se entiende «abc»')
    await input.fill('5-3')
    await expect(errors).toContainText('está al revés')

    await input.fill('')
    await page.getByTestId('run-tool').click()
    await expect(errors).toHaveText('Escribe al menos una página o un rango.')
    await expect(input).toBeFocused()
  })

  test('avisa si el PDF tiene contraseña', async ({ page }) => {
    await uploadFixtures(page, ['con-contrasena.pdf'])
    await expect(page.getByTestId('file-error')).toContainText('Pide contraseña')
    await expect(page.getByTestId('run-tool')).toBeDisabled()
  })
})
