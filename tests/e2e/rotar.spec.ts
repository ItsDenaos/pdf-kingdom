import { PDFDocument } from '@cantoo/pdf-lib'
import { normalizeAngle } from '../../app/lib/angles'
import { downloadResult, expect, test, uploadFixtures } from './utils'

async function angles(bytes: Uint8Array) {
  const doc = await PDFDocument.load(bytes)
  return doc.getPages().map((p) => normalizeAngle(p.getRotation().angle))
}

test.describe('Rotar PDF', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/rotar-pdf')
    await uploadFixtures(page, ['tres-paginas.pdf'])
    await expect(page.getByTestId('rotate-grid').locator('li')).toHaveCount(3)
  })

  test('gira una página concreta con vista previa', async ({ page }) => {
    const run = page.getByTestId('run-tool')
    await expect(run).toBeDisabled()
    await expect(page.getByTestId('rotate-summary')).toHaveText('Gira al menos una página para continuar.')

    await page.getByRole('button', { name: 'Girar la página 2 a la derecha' }).click()
    const cards = page.getByTestId('rotate-grid').locator('li')
    await expect(cards.nth(1)).toHaveAttribute('data-rotation', '90')
    await expect(cards.nth(1)).toContainText('90°')
    await expect(page.getByTestId('rotate-summary')).toHaveText('Se girará 1 página.')

    await run.click()
    const { name, bytes } = await downloadResult(page)
    expect(name).toBe('tres-paginas_rotado.pdf')
    expect(await angles(bytes)).toEqual([0, 90, 0])
  })

  test('gira todas las páginas a la vez y se puede deshacer', async ({ page }) => {
    await page.getByRole('button', { name: 'Todas a la izquierda' }).click()
    await expect(page.getByTestId('rotate-summary')).toHaveText('Se girarán 3 páginas.')
    await page.getByRole('button', { name: 'Deshacer giros' }).click()
    await expect(page.getByTestId('run-tool')).toBeDisabled()

    await page.getByRole('button', { name: 'Todas a la izquierda' }).click()
    await page.getByRole('button', { name: 'Girar la página 3 a la izquierda' }).click()
    await page.getByTestId('run-tool').click()
    const { bytes } = await downloadResult(page)
    expect(await angles(bytes)).toEqual([270, 270, 180])
  })

  test('respeta el giro que ya traía el PDF', async ({ page }) => {
    await uploadFixtures(page, ['con-giro-previo.pdf'])
    await expect(page.getByTestId('file-item')).toContainText('con-giro-previo.pdf')
    await page.getByRole('button', { name: 'Todas a la derecha' }).click()
    await page.getByTestId('run-tool').click()
    const { bytes } = await downloadResult(page)
    expect(await angles(bytes)).toEqual([90, 180])
  })

  test('avisa si el PDF está protegido', async ({ page }) => {
    await uploadFixtures(page, ['con-restricciones.pdf'])
    await expect(page.getByTestId('file-error')).toContainText('restricciones')
    await expect(page.getByTestId('run-tool')).toBeDisabled()
  })
})
