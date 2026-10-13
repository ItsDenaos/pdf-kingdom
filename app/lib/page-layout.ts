/** Cálculos de "JPG a PDF": tamaño de página y posición de cada imagen (sin pdf-lib). */

export type PageSizeOption = 'a4' | 'letter' | 'fit'
export type OrientationOption = 'auto' | 'portrait' | 'landscape'
export type MarginOption = 'none' | 'small' | 'large'

export interface ImagesToPdfOptions {
  pageSize: PageSizeOption
  orientation: OrientationOption
  margin: MarginOption
}

export const DEFAULT_IMAGE_OPTIONS: ImagesToPdfOptions = {
  pageSize: 'a4',
  orientation: 'auto',
  margin: 'small',
}

// Medidas en puntos PDF (1 pt = 1/72 de pulgada).
const PAGE_SIZES = { a4: [595.28, 841.89], letter: [612, 792] } as const
export const MARGINS: Record<MarginOption, number> = { none: 0, small: 20, large: 50 } // ≈ 0, 7 y 18 mm
/** En "Igual que la imagen", el lado largo de la imagen mide lo mismo que el alto de un A4. */
const FIT_LONG_SIDE = 841.89

export interface PageLayout {
  pageWidth: number
  pageHeight: number
  /** Rectángulo donde va la imagen (origen abajo a la izquierda, como en PDF). */
  x: number
  y: number
  width: number
  height: number
}

/** Calcula el tamaño de la página y dónde colocar la imagen (centrada y sin deformar). */
export function computeLayout(imageWidth: number, imageHeight: number, options: ImagesToPdfOptions): PageLayout {
  const margin = MARGINS[options.margin]

  if (options.pageSize === 'fit') {
    const scale = FIT_LONG_SIDE / Math.max(imageWidth, imageHeight)
    const width = imageWidth * scale
    const height = imageHeight * scale
    return { pageWidth: width + margin * 2, pageHeight: height + margin * 2, x: margin, y: margin, width, height }
  }

  const [short, long] = PAGE_SIZES[options.pageSize]
  const landscape =
    options.orientation === 'landscape' || (options.orientation === 'auto' && imageWidth > imageHeight)
  const pageWidth = landscape ? long : short
  const pageHeight = landscape ? short : long
  const scale = Math.min((pageWidth - margin * 2) / imageWidth, (pageHeight - margin * 2) / imageHeight)
  const width = imageWidth * scale
  const height = imageHeight * scale
  return {
    pageWidth,
    pageHeight,
    x: (pageWidth - width) / 2,
    y: (pageHeight - height) / 2,
    width,
    height,
  }
}
