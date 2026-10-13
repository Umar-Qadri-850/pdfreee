import { parsePageRanges } from './range'

/**
 * Shared page-selection logic for the Edit PDF filter feature.
 *
 * The live preview and the final export must apply the filter to exactly the
 * same pages, so both resolve the "Pages to filter" field through these
 * helpers rather than parsing it separately.
 */

export interface FilterPagesResult {
  /** 1-based pages to filter; undefined means every page. */
  pages?: number[]
  error?: string
}

/** Resolve the "Pages to filter" field into pages (or an error). */
export function resolveFilterPages(
  rangeText: string,
  pageCount: number,
): FilterPagesResult {
  const trimmed = (rangeText ?? '').trim()
  if (!trimmed) return {}
  const parsed = parsePageRanges(trimmed, pageCount)
  if (parsed.error) return { error: parsed.error }
  return { pages: parsed.pages }
}

/**
 * Whether a 1-based page is included in the resolution. Returns false when no
 * filter is active (`null`), the range is invalid, or the page is outside the
 * selection.
 */
export function isPageIncluded(result: FilterPagesResult | null, page: number): boolean {
  if (!result || result.error) return false
  return result.pages === undefined || result.pages.includes(page)
}