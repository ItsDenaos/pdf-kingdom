import { describe, expect, it } from 'vitest'
import { baseName, padNumber, uniqueNames, withSuffix } from '../../app/lib/filenames'
import { hasPdfSignature, isLargeFile, LARGE_FILE_BYTES } from '../../app/lib/files'
import { formatBytes } from '../../app/lib/format'

describe('nombres de archivo', () => {
  it('añade un sufijo descriptivo', () => {
    expect(withSuffix('contrato.pdf', 'comprimido')).toBe('contrato_comprimido.pdf')
    expect(withSuffix('Informe Final.PDF', 'unido')).toBe('Informe Final_unido.pdf')
    expect(withSuffix('fotos.pdf', 'dividido', 'zip')).toBe('fotos_dividido.zip')
  })

  it('limpia caracteres no permitidos y rutas', () => {
    expect(baseName('C:\\docs\\a<b>:c?.pdf')).toBe('abc')
    expect(baseName('.pdf')).toBe('documento')
    expect(baseName('sin-extension')).toBe('sin-extension')
  })

  it('rellena con ceros según el total', () => {
    expect(padNumber(7, 9)).toBe('7')
    expect(padNumber(7, 120)).toBe('007')
  })

  it('evita nombres repetidos', () => {
    expect(uniqueNames(['a.pdf', 'b.pdf', 'A.pdf', 'a.pdf'])).toEqual([
      'a.pdf',
      'b.pdf',
      'A (2).pdf',
      'a (3).pdf',
    ])
  })
})

describe('detección de archivos', () => {
  const enc = new TextEncoder()

  it('reconoce la cabecera %PDF-, aunque tenga datos delante', () => {
    expect(hasPdfSignature(enc.encode('%PDF-1.7\n...'))).toBe(true)
    expect(hasPdfSignature(enc.encode('basura\n%PDF-1.4'))).toBe(true)
    expect(hasPdfSignature(enc.encode('Hola, no soy un PDF'))).toBe(false)
    expect(hasPdfSignature(new Uint8Array())).toBe(false)
  })

  it('marca como grande desde 100 MB', () => {
    expect(isLargeFile(LARGE_FILE_BYTES - 1)).toBe(false)
    expect(isLargeFile(LARGE_FILE_BYTES)).toBe(true)
  })
})

describe('formatBytes', () => {
  it('usa el formato español', () => {
    expect(formatBytes(512)).toBe('512 B')
    expect(formatBytes(2516582)).toBe('2,4 MB')
    expect(formatBytes(150 * 1024)).toBe('150 KB')
  })
})
