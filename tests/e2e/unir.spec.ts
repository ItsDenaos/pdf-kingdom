import { PDFDocument } from '@cantoo/pdf-lib'
import { downloadResult, expect, test, uploadFixtures } from './utils'

test.describe('Unir PDF', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/unir-pdf')
  })

  test('une dos PDF y descarga el resultado con un nombre descriptivo', async ({ page }) => {
    await uploadFixtures(page, ['tres-paginas.pdf', 'diez-paginas.pdf'])

    const items = page.getByTestId('file-item')
    await expect(items).toHaveCount(2)
    await expect(items.nth(0)).toContainText('3 páginas')
    await expect(items.nth(1)).toContainText('10 páginas')
    await expect(page.getByTestId('merge-summary')).toHaveText('Se unirán 2 archivos en un PDF de 13 páginas.')
    // Las miniaturas se generan en el navegador.
    await expect(items.nth(0).locator('img')).toBeVisible()

    await page.getByTestId('run-tool').click()
    await expect(page.getByTestId('result-panel')).toBeVisible()
    await expect(page.getByTestId('result-name')).toHaveText('tres-paginas_unido.pdf')

    const { name, bytes } = await downloadResult(page)
    expect(name).toBe('tres-paginas_unido.pdf')
    const doc = await PDFDocument.load(bytes)
    expect(doc.getPageCount()).toBe(13)
  })

  test('respeta el orden elegido con los botones de flecha', async ({ page }) => {
    await uploadFixtures(page, ['tres-paginas.pdf', 'horizontal.pdf'])
    const items = page.getByTestId('file-item')
    await expect(items).toHaveCount(2)
    await expect(items.nth(1)).toContainText('2 páginas')

    await page.getByRole('button', { name: 'Mover horizontal.pdf una posición antes' }).click()
    await expect(items.nth(0)).toContainText('horizontal.pdf')

    await page.getByTestId('run-tool').click()
    const { name, bytes } = await downloadResult(page)
    expect(name).toBe('horizontal_unido.pdf')
    const doc = await PDFDocument.load(bytes)
    expect(doc.getPageCount()).toBe(5)
    // La primera página ahora es la horizontal.
    const first = doc.getPage(0)
    expect(first.getWidth()).toBeGreaterThan(first.getHeight())
  })

  test('"Procesar otro" vuelve al inicio de la herramienta', async ({ page }) => {
    await uploadFixtures(page, ['tres-paginas.pdf', 'horizontal.pdf'])
    await expect(page.getByTestId('run-tool')).toBeEnabled()
    await page.getByTestId('run-tool').click()
    await page.getByTestId('process-another').click()
    await expect(page.getByTestId('dropzone')).toBeVisible()
  })

  test('pide al menos dos archivos', async ({ page }) => {
    await uploadFixtures(page, ['tres-paginas.pdf'])
    await expect(page.getByText('Añade al menos 2 PDF para unirlos.')).toBeVisible()
    await expect(page.getByTestId('run-tool')).toBeDisabled()
  })

  test('avisa de PDF con contraseña, con restricciones o dañados', async ({ page }) => {
    await uploadFixtures(page, ['tres-paginas.pdf', 'con-contrasena.pdf', 'con-restricciones.pdf', 'danado.pdf'])
    const errors = page.getByTestId('file-error')
    await expect(errors).toHaveCount(3)
    await expect(errors.nth(0)).toContainText('Pide contraseña')
    await expect(errors.nth(1)).toContainText('restricciones')
    await expect(errors.nth(2)).toContainText('dañado')
    await expect(page.getByText('Quita los archivos marcados para poder continuar.')).toBeVisible()
    await expect(page.getByTestId('run-tool')).toBeDisabled()

    // Al quitar los problemáticos, se puede continuar.
    for (const name of ['con-contrasena.pdf', 'con-restricciones.pdf', 'danado.pdf']) {
      await page.getByRole('button', { name: `Quitar ${name}` }).click()
    }
    await uploadFixtures(page, ['horizontal.pdf'])
    await expect(page.getByTestId('run-tool')).toBeEnabled()
  })

  test('rechaza archivos que no son PDF', async ({ page }) => {
    await uploadFixtures(page, ['no-es-pdf.pdf'])
    await expect(page.getByText('No se añadieron estos archivos porque no son PDF: no-es-pdf.pdf')).toBeVisible()
    await expect(page.getByTestId('file-item')).toHaveCount(0)
  })
})
