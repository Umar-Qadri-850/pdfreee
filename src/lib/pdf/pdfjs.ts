import * as pdfjsLib from 'pdfjs-dist'
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { PdfError } from './errors'

let configured = false
function ensureWorker() {
  if (configured) return
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc
  configured = true
}

export { pdfjsLib }
export type PdfJsDocument = pdfjsLib.PDFDocumentProxy
export type PdfJsPage = pdfjsLib.PDFPageProxy

/**
 * A PDF.js document plus an explicit close() that tears down the loading task
 * and worker. Callers MUST call `close()` when finished to release memory.
 */
export type PdfDocumentHandle = PdfJsDocument & { close: () => Promise<void> }

export async function openPdfDocument(data: ArrayBuffer): Promise<PdfDocumentHandle> {
  ensureWorker()
  try {
    // Clone so pdf.js can transfer/detach the buffer without affecting callers.
    const copy = data.slice(0)
    const task = pdfjsLib.getDocument({ data: copy })
    const doc = await task.promise
    return Object.assign(doc, { close: () => task.destroy() }) as PdfDocumentHandle
  } catch (error) {
    const name = (error as { name?: string })?.name ?? ''
    if (name === 'PasswordException') {
      throw new PdfError('encrypted', 'This PDF is password-protected and cannot be opened.')
    }
    throw new PdfError('corrupt', 'This PDF could not be rendered. It may be damaged or unsupported.')
  }
}

export interface RenderedPage {
  blob: Blob
  width: number
  height: number
}

export interface RenderOptions {
  /** Pixels per PDF point (scale 1 ≈ 72 DPI). */
  scale?: number
  type?: 'image/jpeg' | 'image/png' | 'image/webp'
  quality?: number
  signal?: AbortSignal
}

export async function renderPageToBlob(page: PdfJsPage, options: RenderOptions = {}): Promise<RenderedPage> {
  const { scale = 2, type = 'image/png', quality = 0.92, signal } = options
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')

  const viewport = page.getViewport({ scale })
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.floor(viewport.width))
  canvas.height = Math.max(1, Math.floor(viewport.height))
  const outWidth = canvas.width
  const outHeight = canvas.height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new PdfError('unsupported', 'This browser could not create a canvas for rendering.')

  // White background so JPG output is never transparent/black.
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  const task = page.render({ canvas, canvasContext: ctx, viewport })
  const onAbort = () => task.cancel()
  signal?.addEventListener('abort', onAbort, { once: true })

  try {
    await task.promise
  } catch (error) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
    throw error
  } finally {
    signal?.removeEventListener('abort', onAbort)
  }

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, type, type === 'image/png' ? undefined : quality),
  )
  canvas.width = 0
  canvas.height = 0
  if (!blob) throw new PdfError('unsupported', 'The rendered image could not be encoded.')
  return { blob, width: outWidth, height: outHeight }
}
