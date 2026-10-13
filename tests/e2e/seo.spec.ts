import { ALL_PAGES, expect, test } from './utils'

const SITE = 'https://pdf-kingdom.netlify.app'

test.describe('SEO', () => {
  test('cada página tiene título, descripción, encabezado, enlace canónico e imagen social propios', async ({ page }) => {
    const titles = new Set<string>()
    const descriptions = new Set<string>()
    for (const path of ALL_PAGES) {
      await page.goto(path)
      const title = await page.title()
      const description = (await page.locator('meta[name="description"]').getAttribute('content')) ?? ''
      expect(title, path).toContain('PDF Kingdom')
      expect(description.length, path).toBeGreaterThan(50)
      expect(titles.has(title), `Título repetido: ${title}`).toBe(false)
      expect(descriptions.has(description), `Descripción repetida en ${path}`).toBe(false)
      titles.add(title)
      descriptions.add(description)

      await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)
      const canonical = path === '/' ? `${SITE}/` : `${SITE}${path}`
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', canonical)
      await expect(page.locator('meta[property="og:url"]')).toHaveAttribute('content', canonical)
      await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', `${SITE}/og-image.png`)
      await expect(page.locator('html')).toHaveAttribute('lang', 'es')
    }
  })

  test('las herramientas incluyen datos estructurados válidos', async ({ page }) => {
    await page.goto('/comprimir-pdf')
    const json = await page.locator('script[type="application/ld+json"]').first().textContent()
    const data = JSON.parse(json!)
    expect(data).toMatchObject({
      '@type': 'WebApplication',
      url: `${SITE}/comprimir-pdf`,
      offers: { price: '0' },
    })

    await page.goto('/')
    const home = JSON.parse((await page.locator('script[type="application/ld+json"]').first().textContent())!)
    const faq = home['@graph'].find((node: { '@type': string }) => node['@type'] === 'FAQPage')
    expect(faq.mainEntity).toHaveLength(5)
  })

  test('sitemap.xml lista todas las páginas y robots.txt lo indica', async ({ request }) => {
    const sitemap = await (await request.get('/sitemap.xml')).text()
    for (const path of ALL_PAGES) {
      expect(sitemap).toContain(`<loc>${path === '/' ? `${SITE}/` : `${SITE}${path}`}</loc>`)
    }
    expect(sitemap).not.toContain('404')
    const robots = await (await request.get('/robots.txt')).text()
    expect(robots).toContain(`Sitemap: ${SITE}/sitemap.xml`)
  })

  test('la imagen social y los iconos existen', async ({ request }) => {
    for (const file of ['/og-image.png', '/apple-touch-icon.png', '/icon-192.png', '/icon-512.png', '/site.webmanifest']) {
      const response = await request.get(file)
      expect(response.status(), file).toBe(200)
    }
  })

  test('una dirección inexistente muestra una página 404 útil', async ({ page }) => {
    const response = await page.goto('/esta-pagina-no-existe')
    expect(response?.status()).toBe(404)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Esta página no existe')
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex')
    await page.getByRole('link', { name: 'Volver al inicio' }).click()
    await expect(page).toHaveURL(/\/$/)
  })
})

test.describe('Privacidad', () => {
  test('la página de privacidad se enlaza desde el pie y explica lo esencial', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('contentinfo').getByRole('link', { name: 'Política de privacidad' }).click()
    await expect(page).toHaveURL(/\/privacidad$/)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Política de privacidad')
    for (const text of ['nunca salen de tu dispositivo', 'No usamos cookies de rastreo', 'pdfkingdom-tema', 'Netlify']) {
      await expect(page.getByText(text).first()).toBeVisible()
    }
  })

  test('el servidor envía las cabeceras de seguridad', async ({ request }) => {
    const response = await request.get('/unir-pdf')
    const headers = response.headers()
    expect(headers['content-security-policy']).toContain("connect-src 'self'")
    expect(headers['content-security-policy']).toContain("'wasm-unsafe-eval'")
    expect(headers['content-security-policy']).not.toContain("script-src 'self' 'unsafe-inline'")
    expect(headers['referrer-policy']).toBe('no-referrer')
    expect(headers['x-content-type-options']).toBe('nosniff')
  })

  test('las preguntas frecuentes se abren y cierran', async ({ page }) => {
    await page.goto('/')
    const first = page.getByTestId('faq-item').first()
    await first.locator('summary').click()
    await expect(first).toHaveAttribute('open', '')
    await expect(first).toContainText('gratuitas')
  })
})
