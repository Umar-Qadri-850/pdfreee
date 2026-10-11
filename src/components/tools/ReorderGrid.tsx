import { useState } from 'react'
import { ArrowLeft, ArrowRight, GripVertical } from 'lucide-react'
import { usePdfThumbnails } from '@/lib/pdf/usePdfThumbnails'
import { Alert, Spinner } from '@/components/ui'
import { cn } from '@/lib/utils'

interface ReorderGridProps {
  file: File | null
  order: number[]
  onReorder: (order: number[]) => void
}

export function ReorderGrid({ file, order, onReorder }: ReorderGridProps) {
  const { thumbs, error, loading } = usePdfThumbnails(file)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [overIndex, setOverIndex] = useState<number | null>(null)

  if (!file) return null
  if (error) return <Alert tone="error">Could not render previews: {error}</Alert>

  const urlFor = (page: number) => thumbs.find((t) => t.page === page)?.url

  const move = (from: number, to: number) => {
    if (to < 0 || to >= order.length || from === to) return
    const next = [...order]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    onReorder(next)
  }

  return (
    <div>
      {loading ? (
        <p className="mb-3 inline-flex items-center gap-2 text-sm text-ink-muted">
          <Spinner /> Rendering previews…
        </p>
      ) : null}
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {order.map((page, index) => (
          <li
            key={`${page}-${index}`}
            draggable
            onDragStart={() => setDragIndex(index)}
            onDragEnter={() => setOverIndex(index)}
            onDragOver={(e) => e.preventDefault()}
            onDragEnd={() => {
              if (dragIndex !== null && overIndex !== null) move(dragIndex, overIndex)
              setDragIndex(null)
              setOverIndex(null)
            }}
            className={cn(
              'flex flex-col rounded-md border bg-surface p-1.5',
              overIndex === index && dragIndex !== null ? 'border-accent' : 'border-line',
            )}
          >
            <div className="relative">
              <span className="absolute left-1.5 top-1.5 z-10 rounded bg-ink/75 px-1.5 py-0.5 text-[11px] font-medium text-white">
                #{index + 1}
              </span>
              <span className="absolute right-1.5 top-1.5 z-10 cursor-grab rounded bg-surface/85 p-0.5 text-ink-muted">
                <GripVertical className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
              {urlFor(page) ? (
                <img
                  src={urlFor(page)}
                  alt={`Original page ${page} preview`}
                  loading="lazy"
                  className="w-full rounded-sm"
                />
              ) : (
                <div className="aspect-[3/4] w-full animate-pulse rounded-sm bg-surface-sunken" />
              )}
            </div>
            <div className="mt-1.5 flex items-center justify-between gap-1">
              <span className="text-xs text-ink-muted">orig. {page}</span>
              <span className="flex gap-0.5">
                <button
                  type="button"
                  onClick={() => move(index, index - 1)}
                  disabled={index === 0}
                  aria-label={`Move page ${page} earlier`}
                  className="rounded p-1 text-ink-muted hover:bg-surface-sunken hover:text-ink disabled:opacity-30"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => move(index, index + 1)}
                  disabled={index === order.length - 1}
                  aria-label={`Move page ${page} later`}
                  className="rounded p-1 text-ink-muted hover:bg-surface-sunken hover:text-ink disabled:opacity-30"
                >
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
