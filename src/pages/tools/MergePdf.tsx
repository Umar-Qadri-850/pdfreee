import { useState } from 'react'
import { Download, RotateCcw } from 'lucide-react'
import { ToolShell } from '@/components/tools/ToolShell'
import { FileDropzone } from '@/components/tools/FileDropzone'
import { OrderedFileList } from '@/components/tools/OrderedFileList'
import { useAsyncTask } from '@/components/tools/useAsyncTask'
import { Alert, Button, ProgressBar } from '@/components/ui'
import { getTool } from '@/content/registry'
import { validatePdfFile, friendlyMessage, FILE_LIMITS } from '@/lib/pdf/errors'
import { downloadBytes, formatBytes, safeBaseName } from '@/lib/utils'

const tool = getTool('merge-pdf')!

interface Result {
  bytes: Uint8Array
  pages: number
}

export default function MergePdf() {
  const [files, setFiles] = useState<File[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const [result, setResult] = useState<Result | null>(null)
  const task = useAsyncTask()

  const addFiles = async (incoming: File[]) => {
    const accepted: File[] = []
    const problems: string[] = []
    for (const file of incoming) {
      try {
        await validatePdfFile(file)
        accepted.push(file)
      } catch (error) {
        problems.push(friendlyMessage(error))
      }
    }
    setErrors(problems)
    if (accepted.length) {
      setFiles((prev) => [...prev, ...accepted])
      setResult(null)
    }
  }

  const reorder = (from: number, to: number) => {
    setFiles((prev) => {
      if (to < 0 || to >= prev.length) return prev
      const next = [...prev]
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved)
      return next
    })
    setResult(null)
  }

  const run = () =>
    task.run(async ({ onProgress }) => {
      const { mergePdfs } = await import('@/lib/pdf/operations')
      const bytes = await mergePdfs(files, onProgress)
      const out = new Uint8Array(bytes.length)
      out.set(bytes)
      setResult({ bytes: out, pages: 0 })
    })

  const totalSize = files.reduce((sum, f) => sum + f.size, 0)

  return (
    <ToolShell tool={tool}>
      <div className="space-y-6">
        <FileDropzone
          accept={tool.accept}
          multiple
          onFiles={addFiles}
          hint="Add two or more PDF files. Each must be an unencrypted PDF."
          title="Add PDF files"
        />

        {errors.length > 0 ? (
          <Alert tone="error" title="Some files were skipped">
            <ul className="list-disc pl-4">
              {errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          </Alert>
        ) : null}

        {files.length > 0 ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-ink-soft">
                {files.length} file{files.length === 1 ? '' : 's'} · {formatBytes(totalSize)} total
              </p>
              <button
                type="button"
                onClick={() => {
                  setFiles([])
                  setResult(null)
                  task.reset()
                }}
                className="text-sm text-ink-muted underline hover:text-ink"
              >
                Clear all
              </button>
            </div>

            <OrderedFileList
              files={files}
              onReorder={reorder}
              onRemove={(i) => {
                setFiles((prev) => prev.filter((_, idx) => idx !== i))
                setResult(null)
              }}
            />

            {totalSize > FILE_LIMITS.warnPdfBytes ? (
              <Alert tone="warn">
                These files are large. Merging relies on your device’s memory and may take a while.
              </Alert>
            ) : null}

            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={run} disabled={files.length < 2 || task.status === 'running'}>
                {task.status === 'running' ? 'Merging…' : 'Merge PDF'}
              </Button>
              {task.status === 'running' ? <Button variant="ghost" onClick={task.cancel}>Cancel</Button> : null}
            </div>

            {task.status === 'running' ? (
              <ProgressBar value={task.progress * 100} label={task.message || 'Merging files…'} />
            ) : null}

            {task.error ? <Alert tone="error">{task.error}</Alert> : null}

            {result ? (
              <div className="rounded-lg border border-success/25 bg-success-soft p-4">
                <p className="font-medium text-success">Merged successfully</p>
                <p className="mt-1 text-sm text-ink-soft">
                  Your combined PDF is {formatBytes(result.bytes.length)} and ready to download.
                </p>
                <div className="mt-3 flex flex-wrap gap-3">
                  <Button
                    onClick={() =>
                      downloadBytes(result.bytes, `${safeBaseName(files[0]?.name ?? 'merged')}-merged.pdf`)
                    }
                  >
                    <Download className="h-4 w-4" /> Download PDF
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setResult(null)
                      task.reset()
                    }}
                  >
                    <RotateCcw className="h-4 w-4" /> Merge again
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </ToolShell>
  )
}
