import { describe, expect, it } from 'vitest'
import { isPageIncluded, resolveFilterPages } from './filter-pages'

describe('resolveFilterPages', () => {
  it('returns no pages (meaning all) for an empty range', () => {
    expect(resolveFilterPages('', 8)).toEqual({})
    expect(resolveFilterPages('   ', 8)).toEqual({})
    expect(resolveFilterPages('', 8).pages).toBeUndefined()
    expect(resolveFilterPages('', 8).error).toBeUndefined()
  })

  it('parses explicit ranges into 1-based pages', () => {
    expect(resolveFilterPages('1-3, 5', 8).pages).toEqual([1, 2, 3, 5])
    expect(resolveFilterPages('4-2', 8).pages).toEqual([4, 3, 2])
  })

  it('reports an error for out-of-bounds pages', () => {
    const result = resolveFilterPages('9-10', 8)
    expect(result.error).toBeTruthy()
    expect(result.pages).toBeUndefined()
  })

  it('reports an error for garbage input', () => {
    expect(resolveFilterPages('not a range', 8).error).toBeTruthy()
  })

  it('works for larger documents and selects the final page', () => {
    for (const count of [10, 12, 50]) {
      expect(resolveFilterPages('', count).pages).toBeUndefined()
      expect(resolveFilterPages('1-3', count).pages).toEqual([1, 2, 3])
      expect(resolveFilterPages('2,4,6', count).pages).toEqual([2, 4, 6])
      expect(resolveFilterPages('1-3, 5', count).pages).toEqual([1, 2, 3, 5])
      expect(resolveFilterPages(`${count}`, count).pages).toEqual([count])
      expect(resolveFilterPages('1-9999', count).error).toBeTruthy()
    }
    for (const count of [4, 5]) {
      expect(resolveFilterPages(`${count}`, count).pages).toEqual([count])
      expect(resolveFilterPages(`1-${count}`, count).pages).toHaveLength(count)
      expect(resolveFilterPages(`${count + 1}`, count).error).toBeTruthy()
      expect(resolveFilterPages('1-0', count).error).toBeTruthy()
    }
  })

  it('accepts duplicate selections without error', () => {
    expect(resolveFilterPages('1-3, 2', 6).pages).toEqual([1, 2, 3, 2])
  })

  it('filters an empty range into "all pages" for any page count', () => {
    expect(resolveFilterPages('', 1).pages).toBeUndefined()
    expect(resolveFilterPages('', 1000).pages).toBeUndefined()
  })
})

describe('isPageIncluded', () => {
  it('includes only pages inside an explicit selection', () => {
    const result = resolveFilterPages('2-4', 6)
    expect(isPageIncluded(result, 2)).toBe(true)
    expect(isPageIncluded(result, 4)).toBe(true)
    expect(isPageIncluded(result, 5)).toBe(false)
  })

  it('includes every page when no range is given', () => {
    const result = resolveFilterPages('', 6)
    expect(isPageIncluded(result, 1)).toBe(true)
    expect(isPageIncluded(result, 6)).toBe(true)
  })

  it('excludes every page when the range is invalid', () => {
    const result = resolveFilterPages('1-99', 6)
    expect(result.error).toBeTruthy()
    expect(isPageIncluded(result, 1)).toBe(false)
  })

  it('excludes every page when no filter selection exists', () => {
    expect(isPageIncluded(null, 1)).toBe(false)
  })

  it('includes the last page of larger documents and excludes one past the end', () => {
    for (const count of [4, 5, 10, 12]) {
      const result = resolveFilterPages(`${count}`, count)
      expect(isPageIncluded(result, count)).toBe(true)
      const ahead = resolveFilterPages(`${count + 1}`, count)
      expect(ahead.error).toBeTruthy()
      expect(isPageIncluded(ahead, count)).toBe(false)
    }
  })

  it('preview and export semantics stay in sync: exclusion means "keep original"', () => {
    const result = resolveFilterPages('2-4, 9', 10)
    expect(isPageIncluded(result, 9)).toBe(true)
    expect(isPageIncluded(result, 1)).toBe(false)
    expect(isPageIncluded(result, 5)).toBe(false)
  })
})