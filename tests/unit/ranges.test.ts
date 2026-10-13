import { describe, expect, it } from 'vitest'
import { everyPageGroups, parseRanges, rangeToIndices } from '../../app/lib/ranges'

describe('parseRanges', () => {
  it('entiende el ejemplo típico "1-3, 5, 8-10"', () => {
    expect(parseRanges('1-3, 5, 8-10', 10)).toEqual({
      ranges: [
        { start: 1, end: 3 },
        { start: 5, end: 5 },
        { start: 8, end: 10 },
      ],
      issues: [],
    })
  })

  it('acepta espacios, punto y coma y guiones largos', () => {
    const { ranges, issues } = parseRanges(' 1 - 2 ; 4–5  7 ', 8)
    expect(issues).toEqual([])
    expect(ranges).toEqual([
      { start: 1, end: 2 },
      { start: 4, end: 5 },
      { start: 7, end: 7 },
    ])
  })

  it('admite rangos abiertos: "8-" hasta el final y "-3" desde el principio', () => {
    expect(parseRanges('8-', 10).ranges).toEqual([{ start: 8, end: 10 }])
    expect(parseRanges('-3', 10).ranges).toEqual([{ start: 1, end: 3 }])
  })

  it('avisa si está vacío', () => {
    expect(parseRanges('   ', 5).issues).toEqual([{ code: 'empty' }])
  })

  it('detecta texto que no es un rango', () => {
    expect(parseRanges('1-3, abc', 5).issues).toEqual([{ code: 'syntax', token: 'abc' }])
    expect(parseRanges('-', 5).issues).toEqual([{ code: 'syntax', token: '-' }])
    expect(parseRanges('1-2-3', 5).issues).toEqual([{ code: 'syntax', token: '1-2-3' }])
  })

  it('detecta páginas que no existen, rangos al revés y la página 0', () => {
    expect(parseRanges('4-12', 10).issues).toEqual([{ code: 'out-of-bounds', page: 12, total: 10 }])
    expect(parseRanges('5-3', 10).issues).toEqual([{ code: 'reversed', token: '5-3' }])
    expect(parseRanges('0', 10).issues).toEqual([{ code: 'zero', token: '0' }])
  })

  it('convierte rangos a índices desde 0', () => {
    expect(rangeToIndices({ start: 2, end: 4 })).toEqual([1, 2, 3])
    expect(everyPageGroups(3)).toEqual([[0], [1], [2]])
  })
})
