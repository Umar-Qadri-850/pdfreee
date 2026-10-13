import { useEffect, useState } from 'react'
import { Download, RotateCcw } from 'lucide-react'
import { ToolShell } from '@/components/tools/ToolShell'
import { FileDropzone } from '@/components/tools/FileDropzone'
import { FilenameField } from '@/components/tools/FilenameField'
import { useAsyncTask } from '@/components/tools/useAsyncTask'
import { useSinglePdfFile } from '@/components/tools/useSinglePdfFile'
import { useOutputFileName } from '@/components/tools/useOutputFileName'
import { Alert, Button, Field, ProgressBar, Spinner } from '@/components/ui'
import { getTool } from '@/content/registry'
import { downloadBlob, formatBytes, safeBaseName } from '@/lib/utils'

const tool = getTool('pdf-to-jpg')!

interface OutImage {
  page: number
  blob: Blob
  url: string
  width: number
  height: number
}

export default function PdfToJpg() {
  const { file, pageCount, loading, error, select, clear } = useSinglePdfFile()
  const [format, setFormat] = useState<'image/jpeg' | 'image/png'>('image/jpeg')
  const [dpi, setDpi] = useState(150)
  const [quality, setQuality] = useState(0.85)
  const [range, setRange] = useState('')
  const [images, setImages] = useState<OutImage[]>([])
  const task = useAsyncTask()
  const ext = format === 'image/png' ? 'png' : 'jpg'
  const out = useOutputFileName(file ? safeBaseName(file.name) : 'pages', ext)

  useEffect(() => {
    setImages([])
    setRange('')
    task.reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file])

  useEffect(() => {
    return () => images.forEach((i) => URL.revokeObjectURL(i.url))
  }, [images])

  const run = () =>
    task.run(async ({ signal, onProgress }) => {
      if (!file) return
      images.forEach((i) => URL.revokeObjectURL(i.url))
      const { pdfToImages } = await import('@/lib/pdf/images')
      const bytes = new Uint8Array(await file.arrayBuffer())
      const rendered = await pdfToImages(bytes, {
        dpi,
        format,
        quality,
        range,
        onProgress,
        signal,
      })
      setImages(
        rendered.map((r) => ({
          page: r.page,
          blob: r.blob,
          url: URL.createObjectURL(r.blob),
          width: r.width,
          height: r.height,
        })),
      )
    })

  const base = out.stem

  return (
    <ToolShell tool={tool}>
      <div className="space-y-6">
        <FileDropzone accept={tool.accept} onFiles={select} title="Add a PDF to convert" />

        {loading ? (
          <p className="inline-flex items-center gap-2 text-sm text-ink-muted">
            <Spinner /> Reading document…
          </p>
        ) : null}
        {error ? <Alert tone="error">{error}</Alert> : null}

        {file && pageCount > 0 ? (
          <div className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Image format">
                <select
                  value={format}
                  onChange={(e) => setFormat(e.target.value as 'image/jpeg' | 'image/png')}
                  className="h-10 w-full rounded-md border border-line-strong bg-paper px-3 text-sm outline-none focus:border-accent"
                >
                  <option value="image/jpeg">JPG (smaller, good for photos)</option>
                  <option value="image/png">PNG (crisp, good for text)</option>
                </select>
              </Field>
              <Field label="Resolution (DPI)">
                <select
                  value={dpi}
                  onChange={(e) => setDpi(Number(e.target.value))}
                  className="h-10 w-full rounded-md border border-line-strong bg-paper px-3 text-sm outline-none focus:border-accent"
                >
                  <option value={72}>72 — screen, smallest</option>
                  <option value={150}>150 — balanced</option>
                  <option value={300}>300 — print quality</option>
                  <option value={600}>600 — high detail</option>
                </select>
              </Field>
              <Field label="JPG quality" hint="Only applies to JPG.">
                <input
                  type="range"
                  min={0.4}
                  max={1}
                  step={0.05}
                  value={quality}
                  onChange={(e) => setQuality(Number(e.target.value))}
                  disabled={format === 'image/png'}
                  className="w-full accent-[var(--color-accent)]"
                />
              </Field>
              <Field label="Pages" htmlFor="p2i-range" hint={`Leave empty for all ${pageCount}.`}>
                <input
                  id="p2i-range"
                  value={range}
                  onChange={(e) => setRange(e.target.value)}
                  placeholder="e.g. 1-3, 5"
                  className="h-10 w-full rounded-md border border-line-strong bg-paper px-3 font-mono text-sm outline-none focus:border-accent"
                />
              </Field>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={run} disabled={task.status === 'running'}>
                {task.status === 'running' ? 'Converting…' : 'Convert to images'}
              </Button>
              {task.status === 'running' ? <Button variant="ghost" onClick={task.cancel}>Cancel</Button> : null}
            </div>

            {task.status === 'running' ? (
              <ProgressBar value={task.progress * 100} label={task.message || 'Rendering pages…'} />
            ) : null}
            {task.error ? <Alert tone="error">{task.error}</Alert> : null}

            {images.length > 0 ? (
              <div className="space-y-4">
                <div className="max-w-md">
                  <FilenameField
                    base={out.base}
                    extension={ext}
                    onChange={out.setBase}
                    id="pdf-to-jpg-output-name"
                    hint="Used as the prefix for each image and the ZIP file."
                  />
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <p className="text-sm text-ink-soft">
                    {images.length} image{images.length === 1 ? '' : 's'} ready ·{' '}
                    {formatBytes(images.reduce((s, i) => s + i.blob.size, 0))} total
                  </p>
                  {images.length > 1 ? (
                    <Button
                      size="sm"
                      onClick={async () => {
                        const { createZip } = await import('@/lib/zip')
                        const entries = await Promise.all(
                          images.map(async (img) => ({
                            name: `${base}-page-${img.page}.${ext}`,
                            data: new Uint8Array(await img.blob.arrayBuffer()),
                          })),
                        )
                        downloadBlob(createZip(entries), `${base}-images.zip`)
                      }}
                    >
                      <Download className="h-4 w-4" /> Download all (ZIP)
                    </Button>
                  ) : null}
                </div>

                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                  {images.map((img) => (
                    <li key={img.page} className="rounded-md border border-line bg-surface p-2">
                      <img
                        src={img.url}
                        alt={`Rendered page ${img.page}`}
                        className="w-full rounded-sm border border-line"
                      />
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-xs text-ink-muted">
                          p.{img.page} · {img.width}×{img.height}
                        </span>
                        <button
                          type="button"
                          onClick={() => downloadBlob(img.blob, `${base}-page-${img.page}.${ext}`)}
                          className="text-xs font-medium text-accent-strong underline"
                        >
                          Download
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
                <Button variant="secondary" onClick={() => setImages([])}>
                  <RotateCcw className="h-4 w-4" /> Convert again
                </Button>
              </div>
            ) : null}

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
