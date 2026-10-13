import { statSync } from 'node:fs'
import { PDFDocument } from '@cantoo/pdf-lib'
import { downloadResult, expect, fixturePath, test, uploadFixtures } from './utils'

const sizeOf = (name: string) => statSync(fixturePath(name)).size

test.describe('Comprimir PDF', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/comprimir-pdf')
  })

  test('baja: comprime sin pérdida y muestra el ahorro', async ({ page }) => {
    await uploadFixtures(page, ['sin-comprimir.pdf'])
    await page.getByLabel(/^Baja/).check()
    await page.getByTestId('run-tool').click()

    await expect(page.getByTestId('compress-stats')).toBeVisible()
    await expect(page.getByTestId('size-before')).toHaveText('92,7 KB')
    await expect(page.getByTestId('size-saved')).toHaveText(/\d+ %/)
    const saved = Number((await page.getByTestId('size-saved').textContent())!.replace(/\D/g, ''))
    expect(saved).toBeGreaterThan(50)

    const { name, bytes } = await downloadResult(page)
    expect(name).toBe('sin-comprimir_comprimido.pdf')
    expect(bytes.length).toBeLessThan(sizeOf('sin-comprimir.pdf') / 2)
    expect((await PDFDocument.load(bytes)).getPageCount()).toBe(20)
  })

  test('recomendada: reduce mucho un PDF con fotos', async ({ page }) => {
    await uploadFixtures(page, ['con-fotos.pdf'])
    await expect(page.getByLabel(/^Recomendada/)).toBeChecked()
    await expect(page.getByTestId('extreme-warning')).toHaveCount(0)
    await page.getByTestId('run-tool').click()

    const { bytes } = await downloadResult(page)
    expect(bytes.length).toBeLessThan(sizeOf('con-fotos.pdf') * 0.6)
    expect((await PDFDocument.load(bytes)).getPageCount()).toBe(2)
  })

  test('extrema: avisa de que el texto deja de ser seleccionable y reduce aún más', async ({ page }) => {
    await uploadFixtures(page, ['con-fotos.pdf'])
    await page.getByLabel(/^Extrema/).check()
    await expect(page.getByTestId('extreme-warning')).toContainText('el texto ya no será seleccionable')
    await page.getByTestId('run-tool').click()

    const { bytes } = await downloadResult(page)
    expect(bytes.length).toBeLessThan(sizeOf('con-fotos.pdf') * 0.3)
    const doc = await PDFDocument.load(bytes)
    expect(doc.getPageCount()).toBe(2)
    expect(Math.round(doc.getPage(0).getWidth())).toBe(595)
  })

  test('avisa si el PDF ya está optimizado', async ({ page }) => {
    await uploadFixtures(page, ['tres-paginas.pdf'])
    await page.getByLabel(/^Extrema/).check()
    await page.getByTestId('run-tool').click()
    await expect(page.getByTestId('compress-error')).toContainText('ya está bien optimizado')
  })

  test('no comprime PDF protegidos', async ({ page }) => {
    await uploadFixtures(page, ['con-contrasena.pdf'])
    await expect(page.getByTestId('file-error')).toContainText('Pide contraseña')
    await expect(page.getByTestId('run-tool')).toHaveCount(0)
  })
})
