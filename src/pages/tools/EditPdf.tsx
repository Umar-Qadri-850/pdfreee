import { useEffect, useMemo, useRef, useState } from 'react'
import { ImagePlus, Trash2 } from 'lucide-react'
import { ToolShell } from '@/components/tools/ToolShell'
import { FileDropzone } from '@/components/tools/FileDropzone'
import { PageCanvas, type PlacedImage } from '@/components/tools/PageCanvas'
import { usePdfPagePreviews } from '@/components/tools/usePdfPagePreviews'
import { useAsyncTask } from '@/components/tools/useAsyncTask'
import { useSinglePdfFile } from '@/components/tools/useSinglePdfFile'
import { Alert, Button, Field, ProgressBar, Spinner } from '@/components/ui'
import { getTool } from '@/content/registry'
import { downloadBytes, safeBaseName } from '@/lib/utils'
import { friendlyMessage, validateImageFile } from '@/lib/pdf/errors'
import {
  embedImageFile,
  previewAngle,
  previewPointToPdf,
  previewRectToPdf,
  rotationDegrees,
  RENDER_SCALE,
  type EmbeddedImage,
} from '@/lib/pdf/placement'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

const tool = getTool('edit-pdf')!

const IMAGE_ACCEPT = 'image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp'

interface TextEntry {
  id: string
  page: number // 1-based
  x: number // top-left, in rendered preview pixels
  y: number // top-left, in rendered preview pixels
  text: string
  fontSize: number // PDF points
  color: string
}

interface ImageEntry extends PlacedImage {
  file: File
}

interface PendingImage {
  file: File
  url: string
  width: number
  height: number
}

type Selection = { type: 'text' | 'image'; id: string } | null

async function readImageSize(file: File): Promise<{ width: number; height: number }> {
  if (typeof createImageBitmap !== 'function') {
    throw new Error('This browser cannot read the image.')
  }
  const bitmap = await createImageBitmap(file)
  const size = { width: bitmap.width, height: bitmap.height }
  bitmap.close()
  return size
}

