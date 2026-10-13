import { expect, test } from './utils'

test.describe('Inicio', () => {
  test('muestra el eslogan, el mensaje de privacidad y las 8 herramientas', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/PDF Kingdom/)
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Gobierna tus PDF')
    await expect(page.getByText('Tus archivos nunca salen de tu dispositivo').first()).toBeVisible()

    const cards = page.locator('#herramientas li')
    await expect(cards).toHaveCount(8)
    for (const name of ['Unir PDF', 'Dividir PDF', 'Rotar PDF', 'Comprimir PDF', 'Desbloquear PDF', 'Proteger PDF', 'JPG a PDF', 'PDF a JPG']) {
      await expect(cards.getByRole('heading', { name, exact: true })).toBeVisible()
    }
  })

  test('las tarjetas disponibles llevan a su herramienta', async ({ page }) => {
    await page.goto('/')
    await page.locator('#herramientas').getByRole('link', { name: /Dividir PDF/ }).click()
    await expect(page).toHaveURL(/\/dividir-pdf$/)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Dividir PDF')
  })

  test('no crea cookies, ni siquiera al cambiar el tema', async ({ page, context }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /Cambiar tema/ }).click()
    await expect(page.locator('html')).toHaveClass(/light|dark/)
    expect(await context.cookies()).toEqual([])
  })

  test('el modo oscuro se aplica según la preferencia del sistema', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' })
    await page.goto('/')
    await expect(page.locator('html')).toHaveClass(/dark/)
  })
})
