import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Download, RotateCcw } from 'lucide-react'
import { ToolShell } from '@/components/tools/ToolShell'
import { FileDropzone } from '@/components/tools/FileDropzone'
import { FilenameField } from '@/components/tools/FilenameField'
import { PageGrid } from '@/components/tools/PageGrid'
import { CropCanvas } from '@/components/tools/CropCanvas'
import { usePdfPagePreview } from '@/components/tools/usePdfPagePreview'
import { useAsyncTask } from '@/components/tools/useAsyncTask'
import { useSinglePdfFile } from '@/components/tools/useSinglePdfFile'
import { usePdfSelection } from '@/components/tools/usePdfSelection'
import { useOutputFileName } from '@/components/tools/useOutputFileName'
import { Alert, Button, Field, ProgressBar, Spinner } from '@/components/ui'
import { getTool } from '@/content/registry'
import { downloadBytes, formatBytes, safeBaseName } from '@/lib/utils'
import { uniqueSorted } from '@/lib/pdf/range'
import type { CropMargins } from '@/lib/pdf/crop-selection'

const tool = getTool('crop-pdf')!

const MAX_PERCENT = 45
const MAX_FRACTION = MAX_PERCENT / 100

interface Margins {
  top: number
  right: number
  bottom: number
  left: number
}

const EMPTY: Margins = { top: 0, right: 0, bottom: 0, left: 0 }

function clampPercent(value: string): number {
  const n = Number(value)
  if (!Number.isFinite(n) || n < 0) return 0
  return Math.min(MAX_PERCENT, n)
}

function toPercent(fraction: number): number {
  return Math.round(fraction * 1000) / 10
}

