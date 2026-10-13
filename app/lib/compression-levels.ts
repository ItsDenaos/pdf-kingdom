/**
 * Niveles de compresión (sin dependencias: la página puede usarlos sin cargar pdf-lib ni qpdf).
 * - low: sin pérdida (solo se reorganiza y recomprime la estructura).
 * - recommended: además, las fotos se reducen y se guardan en JPEG. El texto no cambia.
 * - extreme: cada página se convierte en imagen. El texto deja de ser seleccionable.
 */
export type CompressionLevel = 'low' | 'recommended' | 'extreme'

/** Compresión extrema: resolución (ppp) y calidad JPEG de la imagen de cada página. */
export const EXTREME_DPI = 110
export const EXTREME_QUALITY = 0.5
