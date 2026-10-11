/**
 * Pure page-range parsing helpers. No DOM, no PDF libraries — unit tested in
 * isolation because every page-manipulation tool depends on correct parsing.
 *
 * Accepted syntax (comma and/or whitespace separated):
 *   3            single page
 *   1-5          inclusive ascending range
 *   5-1          inclusive descending range (useful for extract/reorder)
 *   5-           page 5 to the last page
 *   -3           first page to page 3
 */

export interface RangeParseResult {
  /** 1-based page numbers, in the order specified by the user. */
  pages: number[]
  /** Human-readable error, present only when the input could not be parsed. */
  error?: string
}

export function parsePageRanges(input: string, pageCount: number): RangeParseResult {
  const trimmed = (input ?? '').trim()
  if (!trimmed) return { pages: [], error: 'Enter at least one page or range.' }
  if (!Number.isInteger(pageCount) || pageCount < 1) {
    return { pages: [], error: 'This document has no pages to select.' }
  }

  const tokens = trimmed.split(/[\s,]+/).filter(Boolean)
  const pages: number[] = []

  for (const token of tokens) {
    if (/^\d+$/.test(token)) {
      const n = Number(token)
      if (n < 1 || n > pageCount) return { pages: [], error: outOfBounds(token, pageCount) }
      pages.push(n)
      continue
    }

    const openEnd = token.match(/^(\d+)-$/)
    if (openEnd) {
      const start = Number(openEnd[1])
      if (start < 1 || start > pageCount) return { pages: [], error: outOfBounds(token, pageCount) }
      for (let p = start; p <= pageCount; p++) pages.push(p)
      continue
    }

    const openStart = token.match(/^-(\d+)$/)
    if (openStart) {
      const end = Number(openStart[1])
      if (end < 1 || end > pageCount) return { pages: [], error: outOfBounds(token, pageCount) }
      for (let p = 1; p <= end; p++) pages.push(p)
      continue
    }

    const closed = token.match(/^(\d+)-(\d+)$/)
    if (closed) {
      const start = Number(closed[1])
      const end = Number(closed[2])
      if (start < 1 || start > pageCount || end < 1 || end > pageCount) {
        return { pages: [], error: outOfBounds(token, pageCount) }
      }
      const step = start <= end ? 1 : -1
      for (let p = start; step > 0 ? p <= end : p >= end; p += step) pages.push(p)
      continue
    }

    return { pages: [], error: `“${token}” is not a valid page or range. Use e.g. 1-3, 5, 8-10.` }
  }

  if (pages.length === 0) return { pages: [], error: 'Enter at least one page or range.' }
  return { pages }
}

function outOfBounds(token: string, pageCount: number): string {
  return `“${token}” is outside this document’s 1–${pageCount} page range.`
}

/** Convert 1-based page numbers to 0-based indices. */
export function toIndices(pages: number[]): number[] {
  return pages.map((p) => p - 1)
}

/** Sorted, de-duplicated list of 1-based pages (ascending). */
export function uniqueSorted(pages: number[]): number[] {
  return [...new Set(pages)].sort((a, b) => a - b)
}

/** Describe a selection for compact UI display, e.g. "1–3, 5, 8–10". */
export function describePages(pages: number[]): string {
  const sorted = uniqueSorted(pages)
  if (sorted.length === 0) return 'none'
  const groups: string[] = []
  let start = sorted[0]
  let prev = sorted[0]
  for (let i = 1; i <= sorted.length; i++) {
    const current = sorted[i]
    if (current === prev + 1) {
      prev = current
      continue
    }
    groups.push(start === prev ? `${start}` : `${start}–${prev}`)
    start = current
    prev = current
  }
  return groups.join(', ')
}

/** Page numbers in `all` (1-based) that are not present in `selected`. */
export function complement(all: number[], selected: number[]): number[] {
  const set = new Set(uniqueSorted(selected))
  return all.filter((p) => !set.has(p))
}
