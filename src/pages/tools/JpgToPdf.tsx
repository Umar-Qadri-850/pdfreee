import { useEffect, useState } from 'react'
import { Download, RotateCcw } from 'lucide-react'
import { ToolShell } from '@/components/tools/ToolShell'
import { FileDropzone } from '@/components/tools/FileDropzone'
import { FilenameField } from '@/components/tools/FilenameField'
import { OrderedFileList } from '@/components/tools/OrderedFileList'
import { useAsyncTask } from '@/components/tools/useAsyncTask'
import { useOutputFileName } from '@/components/tools/useOutputFileName'
import { Alert, Button, Field, ProgressBar } from '@/components/ui'
import { getTool } from '@/content/registry'
import { validateImageFile, friendlyMessage } from '@/lib/pdf/errors'
import { downloadBytes, formatBytes, safeBaseName } from '@/lib/utils'

const tool = getTool('jpg-to-pdf')!

const PAGE_SIZES = [
  { id: 'a4', label: 'A4 (210 × 297 mm)' },
  { id: 'letter', label: 'Letter (8.5 × 11 in)' },
  { id: 'legal', label: 'Legal (8.5 × 14 in)' },
  { id: 'a3', label: 'A3 (297 × 420 mm)' },
  { id: 'fit', label: 'Fit to image' },
] as const

export default function JpgToPdf() {
  const [files, setFiles] = useState<File[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZES)[number]['id']>('a4')
  const [orientation, setOrientation] = useState<'portrait' | 'landscape' | 'auto'>('portrait')
  const [marginMm, setMarginMm] = useState(0)
  const [result, setResult] = useState<Uint8Array | null>(null)
  const task = useAsyncTask()
  const out = useOutputFileName(
    `${safeBaseName(files[0]?.name ?? 'images')}-images`,
    'pdf',
  )

  const [previews, setPreviews] = useState<{ file: File; url: string }[]>([])

  useEffect(() => {
    const created = files.map((f) => ({ file: f, url: URL.createObjectURL(f) }))
    setPreviews(created)
    return () => created.forEach((c) => URL.revokeObjectURL(c.url))
  }, [files])

  const addFiles = (incoming: File[]) => {
    const accepted: File[] = []
    const problems: string[] = []
    for (const file of incoming) {
      try {
        validateImageFile(file)
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
      const { imagesToPdf } = await import('@/lib/pdf/images')
      const bytes = await imagesToPdf(files, { pageSize, orientation, marginMm, onProgress })
      setResult(bytes)
    })

  const totalSize = files.reduce((sum, f) => sum + f.size, 0)

  return (
    <ToolShell tool={tool}>
      <div className="space-y-6">
        <FileDropzone
          accept={tool.accept}
          multiple
          onFiles={addFiles}
          hint="Add JPG, PNG or WebP images. They become pages in the order shown."
          title="Add images"
        />

        {errors.length > 0 ? (
          <Alert tone="error" title="Some images were skipped">
            <ul className="list-disc pl-4">
              {errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          </Alert>
        ) : null}

        {files.length > 0 ? (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-ink-soft">
                {files.length} image{files.length === 1 ? '' : 's'} · {formatBytes(totalSize)}
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

            <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-6">
              {previews.map((p, i) => (
                <li key={`${p.file.name}-${i}`} className="overflow-hidden rounded-md border border-line bg-surface">
                  <img src={p.url} alt={`Preview of ${p.file.name}`} className="h-28 w-full object-cover" />
                  <p className="truncate px-1.5 py-1 text-[11px] text-ink-muted">#{i + 1} {p.file.name}</p>
                </li>
              ))}
            </ul>

            <OrderedFileList
              files={files}
              onReorder={reorder}
              onRemove={(i) => {
                setFiles((prev) => prev.filter((_, idx) => idx !== i))
                setResult(null)
              }}
            />

            <div className="grid gap-5 sm:grid-cols-3">
              <Field label="Page size">
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(e.target.value as (typeof PAGE_SIZES)[number]['id'])}
                  className="h-10 w-full rounded-md border border-line-strong bg-paper px-3 text-sm outline-none focus:border-accent"
                >
                  {PAGE_SIZES.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Orientation">
                <select
                  value={orientation}
                  onChange={(e) => setOrientation(e.target.value as 'portrait' | 'landscape' | 'auto')}
                  className="h-10 w-full rounded-md border border-line-strong bg-paper px-3 text-sm outline-none focus:border-accent"
                >
                  <option value="portrait">Portrait</option>
                  <option value="landscape">Landscape</option>
                  <option value="auto">Auto (match each image)</option>
                </select>
              </Field>
              <Field label="Margin" hint={`${marginMm} mm`}>
                <input
                  type="range"
                  min={0}
                  max={30}
                  step={1}
                  value={marginMm}
                  onChange={(e) => setMarginMm(Number(e.target.value))}
                  className="w-full accent-[var(--color-accent)]"
                />
              </Field>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={run} disabled={task.status === 'running'}>
                {task.status === 'running' ? 'Creating PDF…' : 'Create PDF'}
              </Button>
              {task.status === 'running' ? <Button variant="ghost" onClick={task.cancel}>Cancel</Button> : null}
            </div>

            {task.status === 'running' ? (
              <ProgressBar value={task.progress * 100} label={task.message || 'Building PDF…'} />
            ) : null}
            {task.error ? <Alert tone="error">{task.error}</Alert> : null}

            {result ? (
              <div className="rounded-lg border border-success/25 bg-success-soft p-4">
                <p className="font-medium text-success">PDF created</p>
                <p className="mt-1 text-sm text-ink-soft">
                  {files.length} page{files.length === 1 ? '' : 's'} · {formatBytes(result.length)}
                </p>
                <div className="mt-3">
                  <FilenameField
                    base={out.base}
                    extension="pdf"
                    onChange={out.setBase}
                    id="jpg-to-pdf-output-name"
                  />
                </div>
                <div className="mt-3 flex flex-wrap gap-3">
                  <Button onClick={() => downloadBytes(result, out.fileName)}>
                    <Download className="h-4 w-4" /> Download PDF
                  </Button>
                  <Button variant="secondary" onClick={() => setResult(null)}>
                    <RotateCcw className="h-4 w-4" /> Adjust and rebuild
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
