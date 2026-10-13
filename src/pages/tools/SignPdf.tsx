import { useEffect, useRef, useState } from 'react'
import { Eraser, ImagePlus, PenTool, Trash2 } from 'lucide-react'
import { ToolShell } from '@/components/tools/ToolShell'
import { FileDropzone } from '@/components/tools/FileDropzone'
import { FilenameField } from '@/components/tools/FilenameField'
import { PageCanvas, type PlacedImage } from '@/components/tools/PageCanvas'
import { usePdfPagePreviews } from '@/components/tools/usePdfPagePreviews'
import { useAsyncTask } from '@/components/tools/useAsyncTask'
import { useSinglePdfFile } from '@/components/tools/useSinglePdfFile'
import { useOutputFileName } from '@/components/tools/useOutputFileName'
import { Alert, Button, Field, ProgressBar, Spinner } from '@/components/ui'
import { getTool } from '@/content/registry'
import { downloadBytes, safeBaseName } from '@/lib/utils'
import { friendlyMessage, validateImageFile } from '@/lib/pdf/errors'
import { embedImageFile, previewRectToPdf, rotationDegrees } from '@/lib/pdf/placement'
import { PDFDocument } from 'pdf-lib'

const tool = getTool('sign-pdf')!

const SIGNATURE_ACCEPT = 'image/png,image/jpeg,.png,.jpg,.jpeg'

interface SignatureMeta {
  file: File
  url: string
  width: number
  height: number
}

interface Placement extends PlacedImage {
  file: File
}

async function readImageSize(file: File): Promise<{ width: number; height: number }> {
  if (typeof createImageBitmap !== 'function') {
    throw new Error('This browser cannot read the image.')
  }
  const bitmap = await createImageBitmap(file)
  const size = { width: bitmap.width, height: bitmap.height }
  bitmap.close()
  return size
}

