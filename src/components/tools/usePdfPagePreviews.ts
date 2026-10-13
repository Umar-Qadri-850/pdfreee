import { useEffect, useRef, useState } from 'react'
import { friendlyMessage } from '@/lib/pdf/errors'
import { openPdfDocument, renderPageToBlob } from '@/lib/pdf/pdfjs'
import { RENDER_SCALE, type Transform } from '@/lib/pdf/placement'
import type { PagePreview } from './PageCanvas'

export type PreviewStatus = 'idle' | 'running' | 'done' | 'error'

export interface PagePreviewsState {
  previews: PagePreview[]
  status: PreviewStatus
  error: string | null
}

/**
 * Render every page of a PDF to a PNG preview and capture each page's PDF.js
 * viewport transform so editors can map on-screen positions back to PDF points.
 * Object URLs are revoked automatically when the file changes or unmounts.
 */
export function usePdfPagePreviews(file: File | null): PagePreviewsState {
  const [previews, setPreviews] = useState<PagePreview[]>([])
  const [status, setStatus] = useState<PreviewStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const urlsRef = useRef<string[]>([])

  useEffect(() => {
    return () => {
      urlsRef.current.forEach((url) => URL.revokeObjectURL(url))
      urlsRef.current = []
    }
  }, [])

  useEffect(() => {
    urlsRef.current.forEach((url) => URL.revokeObjectURL(url))
    urlsRef.current = []
    setPreviews([])
    setError(null)
    if (!file) {
      setStatus('idle')
      return
    }

    let cancelled = false
    const controller = new AbortController()
    setStatus('running')

    void (async () => {
      try {
        const bytes = new Uint8Array(await file.arrayBuffer())
        const doc = await openPdfDocument(bytes.buffer.slice(0))
        const list: PagePreview[] = []
        try {
          for (let i = 1; i <= doc.numPages; i++) {
            if (cancelled || controller.signal.aborted) break
            const page = await doc.getPage(i)
            const viewport = page.getViewport({ scale: RENDER_SCALE })
            const rendered = await renderPageToBlob(page, {
              scale: RENDER_SCALE,
              type: 'image/png',
              signal: controller.signal,
            })
            if (cancelled || controller.signal.aborted) break
            const blobUrl = URL.createObjectURL(rendered.blob)
            urlsRef.current.push(blobUrl)
            list.push({
              pageNumber: i,
              blobUrl,
              width: rendered.width,
              height: rendered.height,
              transform: viewport.transform as unknown as Transform,
            })
          }
        } finally {
          await doc.close()
        }
        if (!cancelled && !controller.signal.aborted) {
          setPreviews(list)
          setStatus('done')
        }
      } catch (err) {
        if (!cancelled && !controller.signal.aborted) {
          setError(friendlyMessage(err))
          setStatus('error')
        }
      }
    })()

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [file])

  return { previews, status, error }
}
