// Caracteres que Windows, macOS o Linux no aceptan en nombres de archivo.
const FORBIDDEN_CHARS = /[<>:"/\\|?*\u0000-\u001f]/g

/** "Contrato final.PDF" → "Contrato final" */
export function baseName(fileName: string): string {
  const withoutPath = fileName.split(/[\\/]/).pop() ?? ''
  const dot = withoutPath.lastIndexOf('.')
  const stem = dot >= 0 ? withoutPath.slice(0, dot) : withoutPath
  const clean = stem.replace(FORBIDDEN_CHARS, '').replace(/\s+/g, ' ').trim()
  return clean || 'documento'
}

/** ("contrato.pdf", "comprimido") → "contrato_comprimido.pdf" */
export function withSuffix(fileName: string, suffix: string, extension = 'pdf'): string {
  return `${baseName(fileName)}_${suffix}.${extension}`
}

/** Rellena con ceros para que los archivos se ordenen bien: (7, 120) → "007". */
export function padNumber(value: number, max: number): string {
  return String(value).padStart(String(max).length, '0')
}

/** Evita nombres repetidos dentro de un .zip añadiendo " (2)", " (3)"… */
export function uniqueNames(names: string[]): string[] {
  const seen = new Map<string, number>()
  return names.map((name) => {
    const key = name.toLowerCase()
    const count = (seen.get(key) ?? 0) + 1
    seen.set(key, count)
    if (count === 1) return name
    const dot = name.lastIndexOf('.')
    return dot > 0 ? `${name.slice(0, dot)} (${count})${name.slice(dot)}` : `${name} (${count})`
  })
}
