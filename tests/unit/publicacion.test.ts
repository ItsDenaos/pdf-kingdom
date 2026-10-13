import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import {
  buildContentSecurityPolicy,
  buildHeaders,
  buildRobots,
  buildSitemap,
  inlineScriptHashes,
  listPages,
} from '../../scripts/despues-de-generar.mjs'
import { DEFAULT_SITE_URL, resolveSiteUrl } from '../../scripts/sitio.mjs'

describe('dirección del sitio', () => {
  it('usa NUXT_PUBLIC_SITE_URL, si no la URL de Netlify y si no la de por defecto', () => {
    expect(resolveSiteUrl({ NUXT_PUBLIC_SITE_URL: 'https://pdfkingdom.es/', URL: 'https://x.netlify.app' })).toBe('https://pdfkingdom.es')
    expect(resolveSiteUrl({ URL: 'https://x.netlify.app' })).toBe('https://x.netlify.app')
    expect(resolveSiteUrl({})).toBe(DEFAULT_SITE_URL)
  })
})

describe('sitemap y robots', () => {
  const dir = mkdtempSync(join(tmpdir(), 'pdfk-'))
  afterAll(() => rmSync(dir, { recursive: true, force: true }))

  it('encuentra las páginas generadas, sin 404 ni carpetas internas', () => {
    for (const file of ['index.html', 'unir-pdf.html', 'privacidad.html', '404.html', '200.html']) writeFileSync(join(dir, file), '')
    mkdirSync(join(dir, '_nuxt'))
    writeFileSync(join(dir, '_nuxt', 'oculto.html'), '')
    expect(listPages(dir)).toEqual(['/', '/privacidad', '/unir-pdf'])
  })

  it('crea un sitemap con direcciones absolutas', () => {
    const xml = buildSitemap('https://pdfkingdom.es', ['/', '/unir-pdf'], '2026-10-12')
    expect(xml).toContain('<loc>https://pdfkingdom.es/</loc>')
    expect(xml).toContain('<loc>https://pdfkingdom.es/unir-pdf</loc>')
    expect(xml).toContain('<lastmod>2026-10-12</lastmod>')
  })

  it('robots.txt apunta al sitemap', () => {
    expect(buildRobots('https://pdfkingdom.es')).toContain('Sitemap: https://pdfkingdom.es/sitemap.xml')
  })
})

describe('política de seguridad (CSP)', () => {
  it('calcula la huella solo de los scripts incrustados que se ejecutan', () => {
    const html = `
      <script type="importmap">{"imports":{}}</script>
      <script src="/_nuxt/app.js" type="module"></script>
      <script>window.a = 1</script>
      <script type="application/json">{"datos":true}</script>
      <script type="application/ld+json">{"@type":"WebSite"}</script>`
    const hashes = inlineScriptHashes(html)
    expect(hashes.size).toBe(2)
    // Huella de "window.a = 1" (calculada aparte con: echo -n 'window.a = 1' | openssl dgst -sha256 -binary | base64).
    expect(hashes).toContain("'sha256-Aif1QuaDxF56ZK3+IyoelKcjrWC+BWl5ZGfcO1AMmA4='")
  })

  it('solo permite conexiones al propio sitio y nunca scripts incrustados arbitrarios', () => {
    const csp = buildContentSecurityPolicy(new Set(["'sha256-abc='"]))
    expect(csp).toContain("connect-src 'self'")
    expect(csp).toContain("script-src 'self' 'wasm-unsafe-eval' 'sha256-abc='")
    expect(csp).not.toMatch(/script-src[^;]*'unsafe-inline'/)
    expect(csp).not.toMatch(/script-src[^;]*'unsafe-eval'/)
    expect(csp).toContain("frame-ancestors 'none'")
  })

  it('genera el archivo _headers con seguridad y caché', () => {
    const headers = buildHeaders('default-src \'self\'')
    expect(headers).toMatch(/^\/\*\n {2}Content-Security-Policy: default-src 'self'/m)
    expect(headers).toContain('Referrer-Policy: no-referrer')
    expect(headers).toMatch(/\/_nuxt\/\*\n {2}Cache-Control: public, max-age=31536000, immutable/)
  })
})
