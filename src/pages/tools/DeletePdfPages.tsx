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

const tool = getTool('delete-pdf-pages')!

export default function DeletePdfPages() {
  const { file, pageCount, loading, error, select, clear } = useSinglePdfFile()
  const selection = usePdfSelection(pageCount)
  const [result, setResult] = useState<Uint8Array | null>(null)
  const task = useAsyncTask()

  useEffect(() => {
    selection.clear()
    setResult(null)
    task.reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file])

  const deletingAll = pageCount > 0 && selection.selected.size >= pageCount

  const run = () =>
    task.run(async ({ onProgress }) => {
      if (!file) return
      if (selection.selected.size === 0) throw new Error('Select at least one page to delete.')
      if (deletingAll) throw new Error('You cannot delete every page — keep at least one.')
      const { deletePages } = await import('@/lib/pdf/operations')
      const bytes = new Uint8Array(await file.arrayBuffer())
      setResult(await deletePages(bytes, uniqueSorted([...selection.selected]), onProgress))
    })

  return (
    <ToolShell tool={tool}>
      <div className="space-y-6">
        <FileDropzone accept={tool.accept} onFiles={select} title="Add a PDF to remove pages from" />

        {loading ? (
          <p className="inline-flex items-center gap-2 text-sm text-ink-muted">
            <Spinner /> Reading document…
          </p>
        ) : null}
        {error ? <Alert tone="error">{error}</Alert> : null}

        {file && pageCount > 0 ? (
          <div className="space-y-5">
            <Field
              label="Pages to delete"
              htmlFor="delete-ranges"
              hint="Use ranges like 2, 5-6. Click previews below to toggle pages too."
            >
              <input
                id="delete-ranges"
                value={selection.rangeText}
                onChange={(e) => selection.setFromText(e.target.value)}
                placeholder="e.g. 2, 5-6"
                className="h-10 w-full rounded-md border border-line-strong bg-paper px-3 font-mono text-sm outline-none focus:border-accent"
              />
            </Field>
            {selection.rangeError ? <Alert tone="error">{selection.rangeError}</Alert> : null}

            <PageGrid
              file={file}
              selected={selection.selected}
              onToggle={selection.toggle}
              tone="remove"
              label="Select pages to delete"
            />

            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm text-ink-soft">
                {selection.selected.size} of {pageCount} pages marked for removal
              </span>
              <Button
                onClick={run}
                disabled={selection.selected.size === 0 || deletingAll || task.status === 'running'}
              >
                {task.status === 'running' ? 'Deleting…' : 'Delete pages'}
              </Button>
              <Button variant="ghost" onClick={selection.clear} disabled={selection.selected.size === 0}>
                Clear selection
              </Button>
            </div>

            {deletingAll ? (
              <Alert tone="warn">You cannot delete every page — keep at least one.</Alert>
            ) : null}
            {task.status === 'running' ? (
              <ProgressBar value={task.progress * 100} label={task.message || 'Working…'} />
            ) : null}
            {task.error ? <Alert tone="error">{task.error}</Alert> : null}

            {result ? (
              <div className="rounded-lg border border-success/25 bg-success-soft p-4">
                <p className="font-medium text-success">Pages removed</p>
                <p className="mt-1 text-sm text-ink-soft">
                  {pageCount - selection.selected.size} page
                  {pageCount - selection.selected.size === 1 ? '' : 's'} remain ·{' '}
                  {formatBytes(result.length)}
                </p>
                <div className="mt-3 flex flex-wrap gap-3">
                  <Button onClick={() => downloadBytes(result, `${safeBaseName(file.name)}-edited.pdf`)}>
                    <Download className="h-4 w-4" /> Download PDF
                  </Button>
                  <Button variant="secondary" onClick={() => { setResult(null); task.reset() }}>
                    <RotateCcw className="h-4 w-4" /> Delete more pages
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
