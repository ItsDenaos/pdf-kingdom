import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { test as base, expect, type Download, type Page } from '@playwright/test'

export const FIXTURES = join(import.meta.dirname, '..', 'fixtures')
export const fixturePath = (name: string) => join(FIXTURES, name)

/**
 * Prueba con dos guardianes automáticos:
 *  - privacidad: falla si la página intenta conectarse a cualquier sitio que no sea el propio
 *    (los archivos no deben salir del equipo);
 *  - seguridad: falla si la política de seguridad (CSP) bloquea algo, señal de que la web
 *    publicada no funcionaría igual que en las pruebas.
 */
export const test = base.extend<{ guards: void }>({
  guards: [
    async ({ page, baseURL }, use) => {
      const external: string[] = []
      const cspViolations: string[] = []
      const origin = new URL(baseURL!).origin

      page.on('request', (request) => {
        const url = request.url()
        if (url.startsWith('data:') || url.startsWith('blob:')) return
        if (new URL(url).origin !== origin) external.push(url)
      })
      page.on('console', (message) => {
        const text = message.text()
        if (/Content Security Policy|Refused to (load|execute|connect|compile|create)/i.test(text)) {
          cspViolations.push(text)
        }
      })
      await page.addInitScript(() => {
        document.addEventListener('securitypolicyviolation', (event) => {
          console.error(`Content Security Policy: ${event.violatedDirective} bloqueó ${event.blockedURI}`)
        })
      })

      await use()

      expect(external, 'La página no debe conectarse a otros sitios').toEqual([])
      expect(cspViolations, 'La CSP no debe bloquear nada').toEqual([])
    },
    { auto: true },
  ],
})

export { expect }

/** Sube archivos de tests/fixtures a la herramienta abierta. */
export async function uploadFixtures(page: Page, names: string[]) {
  // Espera a que la página esté lista (data-ready) para que el archivo no se pierda.
  const input = page
    .locator('[data-testid="file-input"][data-ready="true"], [data-testid="add-files-input"]')
    .first()
  await input.setInputFiles(names.map(fixturePath))
}

/** Pulsa "Descargar" y devuelve el nombre y los bytes del archivo. */
export async function downloadResult(page: Page): Promise<{ name: string; bytes: Uint8Array }> {
  const [download]: [Download, void] = await Promise.all([
    page.waitForEvent('download'),
    page.getByTestId('download').click(),
  ])
  const path = await download.path()
  return { name: download.suggestedFilename(), bytes: new Uint8Array(await readFile(path)) }
}

/** Todas las páginas del sitio (para pruebas de SEO y accesibilidad). */
export const ALL_PAGES = [
  '/',
  '/unir-pdf',
  '/dividir-pdf',
  '/rotar-pdf',
  '/comprimir-pdf',
  '/desbloquear-pdf',
  '/proteger-pdf',
  '/jpg-a-pdf',
  '/pdf-a-jpg',
  '/privacidad',
] as const
