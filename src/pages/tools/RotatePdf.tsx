import { useEffect, useState } from 'react'
import { Download, RotateCcw } from 'lucide-react'
import { ToolShell } from '@/components/tools/ToolShell'
import { FileDropzone } from '@/components/tools/FileDropzone'
import { PageGrid } from '@/components/tools/PageGrid'
import { useAsyncTask } from '@/components/tools/useAsyncTask'
import { useSinglePdfFile } from '@/components/tools/useSinglePdfFile'
import { usePdfSelection } from '@/components/tools/usePdfSelection'
import { Alert, Button, Field, ProgressBar, Spinner } from '@/components/ui'
import { getTool } from '@/content/registry'
import { downloadBytes, formatBytes, safeBaseName } from '@/lib/utils'
import { uniqueSorted } from '@/lib/pdf/range'

const tool = getTool('rotate-pdf')!
const ANGLES = [90, 180, 270] as const

export default function RotatePdf() {
  const { file, pageCount, loading, error, select, clear } = useSinglePdfFile()
  const selection = usePdfSelection(pageCount)
  const [angle, setAngle] = useState<(typeof ANGLES)[number]>(90)
  const [allPages, setAllPages] = useState(true)
  const [result, setResult] = useState<Uint8Array | null>(null)
  const task = useAsyncTask()

  useEffect(() => {
    selection.clear()
    setResult(null)
    task.reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file])

  const run = () =>
    task.run(async ({ onProgress }) => {
      if (!file) return
      if (!allPages && selection.selected.size === 0) {
        throw new Error('Select at least one page to rotate, or choose “All pages”.')
      }
      const { rotatePages } = await import('@/lib/pdf/operations')
      const bytes = new Uint8Array(await file.arrayBuffer())
      setResult(
        await rotatePages(
          bytes,
          { angle, pages: allPages ? undefined : uniqueSorted([...selection.selected]) },
          onProgress,
        ),
      )
    })

  return (
    <ToolShell tool={tool}>
      <div className="space-y-6">
        <FileDropzone accept={tool.accept} onFiles={select} title="Add a PDF to rotate" />

        {loading ? (
          <p className="inline-flex items-center gap-2 text-sm text-ink-muted">
            <Spinner /> Reading document…
          </p>
        ) : null}
        {error ? <Alert tone="error">{error}</Alert> : null}

        {file && pageCount > 0 ? (
          <div className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Rotation angle" hint="Rotation is clockwise.">
                <div className="flex gap-2">
                  {ANGLES.map((a) => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => setAngle(a)}
                      aria-pressed={angle === a}
                      className={`flex-1 rounded-md border px-3 py-2 text-sm ${
                        angle === a
                          ? 'border-accent bg-accent-soft text-accent-strong'
                          : 'border-line bg-surface text-ink-soft hover:border-line-strong'
                      }`}
                    >
                      {a}°
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="Which pages">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={allPages} onChange={(e) => setAllPages(e.target.checked)} />
                  Apply to all {pageCount} pages
                </label>
              </Field>
            </div>

            {!allPages ? (
              <>
                <Field
                  label="Pages to rotate"
                  htmlFor="rotate-ranges"
                  hint="Ranges like 1-3, 5. Or click previews below."
                >
                  <input
                    id="rotate-ranges"
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
              previewRotation={angle}
              label="Page previews with rotation applied"
            />

            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={run} disabled={task.status === 'running'}>
                {task.status === 'running' ? 'Rotating…' : 'Rotate PDF'}
              </Button>
              {task.status === 'running' ? <Button variant="ghost" onClick={task.cancel}>Cancel</Button> : null}
            </div>

            {task.status === 'running' ? (
              <ProgressBar value={task.progress * 100} label={task.message || 'Rotating…'} />
            ) : null}
            {task.error ? <Alert tone="error">{task.error}</Alert> : null}

            {result ? (
              <div className="rounded-lg border border-success/25 bg-success-soft p-4">
                <p className="font-medium text-success">Rotation applied</p>
                <p className="mt-1 text-sm text-ink-soft">Output is {formatBytes(result.length)}.</p>
                <div className="mt-3 flex flex-wrap gap-3">
                  <Button onClick={() => downloadBytes(result, `${safeBaseName(file.name)}-rotated.pdf`)}>
                    <Download className="h-4 w-4" /> Download PDF
                  </Button>
                  <Button variant="secondary" onClick={() => { setResult(null); task.reset() }}>
                    <RotateCcw className="h-4 w-4" /> Rotate again
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
