import { describe, expect, it } from 'vitest'
import { complement, describePages, parsePageRanges, toIndices, uniqueSorted } from './range'

describe('parsePageRanges', () => {
  it('parses single pages and comma lists', () => {
    expect(parsePageRanges('1, 3, 5', 10)).toEqual({ pages: [1, 3, 5] })
  })

  it('parses ascending ranges', () => {
    expect(parsePageRanges('2-4', 10).pages).toEqual([2, 3, 4])
  })

  it('parses descending ranges in the order given', () => {
    expect(parsePageRanges('5-1', 10).pages).toEqual([5, 4, 3, 2, 1])
  })

  it('parses open-ended range from a start page', () => {
    expect(parsePageRanges('8-', 10).pages).toEqual([8, 9, 10])
  })

  it('parses open-ended range to an end page', () => {
    expect(parsePageRanges('-3', 10).pages).toEqual([1, 2, 3])
  })

  it('accepts whitespace as a separator', () => {
    expect(parsePageRanges('1 2-3 7', 10).pages).toEqual([1, 2, 3, 7])
  })

  it('rejects pages outside the document', () => {
    const result = parsePageRanges('11', 10)
    expect(result.pages).toEqual([])
    expect(result.error).toMatch(/outside/i)
  })

  it('rejects malformed tokens', () => {
    const result = parsePageRanges('abc', 10)
    expect(result.pages).toEqual([])
    expect(result.error).toMatch(/not a valid/i)
  })

  it('rejects empty input', () => {
    expect(parsePageRanges('   ', 10).error).toMatch(/at least one/i)
  })

  it('reports a document with no pages', () => {
    expect(parsePageRanges('1', 0).error).toMatch(/no pages/i)
  })
})

describe('range helpers', () => {
  it('converts 1-based pages to 0-based indices', () => {
    expect(toIndices([1, 3, 5])).toEqual([0, 2, 4])
  })

  it('sorts and de-duplicates', () => {
    expect(uniqueSorted([3, 1, 3, 2])).toEqual([1, 2, 3])
  })

  it('describes a selection compactly', () => {
    expect(describePages([1, 2, 3, 5, 8, 10, 9])).toBe('1–3, 5, 8–10')
  })

  it('describes an empty selection', () => {
    expect(describePages([])).toBe('none')
  })

  it('computes the complement', () => {
    expect(complement([1, 2, 3, 4], [2, 4])).toEqual([1, 3])
  })
})
