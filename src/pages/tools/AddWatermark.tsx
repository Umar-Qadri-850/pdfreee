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
import { downloadBytes, formatBytes, safeBaseName } from '@/lib/utils'
import { parsePageRanges } from '@/lib/pdf/range'

const tool = getTool('add-watermark')!

export default function AddWatermark() {
  const { file, pageCount, loading, error, select, clear } = useSinglePdfFile()
  const [text, setText] = useState('CONFIDENTIAL')
  const [fontSize, setFontSize] = useState(48)
  const [opacity, setOpacity] = useState(0.25)
  const [rotation, setRotation] = useState(45)
  const [color, setColor] = useState('#e5484d')
  const [allPages, setAllPages] = useState(true)
  const [range, setRange] = useState('')
  const [rangeError, setRangeError] = useState<string | null>(null)
  const [result, setResult] = useState<Uint8Array | null>(null)
  const task = useAsyncTask()
  const out = useOutputFileName(file ? `${safeBaseName(file.name)}-watermarked` : 'watermarked', 'pdf')

  useEffect(() => {
    setResult(null)
    task.reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file])

  const run = () =>
    task.run(async () => {
      if (!file) return
      if (!text.trim()) throw new Error('Enter the watermark text.')
      let pages: number[] | undefined
      if (!allPages) {
        const parsed = parsePageRanges(range, pageCount)
        if (parsed.error) {
          setRangeError(parsed.error)
          throw new Error(parsed.error)
        }
        setRangeError(null)
        pages = parsed.pages
      }
      const { addWatermark } = await import('@/lib/pdf/overlay')
      const bytes = new Uint8Array(await file.arrayBuffer())
      setResult(await addWatermark(bytes, { text, fontSize, opacity, rotation, color, pages }))
    })

  return (
    <ToolShell tool={tool}>
      <div className="space-y-6">
        <FileDropzone accept={tool.accept} onFiles={select} title="Add a PDF to watermark" />

        {loading ? (
          <p className="inline-flex items-center gap-2 text-sm text-ink-muted">
            <Spinner /> Reading document…
          </p>
        ) : null}
        {error ? <Alert tone="error">{error}</Alert> : null}

        {file && pageCount > 0 ? (
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_14rem]">
            <div className="space-y-5">
              <Field label="Watermark text" htmlFor="wm-text">
                <input
                  id="wm-text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  maxLength={80}
                  className="h-10 w-full rounded-md border border-line-strong bg-paper px-3 text-sm outline-none focus:border-accent"
                  placeholder="e.g. CONFIDENTIAL"
                />
              </Field>

              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Font size" hint={`${fontSize} pt`}>
                  <input type="range" min={12} max={120} value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))} className="w-full accent-[var(--color-accent)]" />
                </Field>
                <Field label="Opacity" hint={`${Math.round(opacity * 100)}%`}>
                  <input type="range" min={0.05} max={1} step={0.05} value={opacity} onChange={(e) => setOpacity(Number(e.target.value))} className="w-full accent-[var(--color-accent)]" />
                </Field>
                <Field label="Rotation" hint={`${rotation}°`}>
                  <input type="range" min={0} max={90} step={5} value={rotation} onChange={(e) => setRotation(Number(e.target.value))} className="w-full accent-[var(--color-accent)]" />
                </Field>
                <Field label="Colour">
                  <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-10 w-full rounded-md border border-line-strong bg-paper px-1" />
                </Field>
              </div>

              <Field label="Pages">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={allPages} onChange={(e) => setAllPages(e.target.checked)} />
                  Apply to all {pageCount} pages
                </label>
              </Field>
              {!allPages ? (
                <>
                  <Field label="Page range" htmlFor="wm-range" hint="Ranges like 1-3, 5.">
                    <input
                      id="wm-range"
                      value={range}
                      onChange={(e) => {
                        setRange(e.target.value)
                        const parsed = parsePageRanges(e.target.value, pageCount)
                        setRangeError(parsed.error ?? null)
                      }}
                      className="h-10 w-full rounded-md border border-line-strong bg-paper px-3 font-mono text-sm outline-none focus:border-accent"
                      placeholder={`1-${pageCount}`}
                    />
                  </Field>
                  {rangeError ? <Alert tone="error">{rangeError}</Alert> : null}
                </>
              ) : null}

              <div className="flex flex-wrap items-center gap-3">
                <Button onClick={run} disabled={task.status === 'running'}>
                  {task.status === 'running' ? 'Applying…' : 'Add watermark'}
                </Button>
              </div>

              {task.status === 'running' ? (
                <ProgressBar value={task.progress * 100} label={task.message || 'Working…'} />
              ) : null}
              {task.error ? <Alert tone="error">{task.error}</Alert> : null}

              {result ? (
                <div className="rounded-lg border border-success/25 bg-success-soft p-4">
                  <p className="font-medium text-success">Watermark applied</p>
                  <p className="mt-1 text-sm text-ink-soft">Output is {formatBytes(result.length)}.</p>
                  <div className="mt-3">
                    <FilenameField
                      base={out.base}
                      extension="pdf"
                      onChange={out.setBase}
                      id="watermark-output-name"
                    />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-3">
                    <Button onClick={() => downloadBytes(result, out.fileName)}>
                      <Download className="h-4 w-4" /> Download PDF
                    </Button>
                    <Button variant="secondary" onClick={() => { setResult(null); task.reset() }}>
                      <RotateCcw className="h-4 w-4" /> Adjust and redo
                    </Button>
                  </div>
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

            <aside className="lg:sticky lg:top-20 lg:self-start">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">
                Preview
              </p>
              <div className="relative mx-auto flex h-48 w-36 items-center justify-center overflow-hidden rounded border border-line bg-white shadow-sm">
                <span
                  className="select-none whitespace-nowrap font-semibold"
                  style={{
                    color,
                    opacity,
                    transform: `rotate(-${rotation}deg)`,
                    fontSize: `${Math.min(fontSize, 34)}px`,
                  }}
                >
                  {text || 'WATERMARK'}
                </span>
              </div>
            </aside>
          </div>
        ) : null}
      </div>
    </ToolShell>
  )
}