export default function CropPdf() {
  const { file, pageCount, loading, error, select, clear } = useSinglePdfFile()
  const selection = usePdfSelection(pageCount)
  const [margins, setMargins] = useState<Margins>(EMPTY)
  const [allPages, setAllPages] = useState(true)
  const [activePage, setActivePage] = useState(1)
  const [result, setResult] = useState<Uint8Array | null>(null)
  const task = useAsyncTask()
  const out = useOutputFileName(file ? `${safeBaseName(file.name)}-cropped` : 'cropped', 'pdf')
  const previewState = usePdfPagePreview(file, activePage)

  useEffect(() => {
    selection.clear()
    setMargins(EMPTY)
    setAllPages(true)
    setActivePage(1)
    setResult(null)
    task.reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file])

  const totalMargin = margins.top + margins.bottom + margins.left + margins.right

  const run = () =>
    task.run(async ({ onProgress }) => {
      if (!file) return
      if (totalMargin <= 0) {
        throw new Error('Set at least one margin to crop this PDF.')
      }
      if (!allPages && selection.selected.size === 0) {
        throw new Error('Select at least one page to crop, or choose “All pages”.')
      }
      const { cropPages } = await import('@/lib/pdf/operations')
      const bytes = new Uint8Array(await file.arrayBuffer())
      setResult(
        await cropPages(
          bytes,
          {
            top: margins.top / 100,
            right: margins.right / 100,
            bottom: margins.bottom / 100,
            left: margins.left / 100,
          },
          allPages ? undefined : uniqueSorted([...selection.selected]),
          onProgress,
        ),
      )
    })

  const setMargin = (edge: keyof Margins, value: string) =>
    setMargins((prev) => ({ ...prev, [edge]: clampPercent(value) }))

  const onCanvasMargins = (fractions: CropMargins) =>
    setMargins({
      top: toPercent(fractions.top),
      right: toPercent(fractions.right),
      bottom: toPercent(fractions.bottom),
      left: toPercent(fractions.left),
    })

  const resetCrop = () => setMargins(EMPTY)

  return (
    <ToolShell tool={tool}>
      <div className="space-y-6">
        <FileDropzone accept={tool.accept} onFiles={select} title="Add a PDF to crop" />

        {loading ? (
          <p className="inline-flex items-center gap-2 text-sm text-ink-muted">
            <Spinner /> Reading document…
          </p>
        ) : null}
        {error ? <Alert tone="error">{error}</Alert> : null}

        {file && pageCount > 0 ? (
          <div className="space-y-5">
            <div className="space-y-3 rounded-lg border border-line bg-surface p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium">Drag the crop box, or type margins below</p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="subtle"
                    size="sm"
                    type="button"
                    disabled={activePage <= 1}
                    onClick={() => setActivePage((p) => Math.max(1, p - 1))}
                    aria-label="Previous page preview"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-ink-soft">
                    Page {activePage} of {pageCount}
                  </span>
                  <Button
                    variant="subtle"
                    size="sm"
                    type="button"
                    disabled={activePage >= pageCount}
                    onClick={() => setActivePage((p) => Math.min(pageCount, p + 1))}
                    aria-label="Next page preview"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" type="button" onClick={resetCrop}>
                    <RotateCcw className="h-4 w-4" /> Reset
                  </Button>
                </div>
              </div>

              {previewState.status === 'running' ? (
                <p className="inline-flex items-center gap-2 text-sm text-ink-muted">
                  <Spinner /> Rendering page preview…
                </p>
              ) : null}
              {previewState.error ? <Alert tone="error">{previewState.error}</Alert> : null}
              {previewState.preview ? (
                <div className="overflow-x-auto">
                  <CropCanvas
                    preview={previewState.preview}
                    margins={{
                      top: margins.top / 100,
                      right: margins.right / 100,
                      bottom: margins.bottom / 100,
                      left: margins.left / 100,
                    }}
                    maxMargin={MAX_FRACTION}
                    onChange={onCanvasMargins}
                  />
                </div>
              ) : null}
              <p className="text-xs text-ink-muted">
                The same margins are applied to every cropped page, keeping each page&apos;s
                proportions intact.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {(['top', 'right', 'bottom', 'left'] as const).map((edge) => (
                <Field key={edge} label={`${edge[0].toUpperCase()}${edge.slice(1)} %`} htmlFor={`crop-${edge}`}>
                  <input
                    id={`crop-${edge}`}
                    type="number"
                    min={0}
                    max={MAX_PERCENT}
                    step={0.5}
                    value={margins[edge]}
                    onChange={(e) => setMargin(edge, e.target.value)}
                    className="h-10 w-full rounded-md border border-line-strong bg-paper px-3 text-sm outline-none focus:border-accent"
                  />
                </Field>
              ))}
            </div>
            <p className="text-xs text-ink-muted">
              Margins are a percentage of each page, trimmed from that edge. Values up to{' '}
              {MAX_PERCENT}% per edge.
            </p>

            <Field label="Which pages">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={allPages}
                  onChange={(e) => setAllPages(e.target.checked)}
                />
                Apply to all {pageCount} pages
              </label>
            </Field>

            {!allPages ? (
              <>
                <Field
                  label="Pages to crop"
                  htmlFor="crop-ranges"
                  hint="Ranges like 1-3, 5. Or click previews below."
                >
                  <input
                    id="crop-ranges"
                    value={selection.rangeText}
                    onChange={(e) => selection.setFromText(e.target.value)}
                    placeholder="e.g. 1-3, 5"
                    className="h-10 w-full rounded-md border border-line-strong bg-paper px-3 font-mono text-sm outline-none focus:border-accent"
                  />
                </Field>
                {selection.rangeError ? <Alert tone="error">{selection.rangeError}</Alert> : null}
              </>
            ) : null}

            <PageGrid
              file={file}
              selected={allPages ? undefined : selection.selected}
              onToggle={allPages ? undefined : selection.toggle}
              label="Page previews"
            />

            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={run} disabled={task.status === 'running' || totalMargin <= 0}>
                {task.status === 'running' ? 'Cropping…' : 'Crop PDF'}
              </Button>
              {task.status === 'running' ? (
                <Button variant="ghost" onClick={task.cancel}>
                  Cancel
                </Button>
              ) : null}
            </div>

            {task.status === 'running' ? (
              <ProgressBar value={task.progress * 100} label={task.message || 'Cropping…'} />
            ) : null}
            {task.error ? <Alert tone="error">{task.error}</Alert> : null}

            {result ? (
              <div className="rounded-lg border border-success/25 bg-success-soft p-4">
                <p className="font-medium text-success">Crop applied</p>
                <p className="mt-1 text-sm text-ink-soft">Output is {formatBytes(result.length)}.</p>
                <div className="mt-3">
                  <FilenameField
                    base={out.base}
                    extension="pdf"
                    onChange={out.setBase}
                    id="crop-output-name"
                  />
                </div>
                <div className="mt-3 flex flex-wrap gap-3">
                  <Button onClick={() => downloadBytes(result, out.fileName)}>
                    <Download className="h-4 w-4" /> Download PDF
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setResult(null)
                      task.reset()
                    }}
                  >
                    <RotateCcw className="h-4 w-4" /> Crop again
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
        ) : null}
      </div>
    </ToolShell>
  )
}