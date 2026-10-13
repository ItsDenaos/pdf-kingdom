import { PDFDocument, PDFName, PDFNumber, type PDFDict } from '@cantoo/pdf-lib'
import { downloadResult, expect, test, uploadFixtures } from './utils'

/** Comprueba si un PDF está cifrado y con qué versión (V=5, R=6 es AES-256). */
async function encryption(bytes: Uint8Array) {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true })
  if (!doc.isEncrypted) return null
  const dict = doc.context.lookup(doc.context.trailerInfo.Encrypt) as PDFDict
  const num = (key: string) => (dict.get(PDFName.of(key)) as PDFNumber).asNumber()
  return { V: num('V'), R: num('R') }
}

test.describe('Desbloquear PDF', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/desbloquear-pdf')
  })

  test('muestra siempre el aviso de uso responsable', async ({ page }) => {
    await expect(page.getByTestId('legal-notice')).toContainText('Usa esta herramienta solo con archivos propios o con permiso')
  })

  test('pide la contraseña, avisa si es incorrecta y la quita si es correcta', async ({ page }) => {
    await uploadFixtures(page, ['con-contrasena.pdf'])
    await expect(page.getByTestId('unlock-state')).toContainText('pide contraseña para abrirse')
    const run = page.getByTestId('run-tool')
    await expect(run).toBeDisabled()

    const input = page.getByTestId('password-input')
    await input.fill('equivocada')
    await run.click()
    await expect(page.getByText('La contraseña no es correcta')).toBeVisible()
    await expect(input).toBeFocused()

    await input.fill('reino123')
    await run.click()
    const { name, bytes } = await downloadResult(page)
    expect(name).toBe('con-contrasena_desbloqueado.pdf')
    expect(await encryption(bytes)).toBeNull()
    expect((await PDFDocument.load(bytes)).getPageCount()).toBe(2)
  })

  test('quita las restricciones sin contraseña', async ({ page }) => {
    await uploadFixtures(page, ['con-restricciones.pdf'])
    await expect(page.getByTestId('unlock-state')).toContainText('no se puede imprimir')
    await expect(page.getByTestId('password-input')).toHaveCount(0)
    await page.getByTestId('run-tool').click()
    const { name, bytes } = await downloadResult(page)
    expect(name).toBe('con-restricciones_desbloqueado.pdf')
    expect(await encryption(bytes)).toBeNull()
  })

  test('avisa si el PDF no está protegido', async ({ page }) => {
    await uploadFixtures(page, ['tres-paginas.pdf'])
    await expect(page.getByTestId('unlock-state')).toContainText('no tiene contraseña ni restricciones')
    await expect(page.getByTestId('run-tool')).toBeDisabled()
  })
})

test.describe('Proteger PDF', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/proteger-pdf')
    await uploadFixtures(page, ['tres-paginas.pdf'])
    await expect(page.getByTestId('password-input')).toBeVisible()
  })

  test('exige escribir la contraseña dos veces igual', async ({ page }) => {
    await page.getByTestId('run-tool').click()
    await expect(page.getByText('Escribe una contraseña.')).toBeVisible()

    await page.getByTestId('password-input').fill('Corona#2026')
    await page.getByTestId('confirm-input').fill('Corona#2025')
    await expect(page.getByText('Las contraseñas no coinciden.')).toBeVisible()
    await page.getByTestId('run-tool').click()
    await expect(page.getByTestId('confirm-input')).toBeFocused()
  })

  test('indica la seguridad de la contraseña', async ({ page }) => {
    await page.getByTestId('password-input').fill('1234')
    await expect(page.getByTestId('password-strength')).toContainText('baja')
    await page.getByTestId('password-input').fill('El-Reino#De_Los-PDF-2026')
    await expect(page.getByTestId('password-strength')).toContainText('muy alta')
  })

  test('cifra el PDF con AES-256', async ({ page }) => {
    await page.getByTestId('password-input').fill('Corona#2026')
    await page.getByTestId('confirm-input').fill('Corona#2026')
    await page.getByRole('button', { name: 'Mostrar contraseña' }).first().click()
    await expect(page.getByTestId('password-input')).toHaveAttribute('type', 'text')

    await page.getByTestId('run-tool').click()
    const { name, bytes } = await downloadResult(page)
    expect(name).toBe('tres-paginas_protegido.pdf')
    expect(await encryption(bytes)).toEqual({ V: 5, R: 6 })
    const opened = await PDFDocument.load(bytes, { password: 'Corona#2026' })
    expect(opened.getPageCount()).toBe(3)
  })

  test('no deja proteger un PDF que ya lo está', async ({ page }) => {
    await uploadFixtures(page, ['con-restricciones.pdf'])
    await expect(page.getByTestId('file-error')).toContainText('restricciones')
    await expect(page.getByTestId('password-input')).toHaveCount(0)
  })
})
