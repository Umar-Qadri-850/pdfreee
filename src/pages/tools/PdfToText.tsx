import { useEffect, useState } from 'react'
import { Copy, Download, RotateCcw } from 'lucide-react'
import { ToolShell } from '@/components/tools/ToolShell'
import { FileDropzone } from '@/components/tools/FileDropzone'
import { FilenameField } from '@/components/tools/FilenameField'
import { useAsyncTask } from '@/components/tools/useAsyncTask'
import { useSinglePdfFile } from '@/components/tools/useSinglePdfFile'
import { useOutputFileName } from '@/components/tools/useOutputFileName'
import { Alert, Button, Field, ProgressBar, Spinner } from '@/components/ui'
import { getTool } from '@/content/registry'
import { downloadBlob, formatBytes, safeBaseName } from '@/lib/utils'
import type { ExtractTextResult } from '@/lib/pdf/text'

const tool = getTool('pdf-to-text')!

export default function PdfToText() {
  const { file, pageCount, loading, error, select, clear } = useSinglePdfFile()
  const [range, setRange] = useState('')
  const [result, setResult] = useState<ExtractTextResult | null>(null)
  const [copied, setCopied] = useState(false)
  const task = useAsyncTask()
  const out = useOutputFileName(file ? safeBaseName(file.name) : 'document', 'txt')

  useEffect(() => {
    setResult(null)
    setRange('')
    setCopied(false)
    task.reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file])

  const run = () =>
    task.run(async ({ signal, onProgress }) => {
      if (!file) return
      const { extractText } = await import('@/lib/pdf/text')
      const bytes = new Uint8Array(await file.arrayBuffer())
      setResult(await extractText(bytes, { range, onProgress, signal }))
    })

  const copy = async () => {
    if (!result) return
    try {
      await navigator.clipboard.writeText(result.full)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      task.setError('Your browser blocked clipboard access. Select the text and copy manually.')
    }
  }

  const looksScanned = result !== null && result.characters > 0 && result.characters < result.pages.length * 10

  return (
    <ToolShell tool={tool}>
      <div className="space-y-6">
        <FileDropzone accept={tool.accept} onFiles={select} title="Add a PDF to extract text from" />

        {loading ? (
          <p className="inline-flex items-center gap-2 text-sm text-ink-muted">
            <Spinner /> Reading document…
          </p>
        ) : null}
        {error ? <Alert tone="error">{error}</Alert> : null}

        {file && pageCount > 0 ? (
          <div className="space-y-5">
            <Field label="Pages" htmlFor="text-range" hint={`Leave empty for all ${pageCount} pages.`}>
              <input
                id="text-range"
                value={range}
                onChange={(e) => setRange(e.target.value)}
                placeholder="e.g. 1-5, 8"
                className="h-10 w-full max-w-xs rounded-md border border-line-strong bg-paper px-3 font-mono text-sm outline-none focus:border-accent"
              />
            </Field>

            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={run} disabled={task.status === 'running'}>
                {task.status === 'running' ? 'Extracting…' : 'Extract text'}
              </Button>
              {task.status === 'running' ? <Button variant="ghost" onClick={task.cancel}>Cancel</Button> : null}
            </div>

            {task.status === 'running' ? (
              <ProgressBar value={task.progress * 100} label={task.message || 'Reading text…'} />
            ) : null}
            {task.error ? <Alert tone="error">{task.error}</Alert> : null}

            {result ? (
              <div className="space-y-4">
                {result.characters === 0 ? (
                  <Alert tone="warn" title="No selectable text found">
                    This PDF appears to be a scan made of images with no text layer. Extracting text
                    from it needs OCR, which is a planned feature and not part of this release.
                  </Alert>
                ) : looksScanned ? (
                  <Alert tone="warn" title="Very little text found">
                    Only {result.characters} characters were extracted. This document may be mostly
                    images. Check the output before relying on it.
                  </Alert>
                ) : (
                  <p className="text-sm text-ink-soft">
                    Extracted {result.characters.toLocaleString()} characters from{' '}
                    {result.pages.length} page{result.pages.length === 1 ? '' : 's'}.
                  </p>
                )}

                <div className="max-w-md">
                  <FilenameField
                    base={out.base}
                    extension="txt"
                    onChange={out.setBase}
                    id="pdf-to-text-output-name"
                  />
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button onClick={copy} disabled={result.characters === 0}>
                    <Copy className="h-4 w-4" /> {copied ? 'Copied!' : 'Copy all text'}
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={result.characters === 0}
                    onClick={() =>
                      downloadBlob(
                        new Blob([result.full], { type: 'text/plain;charset=utf-8' }),
                        out.fileName,
                      )
                    }
                  >
                    <Download className="h-4 w-4" /> Download .txt ({formatBytes(result.full.length)})
                  </Button>
                  <Button variant="ghost" onClick={() => setResult(null)}>
                    <RotateCcw className="h-4 w-4" /> Clear output
                  </Button>
                </div>

                <div className="max-h-[28rem] overflow-auto rounded-lg border border-line bg-surface p-4">
                  <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-ink-soft">
                    {result.full || 'No text extracted.'}
                  </pre>
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
