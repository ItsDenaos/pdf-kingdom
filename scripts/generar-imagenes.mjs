/**
 * Genera las imágenes PNG del sitio a partir del logo SVG (se ejecuta una vez y se guardan en public/):
 *  - og-image.png (1200×630): la que se ve al compartir un enlace en redes y mensajería.
 *  - apple-touch-icon.png (180×180) e icon-192/512.png: iconos para "añadir a pantalla de inicio".
 * Uso: npm run images  (necesita los navegadores de Playwright: npx playwright install chromium)
 */
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { chromium } from '@playwright/test'

const root = fileURLToPath(new URL('..', import.meta.url))
const publicDir = join(root, 'public')
const font = (pkg, file) => pathToFileURL(join(root, 'node_modules', '@fontsource-variable', pkg, 'files', file)).href

// El mismo emblema que el favicon, sin la declaración XML.
const mark = readFileSync(join(publicDir, 'favicon.svg'), 'utf8')

const styles = `
  @font-face { font-family: Fraunces; src: url('${font('fraunces', 'fraunces-latin-wght-normal.woff2')}'); font-weight: 100 900; }
  @font-face { font-family: Jakarta; src: url('${font('plus-jakarta-sans', 'plus-jakarta-sans-latin-wght-normal.woff2')}'); font-weight: 200 800; }
  * { margin: 0; box-sizing: border-box; }
  body { width: 100vw; height: 100vh; overflow: hidden; }
`

const ogHtml = `<!doctype html><html lang="es"><head><meta charset="utf-8"><style>${styles}
  body { display: flex; flex-direction: column; justify-content: center; padding: 80px 90px; color: #fff;
    font-family: Jakarta, sans-serif;
    background: radial-gradient(900px 500px at 90% -10%, rgba(233,176,47,.35), transparent 60%),
                radial-gradient(800px 600px at -10% 110%, rgba(131,80,214,.55), transparent 60%), #22103d; }
  .brand { display: flex; align-items: center; gap: 28px; }
  .brand svg { width: 120px; height: 120px; }
  .name { font-family: Fraunces, serif; font-size: 76px; font-weight: 600; letter-spacing: -1px; }
  .name span { color: #efc655; }
  h1 { margin-top: 56px; font-family: Fraunces, serif; font-size: 64px; font-weight: 600; line-height: 1.05; max-width: 960px; }
  p { margin-top: 26px; font-size: 32px; color: #dacbf7; }
  .seal { margin-top: 44px; display: inline-flex; align-self: flex-start; align-items: center; gap: 14px; padding: 16px 26px;
    border-radius: 999px; background: rgba(255,255,255,.1); font-size: 28px; font-weight: 700; color: #f5dd8f; }
</style></head><body>
  <div class="brand">${mark}<div class="name">PDF <span>Kingdom</span></div></div>
  <h1>Gobierna tus PDF sin entregarlos a nadie</h1>
  <p>Une, divide, comprime, protege y convierte PDF gratis.</p>
  <div class="seal">🛡 Tus archivos nunca salen de tu dispositivo</div>
</body></html>`

const iconHtml = (padding) => `<!doctype html><html><head><meta charset="utf-8"><style>${styles}
  body { display: grid; place-items: center; background: #22103d; padding: ${padding}%; }
  svg { width: 100%; height: 100%; }
</style></head><body>${mark}</body></html>`

const temp = mkdtempSync(join(tmpdir(), 'pdf-kingdom-imagenes-'))
const browser = await chromium.launch()
try {
  async function render(html, width, height, output) {
    const file = join(temp, `${output}.html`)
    writeFileSync(file, html)
    const page = await browser.newPage({ viewport: { width, height } })
    await page.goto(pathToFileURL(file).href)
    await page.evaluate(() => document.fonts.ready)
    await page.screenshot({ path: join(publicDir, output) })
    await page.close()
    console.log(`  ✓ public/${output} (${width}×${height})`)
  }

  await render(ogHtml, 1200, 630, 'og-image.png')
  await render(iconHtml(14), 180, 180, 'apple-touch-icon.png')
  await render(iconHtml(14), 192, 192, 'icon-192.png')
  // Icono "maskable": más margen para que los móviles puedan recortarlo en círculo.
  await render(iconHtml(22), 512, 512, 'icon-512.png')
} finally {
  await browser.close()
  rmSync(temp, { recursive: true, force: true })
}
