import { defineConfig, devices } from '@playwright/test'

const PORT = 4174

/**
 * Pruebas en un navegador real contra el sitio ya generado (.output/public).
 * `npm run test:e2e` genera el sitio y después ejecuta estas pruebas.
 */
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  // Con muchas pruebas en paralelo, leer varios PDF puede tardar más de los 5 s por defecto.
  expect: { timeout: 10_000 },
  fullyParallel: true,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    acceptDownloads: true,
    locale: 'es-ES',
  },
  webServer: {
    command: 'node scripts/servidor-estatico.mjs',
    env: { PORT: String(PORT) },
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    { name: 'escritorio', use: { ...devices['Desktop Chrome'] } },
    { name: 'movil', use: { ...devices['Pixel 7'] } },
  ],
})