export default function EditPdf() {
  const { file, pageCount, loading, error, select, clear } = useSinglePdfFile()
  const { previews, status: previewStatus, error: previewError } = usePdfPagePreviews(file)
  const task = useAsyncTask()

  const [entries, setEntries] = useState<TextEntry[]>([])
  const [images, setImages] = useState<ImageEntry[]>([])
  const [selected, setSelected] = useState<Selection>(null)
  const [pending, setPending] = useState<PendingImage | null>(null)
  const [imageError, setImageError] = useState<string | null>(null)

  const imageInputRef = useRef<HTMLInputElement>(null)
  const urlsRef = useRef<string[]>([])

  const selectedEntry = useMemo(
    () => (selected?.type === 'text' ? entries.find((e) => e.id === selected.id) ?? null : null),
    [entries, selected],
  )
  const selectedImage = useMemo(
    () => (selected?.type === 'image' ? images.find((e) => e.id === selected.id) ?? null : null),
    [images, selected],
  )

  useEffect(
    () => () => {
      urlsRef.current.forEach((url) => URL.revokeObjectURL(url))
      urlsRef.current = []
    },
    [],
  )

  useEffect(() => {
    setEntries([])
    setImages([])
    setSelected(null)
    setPending(null)
    setImageError(null)
    task.reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file])

  const registerUrl = (url: string) => {
    urlsRef.current.push(url)
    return url
  }
  const unregisterUrl = (url: string) => {
    URL.revokeObjectURL(url)
    urlsRef.current = urlsRef.current.filter((u) => u !== url)
  }

  const resetPlacements = () => {
    urlsRef.current.forEach((url) => URL.revokeObjectURL(url))
    urlsRef.current = []
    setEntries([])
    setImages([])
    setSelected(null)
    setPending(null)
    if (pending) URL.revokeObjectURL(pending.url)
  }

  const addEntry = (page: number, x: number, y: number) => {
    const id = Math.random().toString(36).slice(2)
    setEntries((prev) => [...prev, { id, page, x, y, text: 'Text', fontSize: 16, color: '#000000' }])
    setSelected({ type: 'text', id })
  }

  const updateEntry = (id: string, changes: Partial<TextEntry>) =>
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, ...changes } : e)))

  const removeEntry = (id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id))
    setSelected((prev) => (prev?.type === 'text' && prev.id === id ? null : prev))
  }

  const updateImage = (id: string, changes: Partial<ImageEntry>) =>
    setImages((prev) => prev.map((img) => (img.id === id ? { ...img, ...changes } : img)))

  const removeImage = (id: string) => {
    setImages((prev) => {
      const target = prev.find((img) => img.id === id)
      if (target) unregisterUrl(target.url)
      return prev.filter((img) => img.id !== id)
    })
    setSelected((prev) => (prev?.type === 'image' && prev.id === id ? null : prev))
  }

  const chooseImage = async (incoming: File) => {
    setImageError(null)
    try {
      validateImageFile(incoming)
      const size = await readImageSize(incoming)
      if (pending) URL.revokeObjectURL(pending.url)
      const url = registerUrl(URL.createObjectURL(incoming))
      setPending({ file: incoming, url, width: size.width, height: size.height })
    } catch (err) {
      setImageError(friendlyMessage(err))
    }
  }

  const placeAt = (page: number, x: number, y: number) => {
    if (!pending) {
      addEntry(page, x, y)
      return
    }
    const preview = previews.find((p) => p.pageNumber === page)
    if (!preview) return
    const width = Math.min(preview.width * 0.35, 320)
    const aspect = pending.width / pending.height || 1
    const height = width / aspect
    const id = Math.random().toString(36).slice(2)
    const url = registerUrl(URL.createObjectURL(pending.file))
    setImages((prev) => [
      ...prev,
      { id, page, x: x - width / 2, y: y - height / 2, width, height, url, file: pending.file },
    ])
    setSelected({ type: 'image', id })
  }

  const runExport = () =>
    task.run(async ({ signal, onProgress }) => {
      if (!file) return
      if (entries.length + images.length === 0) {
        throw new Error('Add at least one text entry or image before exporting.')
      }
      const bytes = new Uint8Array(await file.arrayBuffer())
      const pdfDoc = await PDFDocument.load(bytes)
      const helv = entries.length > 0 ? await pdfDoc.embedFont(StandardFonts.Helvetica) : null
      const total = entries.length + images.length
      let done = 0

      for (const e of entries) {
        const preview = previews.find((p) => p.pageNumber === e.page)
        if (!preview) continue
        if (signal.aborted) throw new DOMException('Aborted', 'AbortError')
        const page = pdfDoc.getPage(e.page - 1)
        const baselineY = e.y + e.fontSize * RENDER_SCALE * 0.8
        const pos = previewPointToPdf(preview.transform, e.x, baselineY)
        const angle = previewAngle(preview.transform, e.x, e.y)
        page.drawText(e.text, {
          x: pos.x,
          y: pos.y,
          size: e.fontSize,
          font: helv!,
          color: hexToRgb(e.color),
          rotate: rotationDegrees(angle),
        })
        done += 1
        onProgress(done / total, `Placed text ${done} of ${total}`)
      }

      const cache = new Map<File, EmbeddedImage>()
      for (const img of images) {
        const preview = previews.find((p) => p.pageNumber === img.page)
        if (!preview) continue
        if (signal.aborted) throw new DOMException('Aborted', 'AbortError')
        const page = pdfDoc.getPage(img.page - 1)
        let embedded = cache.get(img.file)
        if (!embedded) {
          embedded = await embedImageFile(pdfDoc, img.file, signal)
          cache.set(img.file, embedded)
        }
        const pos = previewRectToPdf(preview.transform, img.x, img.y, img.width, img.height)
        page.drawImage(embedded.image, {
          x: pos.x,
          y: pos.y,
          width: pos.width,
          height: pos.height,
          rotate: rotationDegrees(pos.rotation),
        })
        done += 1
        onProgress(done / total, `Placed image ${done} of ${total}`)
      }

      const out = await pdfDoc.save()
      downloadBytes(new Uint8Array(out), `${safeBaseName(file.name)}-edited.pdf`)
    })

  return (
    <ToolShell tool={tool}>
      <div className="space-y-6">
        <FileDropzone accept={tool.accept} onFiles={select} title="Add a PDF to edit" />

        {loading ? (
          <p className="inline-flex items-center gap-2 text-sm text-ink-muted">
            <Spinner /> Reading document…
          </p>
        ) : null}
        {error ? <Alert tone="error">{error}</Alert> : null}

        {file && pageCount > 0 ? (
          <div className="space-y-6">
            <input
              ref={imageInputRef}
              type="file"
              accept={IMAGE_ACCEPT}
              className="sr-only"
              onChange={(e) => {
                const picked = e.target.files?.[0]
                if (picked) void chooseImage(picked)
                e.target.value = ''
              }}
            />

            <div className="flex flex-wrap items-center gap-3">
              <Button variant="secondary" size="sm" type="button" onClick={() => imageInputRef.current?.click()}>
                <ImagePlus className="h-4 w-4" /> Insert image
              </Button>
              {pending ? (
                <span className="inline-flex items-center gap-3 text-sm text-ink-soft">
                  <img src={pending.url} alt="" className="h-8 w-8 rounded border border-line object-contain" />
                  Click a page to place it.
                  <Button
                    variant="ghost"
                    size="sm"
                    type="button"
                    onClick={() => {
                      URL.revokeObjectURL(pending.url)
                      setPending(null)
                    }}
                  >
                    Cancel
                  </Button>
                </span>
              ) : (
                <span className="text-sm text-ink-muted">
                  Click a page to add text, or insert an image to place instead.
                </span>
              )}
            </div>

            {imageError ? <Alert tone="error">{imageError}</Alert> : null}

            {previewStatus === 'running' ? (
              <p className="inline-flex items-center gap-2 text-sm text-ink-muted">
                <Spinner /> Rendering pages…
              </p>
            ) : null}
            {previewError ? <Alert tone="error">{previewError}</Alert> : null}

            {previews.length > 0 && (
              <div className="space-y-8">
                {previews.map((p) => (
                  <div key={p.pageNumber} className="space-y-2">
                    <p className="text-sm text-ink-muted">Page {p.pageNumber}</p>
                    <PageCanvas
                      preview={p}
                      images={images.filter((img) => img.page === p.pageNumber)}
                      selectedId={selected?.type === 'image' ? selected.id : null}
                      onSelect={(id) => setSelected(id ? { type: 'image', id } : null)}
                      onChange={updateImage}
                      onPlace={(x, y) => placeAt(p.pageNumber, x, y)}
                      placeLabel={`Click to add ${pending ? 'image' : 'text'} on page ${p.pageNumber}`}
                    >
                      {entries
                        .filter((e) => e.page === p.pageNumber)
                        .map((e) => (
                          <div
                            key={e.id}
                            className={`absolute cursor-pointer select-none whitespace-pre ${
                              selected?.type === 'text' && selected.id === e.id ? 'ring-2 ring-accent' : ''
                            }`}
                            style={{
                              left: e.x,
                              top: e.y,
                              color: e.color,
                              fontSize: `${e.fontSize * RENDER_SCALE}px`,
                              lineHeight: 1,
                            }}
                            onPointerDown={(ev) => {
                              ev.stopPropagation()
                              setSelected({ type: 'text', id: e.id })
                            }}
                            onClick={(ev) => ev.stopPropagation()}
                          >
                            {e.text}
                          </div>
                        ))}
                    </PageCanvas>
                  </div>
                ))}
              </div>
            )}

            {selectedEntry || selectedImage || entries.length > 0 || images.length > 0 ? (
              <div className="space-y-4 rounded-lg border border-line bg-surface p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">
                    {entries.length} text · {images.length} image{images.length === 1 ? '' : 's'}
                  </p>
                  {selectedEntry ? (
                    <Button variant="ghost" size="sm" onClick={() => removeEntry(selectedEntry.id)}>
                      <Trash2 className="h-4 w-4" /> Remove text
                    </Button>
                  ) : selectedImage ? (
                    <Button variant="ghost" size="sm" onClick={() => removeImage(selectedImage.id)}>
                      <Trash2 className="h-4 w-4" /> Remove image
                    </Button>
                  ) : null}
                </div>

                {selectedEntry ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Text">
                      <input
                        value={selectedEntry.text}
                        onChange={(e) => updateEntry(selectedEntry.id, { text: e.target.value })}
                        className="h-10 w-full rounded-md border border-line-strong bg-paper px-3 text-sm outline-none focus:border-accent"
                      />
                    </Field>
                    <Field label="Font size (pt)" hint={`${selectedEntry.fontSize} pt`}>
                      <input
                        type="range"
                        min={8}
                        max={72}
                        value={selectedEntry.fontSize}
                        onChange={(e) => updateEntry(selectedEntry.id, { fontSize: Number(e.target.value) })}
                        className="w-full accent-[var(--color-accent)]"
                      />
                    </Field>
                    <Field label="Color">
                      <input
                        type="color"
                        value={selectedEntry.color}
                        onChange={(e) => updateEntry(selectedEntry.id, { color: e.target.value })}
                        className="h-10 w-full rounded-md border border-line-strong bg-paper px-1"
                      />
                    </Field>
                    <Field label="Page">
                      <input
                        type="number"
                        min={1}
                        max={pageCount}
                        value={selectedEntry.page}
                        onChange={(e) =>
                          updateEntry(selectedEntry.id, {
                            page: Math.max(1, Math.min(pageCount, Number(e.target.value))),
                          })
                        }
                        className="h-10 w-full rounded-md border border-line-strong bg-paper px-3 text-sm outline-none focus:border-accent"
                      />
                    </Field>
                  </div>
                ) : selectedImage ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Width (px)" hint={`${Math.round(selectedImage.width)} px`}>
                      <input
                        type="range"
                        min={24}
                        max={Math.max(48, Math.round((previews.find((p) => p.pageNumber === selectedImage.page)?.width ?? 600)))}
                        value={Math.round(selectedImage.width)}
                        onChange={(e) => {
                          const width = Number(e.target.value)
                          const aspect = selectedImage.width / selectedImage.height || 1
                          updateImage(selectedImage.id, { width, height: width / aspect })
                        }}
                        className="w-full accent-[var(--color-accent)]"
                      />
                    </Field>
                    <Field label="Page">
                      <input
                        type="number"
                        min={1}
                        max={pageCount}
                        value={selectedImage.page}
                        onChange={(e) =>
                          updateImage(selectedImage.id, {
                            page: Math.max(1, Math.min(pageCount, Number(e.target.value))),
                          })
                        }
                        className="h-10 w-full rounded-md border border-line-strong bg-paper px-3 text-sm outline-none focus:border-accent"
                      />
                    </Field>
                  </div>
                ) : (
                  <p className="text-sm text-ink-muted">
                    Click a text box or image on any page to select it.
                  </p>
                )}
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={runExport} disabled={task.status === 'running'}>
                {task.status === 'running' ? 'Exporting…' : 'Download edited PDF'}
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
                resetPlacements()
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

function hexToRgb(hex: string) {
  let h = hex.replace('#', '')
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]
  const r = parseInt(h.substring(0, 2), 16)
  const g = parseInt(h.substring(2, 4), 16)
  const b = parseInt(h.substring(4, 6), 16)
  return rgb(r / 255, g / 255, b / 255)
}
