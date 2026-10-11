import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react'
import { ToolShell } from '@/components/tools/ToolShell'
import { FileDropzone } from '@/components/tools/FileDropzone'
import { Alert, Button, Spinner } from '@/components/ui'
import { getTool } from '@/content/registry'
import { friendlyMessage, validatePdfFile } from '@/lib/pdf/errors'
import type { PdfDocumentHandle } from '@/lib/pdf/pdfjs'
import { cn } from '@/lib/utils'

const tool = getTool('pdf-reader')!

export default function PdfReader() {
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [numPages, setNumPages] = useState(0)
  const [pageNum, setPageNum] = useState(1)
  const [scale, setScale] = useState(1.2)
  const [busy, setBusy] = useState(false)
  const docRef = useRef<PdfDocumentHandle | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const renderTaskRef = useRef<{ cancel: () => void } | null>(null)
  const [ready, setReady] = useState(false)

  const openFile = async (incoming: File[]) => {
    const next = incoming[0]
    setError(null)
    try {
      await validatePdfFile(next)
      setFile(next)
    } catch (err) {
      setError(friendlyMessage(err))
    }
  }

  useEffect(() => {
    let cancelled = false
    if (!file) return
    setBusy(true)
    setReady(false)
    ;(async () => {
      try {
        const { openPdfDocument } = await import('@/lib/pdf/pdfjs')
        const bytes = await file.arrayBuffer()
        const doc = await openPdfDocument(bytes)
        if (cancelled) {
          await doc.close()
          return
        }
        docRef.current = doc
        setNumPages(doc.numPages)
        setPageNum(1)
        setReady(true)
      } catch (err) {
        if (!cancelled) setError(friendlyMessage(err))
      } finally {
        if (!cancelled) setBusy(false)
      }
    })()
    return () => {
      cancelled = true
      renderTaskRef.current?.cancel()
      docRef.current?.close()
      docRef.current = null
    }
  }, [file])

  const renderPage = useCallback(
    async (n: number, s: number) => {
      const doc = docRef.current
      const canvas = canvasRef.current
      if (!doc || !canvas) return
      renderTaskRef.current?.cancel()
      const page = await doc.getPage(n)
      const viewport = page.getViewport({ scale: s })
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      canvas.width = Math.floor(viewport.width)
      canvas.height = Math.floor(viewport.height)
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      const task = page.render({ canvas, canvasContext: ctx, viewport })
      renderTaskRef.current = task
      try {
        await task.promise
      } catch {
        /* cancelled */
      }
    },
    [],
  )

  useEffect(() => {
    if (ready && docRef.current) void renderPage(pageNum, scale)
  }, [ready, pageNum, scale, renderPage])

  const go = (delta: number) => setPageNum((p) => Math.min(numPages, Math.max(1, p + delta)))

  return (
    <ToolShell tool={tool}>
      <div className="space-y-6">
        {!file ? (
          <FileDropzone accept={tool.accept} onFiles={openFile} title="Open a PDF to read" hint="PDFs only. Files stay on your device." />
        ) : null}

        {error ? <Alert tone="error">{error}</Alert> : null}
        {busy ? (
          <p className="inline-flex items-center gap-2 text-sm text-ink-muted">
            <Spinner /> Loading document…
          </p>
        ) : null}

        {file ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-line bg-surface p-2">
              <Button size="sm" variant="secondary" onClick={() => go(-1)} disabled={pageNum <= 1} aria-label="Previous page">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-2 text-sm text-ink-soft">
                <input
                  type="number"
                  min={1}
                  max={numPages}
                  value={pageNum}
                  onChange={(e) => setPageNum(Math.min(numPages, Math.max(1, Number(e.target.value) || 1)))}
                  aria-label="Page number"
                  className="h-8 w-16 rounded-md border border-line-strong bg-paper px-2 text-center text-sm outline-none focus:border-accent"
                />
                <span>of {numPages || '…'}</span>
              </div>
              <Button size="sm" variant="secondary" onClick={() => go(1)} disabled={pageNum >= numPages} aria-label="Next page">
                <ChevronRight className="h-4 w-4" />
              </Button>
              <div className="mx-1 h-5 w-px bg-line" />
              <Button size="sm" variant="ghost" onClick={() => setScale((s) => Math.max(0.5, +(s - 0.2).toFixed(2)))} aria-label="Zoom out">
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="w-12 text-center text-sm text-ink-soft">{Math.round(scale * 100)}%</span>
              <Button size="sm" variant="ghost" onClick={() => setScale((s) => Math.min(4, +(s + 0.2).toFixed(2)))} aria-label="Zoom in">
                <ZoomIn className="h-4 w-4" />
              </Button>
              <button
                type="button"
                className="ml-auto text-sm text-ink-muted underline hover:text-ink"
                onClick={() => {
                  setFile(null)
                  docRef.current?.close()
                  docRef.current = null
                }}
              >
                Close file
              </button>
            </div>

            <div className={cn('overflow-auto rounded-lg border border-line bg-surface-sunken/40 p-4')}>
              <canvas ref={canvasRef} className="mx-auto block max-w-full bg-white shadow-sm" aria-label={`Page ${pageNum}`} />
            </div>
          </div>
        ) : null}
      </div>
    </ToolShell>
  )
}
