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
import { downloadBytes, formatBytes, safeBaseName, cn } from '@/lib/utils'
import type { NumberPosition } from '@/lib/pdf/overlay'

const tool = getTool('add-page-numbers')!

const POSITIONS: { id: NumberPosition; label: string }[] = [
  { id: 'top-left', label: 'Top left' },
  { id: 'top-center', label: 'Top center' },
  { id: 'top-right', label: 'Top right' },
  { id: 'bottom-left', label: 'Bottom left' },
  { id: 'bottom-center', label: 'Bottom center' },
  { id: 'bottom-right', label: 'Bottom right' },
]

function PreviewMock({ position, sample }: { position: NumberPosition; sample: string }) {
  const top = position.startsWith('top')
  const left = position.endsWith('left')
  const right = position.endsWith('right')
  return (
    <div className="relative mx-auto h-40 w-28 rounded border border-line bg-white shadow-sm" aria-hidden="true">
      <div className="absolute inset-x-3 top-6 space-y-1.5">
        <div className="h-1.5 w-4/5 rounded-full bg-line" />
        <div className="h-1.5 w-full rounded-full bg-line" />
        <div className="h-1.5 w-3/5 rounded-full bg-line" />
      </div>
      <span
        className={cn(
          'absolute text-[10px] font-medium text-accent',
          top ? 'top-2' : 'bottom-2',
          left && 'left-2',
          right && 'right-2',
          !left && !right && 'left-1/2 -translate-x-1/2',
        )}
      >
        {sample}
      </span>
    </div>
  )
}

export default function AddPageNumbers() {
  const { file, pageCount, loading, error, select, clear } = useSinglePdfFile()
  const [position, setPosition] = useState<NumberPosition>('bottom-center')
  const [startNumber, setStartNumber] = useState(1)
  const [startPage, setStartPage] = useState(1)
  const [format, setFormat] = useState<'n' | 'n-of-total' | 'page-n' | 'page-n-of-total'>('n')
  const [fontSize, setFontSize] = useState(12)
  const [margin, setMargin] = useState(36)
  const [result, setResult] = useState<Uint8Array | null>(null)
  const task = useAsyncTask()
  const out = useOutputFileName(file ? `${safeBaseName(file.name)}-numbered` : 'numbered', 'pdf')

  useEffect(() => {
    setResult(null)
    task.reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file])

  const sample =
    format === 'n'
      ? `${startNumber}`
      : format === 'n-of-total'
        ? `${startNumber} / ${pageCount || 'N'}`
        : format === 'page-n'
          ? `Page ${startNumber}`
          : `Page ${startNumber} of ${pageCount || 'N'}`

  const run = () =>
    task.run(async () => {
      if (!file) return
      const { addPageNumbers } = await import('@/lib/pdf/overlay')
      const bytes = new Uint8Array(await file.arrayBuffer())
      setResult(await addPageNumbers(bytes, { position, startNumber, startPage, format, fontSize, margin }))
    })

  return (
    <ToolShell tool={tool}>
      <div className="space-y-6">
        <FileDropzone accept={tool.accept} onFiles={select} title="Add a PDF to number" />

        {loading ? (
          <p className="inline-flex items-center gap-2 text-sm text-ink-muted">
            <Spinner /> Reading document…
          </p>
        ) : null}
        {error ? <Alert tone="error">{error}</Alert> : null}

        {file && pageCount > 0 ? (
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_12rem]">
            <div className="space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Position">
                  <select
                    value={position}
                    onChange={(e) => setPosition(e.target.value as NumberPosition)}
                    className="h-10 w-full rounded-md border border-line-strong bg-paper px-3 text-sm outline-none focus:border-accent"
                  >
                    {POSITIONS.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Format">
                  <select
                    value={format}
                    onChange={(e) => setFormat(e.target.value as typeof format)}
                    className="h-10 w-full rounded-md border border-line-strong bg-paper px-3 text-sm outline-none focus:border-accent"
                  >
                    <option value="n">1, 2, 3</option>
                    <option value="n-of-total">1 / N</option>
                    <option value="page-n">Page 1</option>
                    <option value="page-n-of-total">Page 1 of N</option>
                  </select>
                </Field>
                <Field label="Starting number">
                  <input
                    type="number"
                    min={0}
                    value={startNumber}
                    onChange={(e) => setStartNumber(Math.max(0, Number(e.target.value) || 0))}
                    className="h-10 w-full rounded-md border border-line-strong bg-paper px-3 text-sm outline-none focus:border-accent"
                  />
                </Field>
                <Field label="First page to number" hint={`Document has ${pageCount} pages.`}>
                  <input
                    type="number"
                    min={1}
                    max={pageCount}
                    value={startPage}
                    onChange={(e) => setStartPage(Math.min(pageCount, Math.max(1, Number(e.target.value) || 1)))}
                    className="h-10 w-full rounded-md border border-line-strong bg-paper px-3 text-sm outline-none focus:border-accent"
                  />
                </Field>
                <Field label="Font size" hint={`${fontSize} pt`}>
                  <input
                    type="range"
                    min={8}
                    max={24}
                    value={fontSize}
                    onChange={(e) => setFontSize(Number(e.target.value))}
                    className="w-full accent-[var(--color-accent)]"
                  />
                </Field>
                <Field label="Margin from edge" hint={`${margin} pt`}>
                  <input
                    type="range"
                    min={12}
                    max={72}
                    value={margin}
                    onChange={(e) => setMargin(Number(e.target.value))}
                    className="w-full accent-[var(--color-accent)]"
                  />
                </Field>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button onClick={run} disabled={task.status === 'running'}>
                  {task.status === 'running' ? 'Adding numbers…' : 'Add page numbers'}
                </Button>
              </div>

              {task.status === 'running' ? (
                <ProgressBar value={task.progress * 100} label={task.message || 'Working…'} />
              ) : null}
              {task.error ? <Alert tone="error">{task.error}</Alert> : null}

              {result ? (
                <div className="rounded-lg border border-success/25 bg-success-soft p-4">
                  <p className="font-medium text-success">Page numbers added</p>
                  <p className="mt-1 text-sm text-ink-soft">Output is {formatBytes(result.length)}.</p>
                  <div className="mt-3">
                    <FilenameField
                      base={out.base}
                      extension="pdf"
                      onChange={out.setBase}
                      id="numbers-output-name"
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
                Position preview
              </p>
              <PreviewMock position={position} sample={sample} />
              <p className="mt-2 text-center text-xs text-ink-muted">{sample}</p>
            </aside>
          </div>
        ) : null}
      </div>
    </ToolShell>
  )
}
