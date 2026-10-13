/** Rango de páginas, contando desde 1 e incluyendo ambos extremos. */
export interface PageRange {
  start: number
  end: number
}

export type RangeIssue =
  | { code: 'empty' }
  | { code: 'syntax'; token: string }
  | { code: 'zero'; token: string }
  | { code: 'reversed'; token: string }
  | { code: 'out-of-bounds'; page: number; total: number }

export interface ParsedRanges {
  ranges: PageRange[]
  issues: RangeIssue[]
}

const SINGLE = /^\d+$/
const SPAN = /^(\d*)-(\d*)$/

/**
 * Interpreta textos como "1-3, 5, 8-10".
 * - Separadores: coma, punto y coma o espacios.
 * - "8-" significa desde la 8 hasta la última; "-3" desde la primera hasta la 3.
 * Devuelve los rangos válidos y una lista de problemas para mostrarlos al usuario.
 */
export function parseRanges(input: string, pageCount: number): ParsedRanges {
  const normalized = input
    .replace(/[–—]/g, '-') // guiones largos que suelen colarse al copiar y pegar
    .replace(/\s*-\s*/g, '-')
    .trim()

  if (!normalized) return { ranges: [], issues: [{ code: 'empty' }] }

  const ranges: PageRange[] = []
  const issues: RangeIssue[] = []

  for (const token of normalized.split(/[,;\s]+/).filter(Boolean)) {
    let start: number
    let end: number

    if (SINGLE.test(token)) {
      start = end = Number(token)
    } else {
      const match = SPAN.exec(token)
      if (!match || (match[1] === '' && match[2] === '')) {
        issues.push({ code: 'syntax', token })
        continue
      }
      start = match[1] === '' ? 1 : Number(match[1])
      end = match[2] === '' ? pageCount : Number(match[2])
    }

    if (start === 0 || end === 0) {
      issues.push({ code: 'zero', token })
      continue
    }
    if (start > end) {
      issues.push({ code: 'reversed', token })
      continue
    }
    if (end > pageCount) {
      issues.push({ code: 'out-of-bounds', page: end, total: pageCount })
      continue
    }
    ranges.push({ start, end })
  }

  return { ranges, issues }
}

/** Convierte un rango (1-based) en índices de página (0-based) para pdf-lib. */
export function rangeToIndices({ start, end }: PageRange): number[] {
  return Array.from({ length: end - start + 1 }, (_, i) => start - 1 + i)
}

/** Una página por grupo: [[0], [1], [2], …] */
export function everyPageGroups(pageCount: number): number[][] {
  return Array.from({ length: pageCount }, (_, i) => [i])
}
