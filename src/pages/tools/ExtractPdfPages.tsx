import { useEffect, useState } from 'react'
import { Download, RotateCcw } from 'lucide-react'
import { ToolShell } from '@/components/tools/ToolShell'
import { FileDropzone } from '@/components/tools/FileDropzone'
import { FilenameField } from '@/components/tools/FilenameField'
import { PageGrid } from '@/components/tools/PageGrid'
import { useAsyncTask } from '@/components/tools/useAsyncTask'
import { useSinglePdfFile } from '@/components/tools/useSinglePdfFile'
import { usePdfSelection } from '@/components/tools/usePdfSelection'
import { useOutputFileName } from '@/components/tools/useOutputFileName'
import { Alert, Button, Field, Spinner } from '@/components/ui'
import { getTool } from '@/content/registry'
import { downloadBytes, formatBytes, safeBaseName } from '@/lib/utils'
import { uniqueSorted } from '@/lib/pdf/range'

const tool = getTool('extract-pdf-pages')!

export default function ExtractPdfPages() {
  const { file, pageCount, loading, error, select, clear } = useSinglePdfFile()
  const selection = usePdfSelection(pageCount)
  const [result, setResult] = useState<Uint8Array | null>(null)
  const task = useAsyncTask()
  const out = useOutputFileName(file ? `${safeBaseName(file.name)}-extracted` : 'extracted', 'pdf')

  useEffect(() => {
    selection.clear()
    setResult(null)
    task.reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file])

  const run = () =>
    task.run(async () => {
      if (!file) return
      const pages = uniqueSorted([...selection.selected])
      if (pages.length === 0) throw new Error('Select at least one page to extract.')
      const { extractPages } = await import('@/lib/pdf/operations')
      const bytes = new Uint8Array(await file.arrayBuffer())
      setResult(await extractPages(bytes, pages))
    })

  return (
    <ToolShell tool={tool}>
      <div className="space-y-6">
        <FileDropzone accept={tool.accept} onFiles={select} title="Add a PDF to extract from" />

        {loading ? (
          <p className="inline-flex items-center gap-2 text-sm text-ink-muted">
            <Spinner /> Reading document…
          </p>
        ) : null}
        {error ? <Alert tone="error">{error}</Alert> : null}

        {file && pageCount > 0 ? (
          <div className="space-y-5">
            <Field
              label="Pages to extract"
              htmlFor="extract-ranges"
              hint="Use ranges like 1-3, 7, 12-15. Click previews below as an alternative."
            >
              <input
                id="extract-ranges"
                value={selection.rangeText}
                onChange={(e) => selection.setFromText(e.target.value)}
                placeholder={`e.g. 1-3, ${Math.min(7, pageCount)}`}
                className="h-10 w-full rounded-md border border-line-strong bg-paper px-3 font-mono text-sm outline-none focus:border-accent"
              />
            </Field>
            {selection.rangeError ? <Alert tone="error">{selection.rangeError}</Alert> : null}

            <PageGrid
              file={file}
              selected={selection.selected}
              onToggle={selection.toggle}
              label="Select pages to extract"
            />

            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm text-ink-soft">
                {selection.selected.size} page{selection.selected.size === 1 ? '' : 's'} selected
              </span>
              <Button
                onClick={run}
                disabled={selection.selected.size === 0 || task.status === 'running'}
              >
                {task.status === 'running' ? 'Extracting…' : 'Extract pages'}
              </Button>
              <Button variant="ghost" onClick={selection.clear} disabled={selection.selected.size === 0}>
                Clear selection
              </Button>
            </div>

            {task.error ? <Alert tone="error">{task.error}</Alert> : null}

            {result ? (
              <div className="rounded-lg border border-success/25 bg-success-soft p-4">
                <p className="font-medium text-success">Extracted successfully</p>
                <p className="mt-1 text-sm text-ink-soft">
                  New PDF is {formatBytes(result.length)}.
                </p>
                <div className="mt-3">
                  <FilenameField
                    base={out.base}
                    extension="pdf"
                    onChange={out.setBase}
                    id="extract-output-name"
                  />
                </div>
                <div className="mt-3 flex flex-wrap gap-3">
                  <Button onClick={() => downloadBytes(result, out.fileName)}>
                    <Download className="h-4 w-4" /> Download PDF
                  </Button>
                  <Button variant="secondary" onClick={() => { setResult(null); task.reset() }}>
                    <RotateCcw className="h-4 w-4" /> Do another extraction
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
