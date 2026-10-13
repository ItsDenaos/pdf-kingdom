import { describe, expect, it } from 'vitest'
import { detectImageType, displaySize, orientationMatrix, readImageInfo } from '../../app/lib/images'
import { computeLayout, DEFAULT_IMAGE_OPTIONS } from '../../app/lib/page-layout'
import { fixture } from './helpers'

describe('detectImageType / readImageInfo', () => {
  it('reconoce JPG y PNG por su contenido', () => {
    expect(detectImageType(fixture('foto-horizontal.jpg'))).toBe('jpeg')
    expect(detectImageType(fixture('logo-transparente.png'))).toBe('png')
    expect(detectImageType(fixture('no-es-imagen.png'))).toBeNull()
    expect(detectImageType(fixture('tres-paginas.pdf'))).toBeNull()
  })

  it('lee el tamaño de JPG y PNG', () => {
    expect(readImageInfo(fixture('foto-horizontal.jpg'))).toEqual({ type: 'jpeg', width: 640, height: 480, orientation: 1 })
    expect(readImageInfo(fixture('foto-vertical.jpg'))).toMatchObject({ width: 480, height: 640 })
    expect(readImageInfo(fixture('logo-transparente.png'))).toEqual({ type: 'png', width: 300, height: 200, orientation: 1 })
  })

  it('lee la orientación EXIF de las fotos del móvil', () => {
    const info = readImageInfo(fixture('foto-girada-exif.jpg'))!
    expect(info).toMatchObject({ width: 640, height: 480, orientation: 6 })
    expect(displaySize(info)).toEqual({ width: 480, height: 640 })
  })

  it('devuelve null si la imagen está dañada', () => {
    expect(readImageInfo(fixture('imagen-danada.jpg'))).toBeNull()
    expect(readImageInfo(new Uint8Array([0x89, 0x50, 0x4e, 0x47]))).toBeNull()
  })
})

describe('orientationMatrix', () => {
  const apply = (o: number, u: number, v: number) => {
    const [a, b, c, d, e, f] = orientationMatrix(o)
    return [a * u + c * v + e, b * u + d * v + f]
  }

  it('cada orientación transforma el cuadrado en sí mismo (sin deformar ni salirse)', () => {
    for (let o = 1; o <= 8; o++) {
      const corners = [
        [0, 0],
        [1, 0],
        [0, 1],
        [1, 1],
      ].map(([u, v]) => apply(o, u!, v!).join(','))
      expect(new Set(corners)).toEqual(new Set(['0,0', '1,0', '0,1', '1,1']))
    }
  })

  it('orientación 6: la esquina superior izquierda guardada pasa a la superior derecha', () => {
    // En PDF, (0, 1) es arriba a la izquierda y (1, 1) arriba a la derecha.
    expect(apply(6, 0, 1)).toEqual([1, 1])
    expect(apply(8, 0, 1)).toEqual([0, 0])
    expect(apply(3, 0, 1)).toEqual([1, 0])
  })
})

describe('computeLayout', () => {
  it('A4 automático: horizontal para fotos apaisadas, vertical para retratos', () => {
    const wide = computeLayout(640, 480, DEFAULT_IMAGE_OPTIONS)
    expect(wide.pageWidth).toBeGreaterThan(wide.pageHeight)
    const tall = computeLayout(480, 640, DEFAULT_IMAGE_OPTIONS)
    expect(tall.pageHeight).toBeGreaterThan(tall.pageWidth)
  })

  it('respeta la orientación elegida y los márgenes, y centra la imagen', () => {
    const layout = computeLayout(640, 480, { pageSize: 'a4', orientation: 'portrait', margin: 'large' })
    expect(layout.pageWidth).toBeCloseTo(595.28)
    expect(layout.width).toBeCloseTo(595.28 - 100) // 50 pt por lado
    expect(layout.height / layout.width).toBeCloseTo(480 / 640)
    expect(layout.y).toBeCloseTo((layout.pageHeight - layout.height) / 2)
  })

  it('"Igual que la imagen": la página tiene la forma de la foto', () => {
    const layout = computeLayout(300, 200, { pageSize: 'fit', orientation: 'auto', margin: 'none' })
    expect(layout.pageWidth / layout.pageHeight).toBeCloseTo(1.5)
    expect(layout.x).toBe(0)
  })

  it('Carta usa 612 × 792 puntos', () => {
    const layout = computeLayout(100, 100, { pageSize: 'letter', orientation: 'portrait', margin: 'none' })
    expect([layout.pageWidth, layout.pageHeight]).toEqual([612, 792])
  })
})
