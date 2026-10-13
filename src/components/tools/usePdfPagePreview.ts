import { useEffect, useRef, useState } from 'react'
import { friendlyMessage } from '@/lib/pdf/errors'
import { openPdfDocument, renderPageToBlob } from '@/lib/pdf/pdfjs'
import { RENDER_SCALE, type Transform } from '@/lib/pdf/placement'

export interface SinglePagePreview {
  pageNumber: number
  blobUrl: string
  width: number
  height: number
  /** PDF.js viewport transform for exact coordinate mapping. */
  transform: Transform
}

export type PagePreviewStatus = 'idle' | 'running' | 'done' | 'error'

export interface SinglePagePreviewState {
  preview: SinglePagePreview | null
  status: PagePreviewStatus
  error: string | null
}

/**
 * Render a single PDF page to a preview (used by the interactive crop tool).
 * The object URL is revoked automatically when the page, file or component
 * changes.
 */
export function usePdfPagePreview(file: File | null, pageNumber: number): SinglePagePreviewState {
  const [state, setState] = useState<SinglePagePreviewState>({
    preview: null,
    status: 'idle',
    error: null,
  })
  const urlRef = useRef<string | null>(null)

  useEffect(() => {
    let cancelled = false
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current)
      urlRef.current = null
    }
    setState({ preview: null, status: file ? 'running' : 'idle', error: null })
    if (!file) return

    void (async () => {
      try {
        const bytes = new Uint8Array(await file.arrayBuffer())
        const doc = await openPdfDocument(bytes.buffer.slice(0))
        try {
          const page = await doc.getPage(pageNumber)
          const viewport = page.getViewport({ scale: RENDER_SCALE })
          const rendered = await renderPageToBlob(page, { scale: RENDER_SCALE, type: 'image/png' })
          if (cancelled) return
          const blobUrl = URL.createObjectURL(rendered.blob)
          urlRef.current = blobUrl
          setState({
            preview: {
              pageNumber,
              blobUrl,
              width: rendered.width,
              height: rendered.height,
              transform: viewport.transform as unknown as Transform,
            },
            status: 'done',
            error: null,
          })
        } finally {
          await doc.close()
        }
      } catch (err) {
        if (!cancelled) setState({ preview: null, status: 'error', error: friendlyMessage(err) })
      }
    })()

    return () => {
      cancelled = true
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current)
        urlRef.current = null
      }
    }
  }, [file, pageNumber])

  return state
}