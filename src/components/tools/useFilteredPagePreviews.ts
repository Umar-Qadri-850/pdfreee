import { useEffect, useRef, useState } from 'react'
import type { PagePreview } from './PageCanvas'
import { applyFilterToContext, type FilterId } from '@/lib/pdf/filters'
import { runBatched } from '@/lib/pdf/run-batched'

export interface FilteredPagePreviewsState {
  /** pageNumber -> filtered preview URL (included pages only). */
  urls: ReadonlyMap<number, string>
  /** True while filtered previews are being produced. */
  rendering: boolean
}

/** How many pages are filtered at once. Bounded so large documents do not
 * decode N full-resolution images simultaneously. */
const PREVIEW_CONCURRENCY = 2

async function filterImageToUrl(
  url: string,
  filter: FilterId,
  width: number,
  height: number,
): Promise<string> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const element = new Image()
    element.decoding = 'async'
    element.onload = () => resolve(element)
    element.onerror = () => reject(new Error('The preview image could not be loaded.'))
    element.src = url
  })

  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(width))
  canvas.height = Math.max(1, Math.round(height))
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    canvas.width = 0
    canvas.height = 0
    throw new Error('This browser cannot filter the preview.')
  }
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
  // Same engine and entry point the export path uses: filterPixels under the hood.
  applyFilterToContext(ctx, canvas.width, canvas.height, filter)
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
  canvas.width = 0
  canvas.height = 0
  if (!blob) throw new Error('The filtered preview could not be encoded.')
  return URL.createObjectURL(blob)
}

/**
 * Produce filtered preview images for the pages that are included in the
 * filter selection. Filtering always starts from the *original* PDF.js preview
 * blob, never from an already-filtered image, so switching filters cannot
 * degrade the preview. Pages are processed with bounded concurrency; when the
 * selection changes a new generation starts, stale in-flight results are
 * discarded and their object URLs revoked, and `rendering` settles once the
 * current batch finishes so the UI can never get stuck on a spinner.
 */
export function useFilteredPagePreviews(
  previews: PagePreview[],
  filter: FilterId,
  included: (page: number) => boolean,
): FilteredPagePreviewsState {
  const [urls, setUrls] = useState<ReadonlyMap<number, string>>(new Map())
  const [rendering, setRendering] = useState(false)
  const createdRef = useRef<Map<number, string>>(new Map())
  const generationRef = useRef(0)

  useEffect(
    () => () => {
      generationRef.current += 1
      createdRef.current.forEach((url) => URL.revokeObjectURL(url))
      createdRef.current = new Map()
    },
    [],
  )

  useEffect(() => {
    const generation = ++generationRef.current
    createdRef.current.forEach((url) => URL.revokeObjectURL(url))
    createdRef.current = new Map()
    setUrls(new Map())
    setRendering(false)

    if (filter === 'none' || previews.length === 0) return
    const targets = previews.filter((page) => included(page.pageNumber))
    if (targets.length === 0) return

    setRendering(true)
    void runBatched(
      targets.map((target) => () =>
        filterImageToUrl(target.blobUrl, filter, target.width, target.height),
      ),
      {
        concurrency: PREVIEW_CONCURRENCY,
        shouldDiscard: () => generation !== generationRef.current,
        onResult: (url, index) => {
          const target = targets[index]
          createdRef.current = new Map(createdRef.current).set(target.pageNumber, url)
          setUrls(createdRef.current)
        },
        onDiscard: (url) => URL.revokeObjectURL(url),
      },
    ).then(() => {
      if (generation === generationRef.current) setRendering(false)
    })
  }, [previews, filter, included])

  return { urls, rendering }
}