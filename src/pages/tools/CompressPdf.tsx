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
import { downloadBytes, formatBytes, percent, safeBaseName } from '@/lib/utils'

const tool = getTool('compress-pdf')!

type Mode = 'lossless' | 'rasterize'

interface CompressResult {
  bytes: Uint8Array
  originalSize: number
  newSize: number
  mode: Mode
}

export default function CompressPdf() {
  const { file, pageCount, loading, error, select, clear } = useSinglePdfFile()
  const [mode, setMode] = useState<Mode>('lossless')
  const [stripMetadata, setStripMetadata] = useState(true)
  const [dpi, setDpi] = useState(120)
  const [quality, setQuality] = useState(0.6)
  const [result, setResult] = useState<CompressResult | null>(null)
  const task = useAsyncTask()
  const out = useOutputFileName(file ? `${safeBaseName(file.name)}-compressed` : 'compressed', 'pdf')

  useEffect(() => {
    setResult(null)
    task.reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file])

  const run = () =>
    task.run(async ({ signal, onProgress }) => {
      if (!file) return
      const bytes = new Uint8Array(await file.arrayBuffer())
      const originalSize = bytes.length
      let out: Uint8Array
      if (mode === 'lossless') {
        const { compressLossless } = await import('@/lib/pdf/compress')
        out = await compressLossless(bytes, { stripMetadata })
      } else {
        const { compressRasterize } = await import('@/lib/pdf/compress')
        out = await compressRasterize(bytes, { dpi, quality, onProgress, signal })
      }
      setResult({ bytes: out, originalSize, newSize: out.length, mode })
    })

  const smaller = result ? result.newSize < result.originalSize : false
  const delta = result ? result.originalSize - result.newSize : 0

  return (
    <ToolShell tool={tool}>
      <div className="space-y-6">
        <FileDropzone accept={tool.accept} onFiles={select} title="Add a PDF to compress" />

        {loading ? (
          <p className="inline-flex items-center gap-2 text-sm text-ink-muted">
            <Spinner /> Reading document…
          </p>
        ) : null}
        {error ? <Alert tone="error">{error}</Alert> : null}

        {file && pageCount > 0 ? (
          <div className="space-y-5">
            <p className="text-sm text-ink-soft">
              <span className="font-medium text-ink">{file.name}</span> · {formatBytes(file.size)} ·{' '}
              {pageCount} page{pageCount === 1 ? '' : 's'}
            </p>

            <fieldset className="space-y-3">
              <legend className="text-sm font-medium">Optimisation level</legend>
              <label className="flex items-start gap-3 rounded-md border border-line bg-surface p-4">
                <input type="radio" name="mode" checked={mode === 'lossless'} onChange={() => setMode('lossless')} className="mt-1" />
                <span>
                  <span className="block text-sm font-medium">Lossless rebuild (recommended)</span>
                  <span className="block text-sm text-ink-soft">
                    Rebuilds the PDF structure and removes redundant objects. Keeps pages and images
                    exactly as they are, so it is safe — but image-heavy files may not shrink.
                  </span>
                </span>
              </label>
              <label className="flex items-start gap-3 rounded-md border border-line bg-surface p-4">
                <input type="radio" name="mode" checked={mode === 'rasterize'} onChange={() => setMode('rasterize')} className="mt-1" />
                <span>
                  <span className="block text-sm font-medium">Strong compression — rasterise pages (lossy)</span>
                  <span className="block text-sm text-ink-soft">
                    Renders every page to a JPEG and rebuilds the PDF. This often shrinks scans a lot,
                    but text becomes an image: it is no longer selectable or searchable, and quality
                    drops.
                  </span>
                </span>
              </label>
            </fieldset>

            {mode === 'lossless' ? (
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={stripMetadata} onChange={(e) => setStripMetadata(e.target.checked)} />
                Remove document metadata (title, author, subject)
              </label>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Image resolution (DPI)" hint="Lower is smaller but blurrier.">
                  <select
                    value={dpi}
                    onChange={(e) => setDpi(Number(e.target.value))}
                    className="h-10 w-full rounded-md border border-line-strong bg-paper px-3 text-sm outline-none focus:border-accent"
                  >
                    <option value={72}>72 — smallest, screen only</option>
                    <option value={96}>96 — very small</option>
                    <option value={120}>120 — small</option>
                    <option value={150}>150 — balanced</option>
                    <option value={200}>200 — clearer</option>
                    <option value={300}>300 — print quality (rarely smaller)</option>
                  </select>
                </Field>
                <Field label="JPEG quality" hint={`${Math.round(quality * 100)}%`}>
                  <input type="range" min={0.3} max={0.9} step={0.05} value={quality} onChange={(e) => setQuality(Number(e.target.value))} className="w-full accent-[var(--color-accent)]" />
                </Field>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={run} disabled={task.status === 'running'}>
                {task.status === 'running' ? 'Compressing…' : 'Compress PDF'}
              </Button>
              {task.status === 'running' ? <Button variant="ghost" onClick={task.cancel}>Cancel</Button> : null}
            </div>

            {task.status === 'running' ? (
              <ProgressBar value={task.progress * 100} label={task.message || 'Working…'} />
            ) : null}
            {task.error ? <Alert tone="error">{task.error}</Alert> : null}

            {result ? (
              <div className={`rounded-lg border p-4 ${smaller ? 'border-success/25 bg-success-soft' : 'border-warn/25 bg-warn-soft'}`}>
                <p className={`font-medium ${smaller ? 'text-success' : 'text-warn'}`}>
                  {smaller ? 'File reduced' : 'This file could not be made smaller'}
                </p>
                <div className="mt-2 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                  <div>
                    <p className="text-ink-muted">Before</p>
                    <p className="font-medium text-ink">{formatBytes(result.originalSize)}</p>
                  </div>
                  <div>
                    <p className="text-ink-muted">After</p>
                    <p className="font-medium text-ink">{formatBytes(result.newSize)}</p>
                  </div>
                  <div>
                    <p className="text-ink-muted">{smaller ? 'Saved' : 'Increase'}</p>
                    <p className={`font-medium ${smaller ? 'text-success' : 'text-warn'}`}>
                      {formatBytes(Math.abs(delta))} ({percent(Math.abs(delta), result.originalSize)}%)
                    </p>
                  </div>
                </div>

                {!smaller ? (
                  <p className="mt-3 text-sm text-ink-soft">
                    The rebuilt file is not smaller. We recommend keeping your original. If you need a
                    smaller file, try the lossy “rasterise” option and review the quality trade-off.
                  </p>
                ) : null}

                <div className="mt-3">
                  <FilenameField
                    base={out.base}
                    extension="pdf"
                    onChange={out.setBase}
                    id="compress-output-name"
                  />
                </div>
                <div className="mt-3 flex flex-wrap gap-3">
                  <Button
                    variant={smaller ? 'primary' : 'secondary'}
                    onClick={() => downloadBytes(result.bytes, out.fileName)}
                  >
                    <Download className="h-4 w-4" />{' '}
                    {smaller ? 'Download compressed PDF' : 'Download rebuilt copy anyway'}
                  </Button>
                  <Button variant="secondary" onClick={() => { setResult(null); task.reset() }}>
                    <RotateCcw className="h-4 w-4" /> Try another level
                  </Button>
                </div>
              </div>
            ) : null}

            <Alert tone="info" title="Why results vary">
              Compression depends on what is inside the file. Text-heavy PDFs are already compact and
              barely change. Scanned, image-heavy files only shrink meaningfully with the lossy option.
              We always show you the exact before-and-after size.
            </Alert>

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
