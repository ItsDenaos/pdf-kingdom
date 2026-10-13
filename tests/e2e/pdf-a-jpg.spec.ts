import { unzipSync } from 'fflate'
import { readImageInfo } from '../../app/lib/images'
import { downloadResult, expect, test, uploadFixtures } from './utils'

// Una página A4 mide 595,28 × 841,89 puntos (1 punto = 1/72 de pulgada).
const pixels = (points: number, dpi: number) => Math.floor((points * dpi) / 72)

test.describe('PDF a JPG', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/pdf-a-jpg')
    await uploadFixtures(page, ['diez-paginas.pdf'])
    await expect(page.getByTestId('file-item')).toContainText('10 páginas')
    await expect(page.getByTestId('page-grid').locator('li')).toHaveCount(10)
  })

  test('convierte todas las páginas y las descarga en un .zip', async ({ page }) => {
    await expect(page.getByTestId('jpg-summary')).toHaveText('Se crearán 10 imágenes JPG dentro de un archivo .zip.')
    await page.getByTestId('run-tool').click()

    const { name, bytes } = await downloadResult(page)
    expect(name).toBe('diez-paginas_imagenes.zip')
    const files = unzipSync(bytes)
    const names = Object.keys(files)
    expect(names).toHaveLength(10)
    expect(names[0]).toBe('diez-paginas_pagina_01.jpg')
    expect(names[9]).toBe('diez-paginas_pagina_10.jpg')

    // Calidad normal: 150 ppp.
    const info = readImageInfo(files[names[0]!]!)
    expect(info?.type).toBe('jpeg')
    expect(info?.width).toBe(pixels(595.28, 150))
    expect(info?.height).toBe(pixels(841.89, 150))
  })

  test('una sola página en alta calidad se descarga como JPG', async ({ page }) => {
    await page.getByText('Solo algunas', { exact: true }).click()
    await page.getByTestId('ranges-input').fill('2')
    await expect(page.locator('[data-included="true"]')).toHaveCount(1)
    await page.getByLabel(/Alta \(300 ppp\)/).check()
    await expect(page.getByTestId('jpg-summary')).toHaveText('Se creará 1 imagen JPG.')

    await page.getByTestId('run-tool').click()
    const { name, bytes } = await downloadResult(page)
    expect(name).toBe('diez-paginas_pagina_2.jpg')
    expect(readImageInfo(bytes)).toMatchObject({ type: 'jpeg', width: pixels(595.28, 300) })
  })

  test('convierte solo las páginas elegidas', async ({ page }) => {
    await page.getByText('Solo algunas', { exact: true }).click()
    await page.getByTestId('ranges-input').fill('1-3, 9')
    await page.getByLabel(/Ligera \(96 ppp\)/).check()
    await page.getByTestId('run-tool').click()
    const { bytes } = await downloadResult(page)
    expect(Object.keys(unzipSync(bytes))).toEqual([
      'diez-paginas_pagina_01.jpg',
      'diez-paginas_pagina_02.jpg',
      'diez-paginas_pagina_03.jpg',
      'diez-paginas_pagina_09.jpg',
    ])
  })

  test('explica los rangos incorrectos', async ({ page }) => {
    await page.getByText('Solo algunas', { exact: true }).click()
    await page.getByTestId('ranges-input').fill('11')
    await expect(page.getByTestId('range-errors')).toHaveText('La página 11 no existe: el documento tiene 10 páginas.')
    await page.getByTestId('ranges-input').fill('')
    await page.getByTestId('run-tool').click()
    await expect(page.getByTestId('range-errors')).toHaveText('Escribe al menos una página o un rango.')
  })
})
