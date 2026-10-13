const UNITS = ['B', 'KB', 'MB', 'GB'] as const

/** 2516582 → "2,4 MB" (con el formato numérico del idioma indicado). */
export function formatBytes(bytes: number, locale = 'es-ES'): string {
  let value = bytes
  let unit = 0
  while (value >= 1024 && unit < UNITS.length - 1) {
    value /= 1024
    unit++
  }
  const digits = unit === 0 || value >= 100 ? 0 : 1
  const number = new Intl.NumberFormat(locale, { maximumFractionDigits: digits }).format(value)
  return `${number} ${UNITS[unit]}`
}
