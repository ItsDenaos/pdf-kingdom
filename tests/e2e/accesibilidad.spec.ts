import AxeBuilder from '@axe-core/playwright'
import { ALL_PAGES, expect, test, uploadFixtures } from './utils'

/**
 * Revisión automática de accesibilidad (WCAG 2.2 A y AA) con axe: contraste, etiquetas,
 * estructura de encabezados, nombres de botones, etc. Se comprueba en modo claro y oscuro.
 */
async function audit(page: import('@playwright/test').Page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze()
  return results.violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(' | ')}`)
}

for (const scheme of ['light', 'dark'] as const) {
  test.describe(`Accesibilidad (${scheme === 'light' ? 'modo claro' : 'modo oscuro'})`, () => {
    test.use({ colorScheme: scheme })

    for (const path of ALL_PAGES) {
      test(`sin problemas en ${path}`, async ({ page }) => {
        await page.goto(path)
        expect(await audit(page)).toEqual([])
      })
    }

    test('sin problemas con archivos cargados y opciones visibles', async ({ page }) => {
      await page.goto('/unir-pdf')
      await uploadFixtures(page, ['tres-paginas.pdf', 'con-contrasena.pdf'])
      await expect(page.getByTestId('file-error')).toBeVisible()
      expect(await audit(page)).toEqual([])

      await page.goto('/dividir-pdf')
      await uploadFixtures(page, ['diez-paginas.pdf'])
      await page.getByTestId('ranges-input').fill('1-3, 20')
      await expect(page.getByTestId('range-errors')).not.toBeEmpty()
      expect(await audit(page)).toEqual([])

      await page.goto('/proteger-pdf')
      await uploadFixtures(page, ['tres-paginas.pdf'])
      await page.getByTestId('password-input').fill('1234')
      await page.getByTestId('confirm-input').fill('12')
      expect(await audit(page)).toEqual([])
    })
  })
}
