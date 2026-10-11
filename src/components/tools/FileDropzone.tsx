import { useCallback, useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import { Upload } from 'lucide-react'
import { cn, formatBytes } from '@/lib/utils'

interface FileDropzoneProps {
  accept: string
  multiple?: boolean
  onFiles: (files: File[]) => void
  disabled?: boolean
  hint?: string
  title?: string
}

export function FileDropzone({
  accept,
  multiple = false,
  onFiles,
  disabled,
  hint,
  title = 'Select file',
}: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const handle = useCallback(
    (fileList: FileList | null) => {
      if (!fileList || fileList.length === 0) return
      const files = Array.from(fileList)
      onFiles(multiple ? files : files.slice(0, 1))
    },
    [multiple, onFiles],
  )

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragging(false)
    if (disabled) return
    handle(e.dataTransfer.files)
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault()
        if (!disabled) setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      role="group"
      aria-label={title}
      className={cn(
        'rounded-xl border-2 border-dashed bg-surface p-6 text-center transition-colors sm:p-10',
        dragging ? 'border-accent bg-accent-soft/40' : 'border-line-strong',
        disabled && 'opacity-60',
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        className="sr-only"
        onChange={(e: ChangeEvent<HTMLInputElement>) => {
          handle(e.target.files)
          e.target.value = ''
        }}
      />
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-line bg-paper text-accent">
        <Upload className="h-5 w-5" aria-hidden="true" />
      </div>
      <p className="mt-4 text-base font-medium text-ink">
        Drag {multiple ? 'files' : 'a file'} here, or{' '}
        <button
          type="button"
          className="text-accent-strong underline underline-offset-2 hover:text-accent"
          onClick={() => inputRef.current?.click()}
          disabled={disabled}
        >
          browse
        </button>
      </p>
      <p className="mt-1 text-sm text-ink-muted">
        {hint ?? `Accepted: ${accept.replace(/,/g, ', ')}`}
      </p>
      <p className="mt-3 text-xs text-ink-muted">
        Processed locally in your browser — your files are never uploaded.
      </p>
    </div>
  )
}

export function FileMeta({ file }: { file: File }) {
  return (
    <span className="text-xs text-ink-muted">
      {formatBytes(file.size)} · {file.type || 'unknown type'}
    </span>
  )
}
