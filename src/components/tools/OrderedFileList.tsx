import { useState } from 'react'
import { ArrowDown, ArrowUp, GripVertical, Trash2 } from 'lucide-react'
import { cn, formatBytes } from '@/lib/utils'

interface OrderedFileListProps {
  files: File[]
  onReorder: (from: number, to: number) => void
  onRemove: (index: number) => void
}

export function OrderedFileList({ files, onReorder, onRemove }: OrderedFileListProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [overIndex, setOverIndex] = useState<number | null>(null)

  return (
    <ul className="space-y-2" aria-label="Selected files, in order">
      {files.map((file, index) => (
        <li
          key={`${file.name}-${file.size}-${index}`}
          draggable
          onDragStart={() => setDragIndex(index)}
          onDragEnter={() => setOverIndex(index)}
          onDragOver={(e) => e.preventDefault()}
          onDragEnd={() => {
            if (dragIndex !== null && overIndex !== null && dragIndex !== overIndex) {
              onReorder(dragIndex, overIndex)
            }
            setDragIndex(null)
            setOverIndex(null)
          }}
          className={cn(
            'flex items-center gap-3 rounded-md border bg-surface px-3 py-2.5',
            overIndex === index && dragIndex !== null ? 'border-accent' : 'border-line',
          )}
        >
          <span className="cursor-grab text-ink-muted" aria-hidden="true">
            <GripVertical className="h-4 w-4" />
          </span>
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-xs font-semibold text-ink-soft">
            {index + 1}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-ink">{file.name}</span>
            <span className="text-xs text-ink-muted">{formatBytes(file.size)}</span>
          </span>
          <span className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onReorder(index, index - 1)}
              disabled={index === 0}
              aria-label={`Move ${file.name} up`}
              className="rounded p-1.5 text-ink-muted hover:bg-surface-sunken hover:text-ink disabled:opacity-30"
            >
              <ArrowUp className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => onReorder(index, index + 1)}
              disabled={index === files.length - 1}
              aria-label={`Move ${file.name} down`}
              className="rounded p-1.5 text-ink-muted hover:bg-surface-sunken hover:text-ink disabled:opacity-30"
            >
              <ArrowDown className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => onRemove(index)}
              aria-label={`Remove ${file.name}`}
              className="rounded p-1.5 text-ink-muted hover:bg-accent-soft hover:text-accent-strong"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </span>
        </li>
      ))}
    </ul>
  )
}