export default function SignPdf() {
  const { file, pageCount, loading, error, select, clear } = useSinglePdfFile()
  const { previews, status: previewStatus, error: previewError } = usePdfPagePreviews(file)
  const task = useAsyncTask()
  const out = useOutputFileName(file ? `${safeBaseName(file.name)}-signed` : 'signed', 'pdf')

  const [signature, setSignature] = useState<SignatureMeta | null>(null)
  const [signatureError, setSignatureError] = useState<string | null>(null)
  const [placements, setPlacements] = useState<Placement[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [hasDrawn, setHasDrawn] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawingRef = useRef(false)
  const uploadInputRef = useRef<HTMLInputElement>(null)
  const urlsRef = useRef<string[]>([])

  useEffect(
    () => () => {
      urlsRef.current.forEach((url) => URL.revokeObjectURL(url))
      urlsRef.current = []
    },
    [],
  )

  useEffect(() => {
    setPlacements([])
    setSelectedId(null)
    task.reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file])

  const registerUrl = (url: string) => {
    urlsRef.current.push(url)
    return url
  }

  const applySignatureFile = async (incoming: File) => {
    setSignatureError(null)
    try {
      validateImageFile(incoming)
      const size = await readImageSize(incoming)
      if (signature) URL.revokeObjectURL(signature.url)
      const url = registerUrl(URL.createObjectURL(incoming))
      setSignature({ file: incoming, url, width: size.width, height: size.height })
    } catch (err) {
      setSignatureError(friendlyMessage(err))
    }
  }

  const saveDrawnSignature = async () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
    if (!blob) {
      setSignatureError('The signature could not be created. Please try again.')
      return
    }
    await applySignatureFile(new File([blob], 'signature.png', { type: 'image/png' }))
  }

  const clearCanvas = () => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasDrawn(false)
  }

  const canvasPoint = (ev: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    return {
      x: (ev.clientX - rect.left) * (canvas.width / rect.width),
      y: (ev.clientY - rect.top) * (canvas.height / rect.height),
    }
  }

  const onCanvasDown = (ev: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    ev.preventDefault()
    ev.currentTarget.setPointerCapture(ev.pointerId)
    drawingRef.current = true
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.lineWidth = 3
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = '#111827'
    const { x, y } = canvasPoint(ev)
    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  const onCanvasMove = (ev: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    ev.preventDefault()
    const { x, y } = canvasPoint(ev)
    ctx.lineTo(x, y)
    ctx.stroke()
    if (!hasDrawn) setHasDrawn(true)
  }

  const onCanvasUp = () => {
    drawingRef.current = false
  }

  const placeSignature = (page: number, x: number, y: number) => {
    if (!signature) return
    const preview = previews.find((p) => p.pageNumber === page)
    if (!preview) return
    const width = Math.min(preview.width * 0.35, 320)
    const aspect = signature.width / signature.height || 1
    const height = width / aspect
    const id = Math.random().toString(36).slice(2)
    setPlacements((prev) => [
      ...prev,
      {
        id,
        page,
        x: x - width / 2,
        y: y - height / 2,
        width,
        height,
        url: signature.url,
        file: signature.file,
      },
    ])
    setSelectedId(id)
  }

  const updatePlacement = (id: string, changes: Partial<Placement>) =>
    setPlacements((prev) => prev.map((p) => (p.id === id ? { ...p, ...changes } : p)))

  const removeSelected = () => {
    if (!selectedId) return
    setPlacements((prev) => prev.filter((p) => p.id !== selectedId))
    setSelectedId(null)
  }

  const runExport = () =>
    task.run(async ({ signal, onProgress }) => {
      if (!file) return
      if (placements.length === 0) throw new Error('Place at least one signature before exporting.')
      const bytes = new Uint8Array(await file.arrayBuffer())
      const pdfDoc = await PDFDocument.load(bytes)
      const cache = new Map<File, Awaited<ReturnType<typeof embedImageFile>>>()

      for (let i = 0; i < placements.length; i++) {
        const p = placements[i]
        const preview = previews.find((pr) => pr.pageNumber === p.page)
        if (!preview) continue
        if (signal.aborted) throw new DOMException('Aborted', 'AbortError')
        const page = pdfDoc.getPage(p.page - 1)
        let embedded = cache.get(p.file)
        if (!embedded) {
          embedded = await embedImageFile(pdfDoc, p.file, signal)
          cache.set(p.file, embedded)
        }
        const pos = previewRectToPdf(preview.transform, p.x, p.y, p.width, p.height)
        page.drawImage(embedded.image, {
          x: pos.x,
          y: pos.y,
          width: pos.width,
          height: pos.height,
          rotate: rotationDegrees(pos.rotation),
        })
        onProgress((i + 1) / placements.length, `Placed signature ${i + 1} of ${placements.length}`)
      }

      const saved = await pdfDoc.save()
      downloadBytes(new Uint8Array(saved), out.fileName)
    })

  return (
    <ToolShell tool={tool}>
      <div className="space-y-6">
        <FileDropzone accept={tool.accept} onFiles={select} title="Add a PDF to sign" />

        {loading ? (
          <p className="inline-flex items-center gap-2 text-sm text-ink-muted">
            <Spinner /> Reading document…
          </p>
        ) : null}
        {error ? <Alert tone="error">{error}</Alert> : null}

        {file && pageCount > 0 ? (
          <div className="space-y-6">
            <div className="space-y-4 rounded-lg border border-line bg-surface p-4">
              <div className="flex items-center gap-2">
                <PenTool className="h-4 w-4 text-accent" aria-hidden="true" />
                <p className="text-sm font-medium">Your signature</p>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="space-y-2">
                  <Field label="Draw your signature" hint="Draw with a mouse, finger, or stylus.">
                    <canvas
                      ref={canvasRef}
                      width={600}
                      height={200}
                      onPointerDown={onCanvasDown}
                      onPointerMove={onCanvasMove}
                      onPointerUp={onCanvasUp}
                      onPointerLeave={onCanvasUp}
                      onPointerCancel={onCanvasUp}
                      className="w-full touch-none rounded-md border border-line-strong bg-paper"
                      style={{ aspectRatio: '3 / 1' }}
                    />
                  </Field>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      type="button"
                      onClick={clearCanvas}
                      disabled={!hasDrawn}
                    >
                      <Eraser className="h-4 w-4" /> Clear
                    </Button>
                    <Button type="button" size="sm" onClick={saveDrawnSignature} disabled={!hasDrawn}>
                      Use drawn signature
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <input
                    ref={uploadInputRef}
                    type="file"
                    accept={SIGNATURE_ACCEPT}
                    className="sr-only"
                    onChange={(e) => {
                      const picked = e.target.files?.[0]
                      if (picked) void applySignatureFile(picked)
                      e.target.value = ''
                    }}
                  />
                  <Field label="Or upload a signature image" hint="PNG with transparency works best.">
                    <Button
                      variant="secondary"
                      type="button"
                      onClick={() => uploadInputRef.current?.click()}
                    >
                      <ImagePlus className="h-4 w-4" /> Choose image
                    </Button>
                  </Field>
                  {signature ? (
                    <div className="rounded-md border border-line bg-paper p-2">
                      <img src={signature.url} alt="Signature preview" className="mx-auto max-h-24" />
                    </div>
                  ) : (
                    <p className="text-xs text-ink-muted">
                      No signature yet. Draw one or upload an image, then click a page to place it.
                    </p>
                  )}
                </div>
              </div>

              {signatureError ? <Alert tone="error">{signatureError}</Alert> : null}
            </div>

            {previewStatus === 'running' ? (
              <p className="inline-flex items-center gap-2 text-sm text-ink-muted">
                <Spinner /> Rendering pages…
              </p>
            ) : null}
            {previewError ? <Alert tone="error">{previewError}</Alert> : null}

            {signature && previews.length > 0 ? (
              <p className="text-sm text-ink-soft">
                Click a page to place the signature. Drag to reposition it, or use the corner handle to
                resize.
              </p>
            ) : null}

            {previews.length > 0 && (
              <div className="space-y-8">
                {previews.map((p) => (
                  <div key={p.pageNumber} className="space-y-2">
                    <p className="text-sm text-ink-muted">Page {p.pageNumber}</p>
                    <PageCanvas
                      preview={p}
                      images={placements.filter((item) => item.page === p.pageNumber)}
                      selectedId={selectedId}
                      onSelect={setSelectedId}
                      onChange={updatePlacement}
                      onPlace={(x, y) => placeSignature(p.pageNumber, x, y)}
                      placeLabel={
                        signature
                          ? `Click to place your signature on page ${p.pageNumber}`
                          : `Add a signature first`
                      }
                    />
                  </div>
                ))}
              </div>
            )}

            {placements.length > 0 ? (
              <div className="space-y-3 rounded-lg border border-line bg-surface p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Signatures placed ({placements.length})</p>
                  {selectedId ? (
                    <Button variant="ghost" size="sm" onClick={removeSelected}>
                      <Trash2 className="h-4 w-4" /> Remove selected
                    </Button>
                  ) : null}
                </div>
                <ul className="space-y-1 text-sm text-ink-soft">
                  {placements.map((p, i) => (
                    <li key={p.id}>
                      Signature {i + 1} · page {p.page}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="max-w-md">
              <FilenameField
                base={out.base}
                extension="pdf"
                onChange={out.setBase}
                id="sign-output-name"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={runExport} disabled={task.status === 'running' || placements.length === 0}>
                {task.status === 'running' ? 'Exporting…' : 'Download signed PDF'}
              </Button>
              {task.status === 'running' ? (
                <Button variant="ghost" onClick={task.cancel}>
                  Cancel
                </Button>
              ) : null}
            </div>

            {task.status === 'running' ? (
              <ProgressBar value={task.progress * 100} label={task.message || 'Working…'} />
            ) : null}
            {task.error ? <Alert tone="error">{task.error}</Alert> : null}

            <button
              type="button"
              onClick={() => {
                clear()
                task.reset()
              }}
              className="text-sm text-ink-muted underline hover:text-ink"
            >
              Choose a different file
            </button>
          </div>
        ) : null}
      </div>
    </ToolShell>
  )
}
