import { PDFDocument } from '@cantoo/pdf-lib'
import { downloadResult, expect, test, uploadFixtures } from './utils'

function shapes(doc: PDFDocument) {
  return doc.getPages().map((p) => (p.getWidth() > p.getHeight() ? 'horizontal' : 'vertical'))
}

test.describe('JPG a PDF', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/jpg-a-pdf')
  })

  test('convierte varias imágenes en un PDF, una por página', async ({ page }) => {
    await uploadFixtures(page, ['foto-horizontal.jpg', 'foto-girada-exif.jpg', 'logo-transparente.png'])
    const items = page.getByTestId('file-item')
    await expect(items).toHaveCount(3)
    // La foto del móvil se reconoce como vertical gracias a su orientación EXIF.
    await expect(items.nth(1)).toContainText('480 × 640 px')
    await expect(page.getByTestId('images-summary')).toHaveText('Se creará un PDF de 3 páginas.')
    await expect(page.getByTestId('layout-preview')).toBeVisible()

    await page.getByTestId('run-tool').click()
    const { name, bytes } = await downloadResult(page)
    expect(name).toBe('foto-horizontal_y_2_mas.pdf')
    const doc = await PDFDocument.load(bytes)
    expect(doc.getPageCount()).toBe(3)
    // A4 con orientación automática: cada página sigue la forma de su imagen.
    expect(shapes(doc)).toEqual(['horizontal', 'vertical', 'horizontal'])
    expect(Math.round(doc.getPage(1).getWidth())).toBe(595)
  })

  test('respeta el orden, el tamaño de página, la orientación y los márgenes elegidos', async ({ page }) => {
    await uploadFixtures(page, ['foto-horizontal.jpg', 'foto-vertical.jpg'])
    await expect(page.getByTestId('file-item')).toHaveCount(2)
    await page.getByRole('button', { name: 'Mover foto-vertical.jpg una posición antes' }).click()
    await expect(page.getByTestId('file-item').first()).toContainText('foto-vertical.jpg')

    await page.getByText('Carta', { exact: true }).click()
    await page.getByText('Vertical', { exact: true }).click()
    await page.getByText('Grande', { exact: true }).click()
    await page.getByTestId('run-tool').click()

    const { name, bytes } = await downloadResult(page)
    expect(name).toBe('foto-vertical_y_1_mas.pdf')
    const doc = await PDFDocument.load(bytes)
    for (const p of doc.getPages()) expect([p.getWidth(), p.getHeight()]).toEqual([612, 792])
  })

  test('"Igual que la imagen" crea páginas con la forma de cada foto', async ({ page }) => {
    await uploadFixtures(page, ['foto-girada-exif.jpg'])
    await page.getByText('Igual que la imagen', { exact: true }).click()
    // La orientación no se aplica en este modo: sus opciones quedan desactivadas.
    await expect(page.getByRole('radio', { name: 'Vertical' })).toBeDisabled()
    await page.getByText('Sin margen', { exact: true }).click()
    await page.getByTestId('run-tool').click()
    const { name, bytes } = await downloadResult(page)
    expect(name).toBe('foto-girada-exif.pdf')
    const p = (await PDFDocument.load(bytes)).getPage(0)
    expect(p.getHeight() / p.getWidth()).toBeCloseTo(640 / 480, 2)
  })

  test('avisa de imágenes dañadas y de archivos que no son imágenes', async ({ page }) => {
    await uploadFixtures(page, ['foto-horizontal.jpg', 'imagen-danada.jpg', 'no-es-imagen.png'])
    await expect(page.getByText('no son imágenes JPG o PNG: no-es-imagen.png')).toBeVisible()
    await expect(page.getByTestId('file-item')).toHaveCount(2)
    await expect(page.getByTestId('file-error')).toHaveText('La imagen está dañada o no se puede leer.')
    await expect(page.getByTestId('run-tool')).toBeDisabled()

    await page.getByRole('button', { name: 'Quitar imagen-danada.jpg' }).click()
    await expect(page.getByTestId('run-tool')).toBeEnabled()
  })
})
