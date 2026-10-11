import { useEffect, useRef, useState } from 'react'
import type { PdfDocumentHandle } from './pdfjs'

export interface Thumb {
  page: number
  url: string
  width: number
  height: number
}

export interface ThumbnailsState {
  thumbs: Thumb[]
  numPages: number
  loading: boolean
  progress: number
  error: string | null
}

/**
 * Render one small thumbnail per page for a PDF. Loads PDF.js lazily and
 * releases the document plus every object URL when the file changes/unmounts.
 */
export function usePdfThumbnails(file: File | null, targetWidth = 170): ThumbnailsState {
  const [state, setState] = useState<ThumbnailsState>({
    thumbs: [],
    numPages: 0,
    loading: false,
    progress: 0,
    error: null,
  })
  const urlsRef = useRef<string[]>([])

  useEffect(() => {
    let cancelled = false
    const created: string[] = []
    urlsRef.current = created

    const cleanup = () => {
      created.forEach((u) => URL.revokeObjectURL(u))
    }

    if (!file) {
      setState({ thumbs: [], numPages: 0, loading: false, progress: 0, error: null })
      return cleanup
    }

    let doc: PdfDocumentHandle | null = null
    setState({ thumbs: [], numPages: 0, loading: true, progress: 0, error: null })

    ;(async () => {
      try {
        const { openPdfDocument, renderPageToBlob } = await import('./pdfjs')
        const bytes = await file.arrayBuffer()
        doc = await openPdfDocument(bytes)
        if (cancelled) {
          await doc.close()
          return
        }
        const total = doc.numPages
        setState((s) => ({ ...s, numPages: total }))

        const collected: Thumb[] = []
        for (let p = 1; p <= total; p++) {
          if (cancelled) return
          const page = await doc.getPage(p)
          const baseWidth = page.getViewport({ scale: 1 }).width
          const scale = Math.min(Math.max(targetWidth / baseWidth, 0.08), 2)
          const rendered = await renderPageToBlob(page, { scale, type: 'image/jpeg', quality: 0.7 })
          if (cancelled) return
          const url = URL.createObjectURL(rendered.blob)
          created.push(url)
          collected.push({ page: p, url, width: rendered.width, height: rendered.height })
          setState((s) => ({ ...s, thumbs: [...collected], progress: p / total }))
        }
        if (!cancelled) setState((s) => ({ ...s, loading: false, progress: 1 }))
      } catch (error) {
        if (!cancelled) {
          setState((s) => ({
            ...s,
            loading: false,
            error: error instanceof Error ? error.message : 'Could not render this PDF.',
          }))
        }
      }
    })()

    return () => {
      cancelled = true
      cleanup()
      doc?.close()
    }
  }, [file, targetWidth])

  return state
}
