import { useEffect, useState } from 'react'
import { Download, RotateCcw, Shuffle } from 'lucide-react'
import { ToolShell } from '@/components/tools/ToolShell'
import { FileDropzone } from '@/components/tools/FileDropzone'
import { ReorderGrid } from '@/components/tools/ReorderGrid'
import { useAsyncTask } from '@/components/tools/useAsyncTask'
import { useSinglePdfFile } from '@/components/tools/useSinglePdfFile'
import { Alert, Button, ProgressBar, Spinner } from '@/components/ui'
import { getTool } from '@/content/registry'
import { downloadBytes, formatBytes, safeBaseName } from '@/lib/utils'

const tool = getTool('reorder-pdf-pages')!

export default function ReorderPdfPages() {
  const { file, pageCount, loading, error, select, clear } = useSinglePdfFile()
  const [order, setOrder] = useState<number[]>([])
  const [result, setResult] = useState<Uint8Array | null>(null)
  const task = useAsyncTask()

  useEffect(() => {
    setOrder(file && pageCount > 0 ? Array.from({ length: pageCount }, (_, i) => i + 1) : [])
    setResult(null)
    task.reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file, pageCount])

  const changed = order.some((page, index) => page !== index + 1)

  const run = () =>
    task.run(async () => {
      if (!file) return
      const { reorderPages } = await import('@/lib/pdf/operations')
      const bytes = new Uint8Array(await file.arrayBuffer())
      setResult(await reorderPages(bytes, order))
    })

  return (
    <ToolShell tool={tool}>
      <div className="space-y-6">
        <FileDropzone accept={tool.accept} onFiles={select} title="Add a PDF to reorder" />

        {loading ? (
          <p className="inline-flex items-center gap-2 text-sm text-ink-muted">
            <Spinner /> Reading document…
          </p>
        ) : null}
        {error ? <Alert tone="error">{error}</Alert> : null}

        {file && pageCount > 0 ? (
          <div className="space-y-5">
            <p className="text-sm text-ink-soft">
              Drag pages to rearrange, or use the arrow buttons on each page — a keyboard-friendly
              alternative to dragging.
            </p>

            <ReorderGrid file={file} order={order} onReorder={setOrder} />

            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={run} disabled={task.status === 'running'}>
                {task.status === 'running' ? 'Applying…' : 'Apply new order'}
              </Button>
              <Button
                variant="secondary"
                onClick={() => setOrder(Array.from({ length: pageCount }, (_, i) => i + 1))}
                disabled={!changed}
              >
                <Shuffle className="h-4 w-4" /> Reset to original
              </Button>
            </div>

            {task.status === 'running' ? (
              <ProgressBar value={task.progress * 100} label={task.message || 'Rebuilding document…'} />
            ) : null}
            {task.error ? <Alert tone="error">{task.error}</Alert> : null}

            {result ? (
              <div className="rounded-lg border border-success/25 bg-success-soft p-4">
                <p className="font-medium text-success">New order applied</p>
                <p className="mt-1 text-sm text-ink-soft">Output is {formatBytes(result.length)}.</p>
                <div className="mt-3 flex flex-wrap gap-3">
                  <Button onClick={() => downloadBytes(result, `${safeBaseName(file.name)}-reordered.pdf`)}>
                    <Download className="h-4 w-4" /> Download PDF
                  </Button>
                  <Button variant="secondary" onClick={() => { setResult(null); task.reset() }}>
                    <RotateCcw className="h-4 w-4" /> Keep editing
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
