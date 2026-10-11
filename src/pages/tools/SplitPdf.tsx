import { useState } from 'react'
import { Download, RotateCcw } from 'lucide-react'
import { ToolShell } from '@/components/tools/ToolShell'
import { FileDropzone } from '@/components/tools/FileDropzone'
import { useAsyncTask } from '@/components/tools/useAsyncTask'
import { Alert, Button, Field, ProgressBar } from '@/components/ui'
import { getTool } from '@/content/registry'
import { validatePdfFile, friendlyMessage } from '@/lib/pdf/errors'
import { parsePageRanges } from '@/lib/pdf/range'
import { downloadBytes, downloadBlob, formatBytes, safeBaseName } from '@/lib/utils'

const tool = getTool('split-pdf')!

type Mode = 'each' | 'ranges'

export default function SplitPdf() {
  const [file, setFile] = useState<File | null>(null)
  const [pageCount, setPageCount] = useState(0)
  const [mode, setMode] = useState<Mode>('each')
  const [ranges, setRanges] = useState('')
  const [errors, setErrors] = useState<string[]>([])
  const [result, setResult] = useState<{ parts: { name: string; bytes: Uint8Array }[] } | null>(null)
  const task = useAsyncTask()

  const selectFile = async (incoming: File[]) => {
    setErrors([])
    setResult(null)
    setPageCount(0)
    const next = incoming[0]
    try {
      await validatePdfFile(next)
      const { getPageCount } = await import('@/lib/pdf/operations')
      const count = await getPageCount(new Uint8Array(await next.arrayBuffer()))
      setFile(next)
      setPageCount(count)
    } catch (error) {
      setFile(null)
      setErrors([friendlyMessage(error)])
    }
  }

  const computeSelections = (): number[][] | { error: string } => {
    if (mode === 'each') {
      return Array.from({ length: pageCount }, (_, i) => [i + 1])
    }
    const lines = ranges
      .split(/\n|;/)
      .map((l) => l.trim())
      .filter(Boolean)
    if (lines.length === 0) return { error: 'Enter at least one range, one per output file.' }
    const selections: number[][] = []
    for (const line of lines) {
      const parsed = parsePageRanges(line, pageCount)
      if (parsed.error) return { error: parsed.error }
      selections.push(parsed.pages)
    }
    return selections
  }

  const run = () =>
    task.run(async ({ onProgress }) => {
      if (!file) return
      const selections = computeSelections()
      if ('error' in selections) throw new Error(selections.error)
      const { splitPdf } = await import('@/lib/pdf/operations')
      const bytes = new Uint8Array(await file.arrayBuffer())
      const parts = await splitPdf(bytes, selections, safeBaseName(file.name), onProgress)
      setResult({ parts })
    })

  return (
    <ToolShell tool={tool}>
      <div className="space-y-6">
        <FileDropzone
          accept={tool.accept}
          onFiles={selectFile}
          hint="Add one PDF. Password-protected files must be unlocked first."
          title="Add a PDF to split"
        />

        {errors.length > 0 ? (
          <Alert tone="error">
            <ul className="list-disc pl-4">
              {errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          </Alert>
        ) : null}

        {file && pageCount > 0 ? (
          <div className="space-y-5">
            <p className="text-sm text-ink-soft">
              <span className="font-medium text-ink">{file.name}</span> · {pageCount} page
              {pageCount === 1 ? '' : 's'} · {formatBytes(file.size)}
            </p>

            <fieldset className="space-y-3">
              <legend className="text-sm font-medium">How should we split it?</legend>
              <label className="flex items-start gap-3 rounded-md border border-line bg-surface p-3">
                <input
                  type="radio"
                  name="split-mode"
                  checked={mode === 'each'}
                  onChange={() => setMode('each')}
                  className="mt-1"
                />
                <span>
                  <span className="block text-sm font-medium">Every page separately</span>
                  <span className="block text-xs text-ink-muted">
                    Creates {pageCount} individual PDF file{pageCount === 1 ? '' : 's'}.
                  </span>
                </span>
              </label>
              <label className="flex items-start gap-3 rounded-md border border-line bg-surface p-3">
                <input
                  type="radio"
                  name="split-mode"
                  checked={mode === 'ranges'}
                  onChange={() => setMode('ranges')}
                  className="mt-1"
                />
                <span className="flex-1">
                  <span className="block text-sm font-medium">Custom ranges</span>
                  <span className="block text-xs text-ink-muted">One range per output file.</span>
                </span>
              </label>
            </fieldset>

            {mode === 'ranges' ? (
              <Field
                label="Ranges"
                htmlFor="split-ranges"
                hint="One range group per line, e.g. 1-3 then 4-6. Commas join pages within a group."
              >
                <textarea
                  id="split-ranges"
                  value={ranges}
                  onChange={(e) => setRanges(e.target.value)}
                  rows={4}
                  placeholder={`1-3\n4-6\n7-${pageCount}`}
                  className="w-full rounded-md border border-line-strong bg-paper px-3 py-2 font-mono text-sm outline-none focus:border-accent"
                />
              </Field>
            ) : null}

            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={run} disabled={task.status === 'running'}>
                {task.status === 'running' ? 'Splitting…' : 'Split PDF'}
              </Button>
              {task.status === 'running' ? <Button variant="ghost" onClick={task.cancel}>Cancel</Button> : null}
            </div>

            {task.status === 'running' ? (
              <ProgressBar value={task.progress * 100} label={task.message || 'Splitting…'} />
            ) : null}
            {task.error ? <Alert tone="error">{task.error}</Alert> : null}

            {result ? (
              <div className="rounded-lg border border-success/25 bg-success-soft p-4">
                <p className="font-medium text-success">
                  Created {result.parts.length} file{result.parts.length === 1 ? '' : 's'}
                </p>
                <div className="mt-3 flex flex-wrap gap-3">
                  {result.parts.length === 1 ? (
                    <Button
                      onClick={() => downloadBytes(result.parts[0].bytes, result.parts[0].name)}
                    >
                      <Download className="h-4 w-4" /> Download PDF
                    </Button>
                  ) : (
                    <Button
                      onClick={async () => {
                        const { createZip } = await import('@/lib/zip')
                        const zip = createZip(result.parts.map((p) => ({ name: p.name, data: p.bytes })))
                        downloadBlob(zip, `${safeBaseName(file.name)}-split.zip`)
                      }}
                    >
                      <Download className="h-4 w-4" /> Download ZIP ({result.parts.length} files)
                    </Button>
                  )}
                  <Button variant="secondary" onClick={() => setResult(null)}>
                    <RotateCcw className="h-4 w-4" /> Split again
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
