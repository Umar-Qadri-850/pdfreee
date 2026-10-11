import { Check } from 'lucide-react'
import { usePdfThumbnails } from '@/lib/pdf/usePdfThumbnails'
import { Alert, Spinner } from '@/components/ui'
import { cn, formatBytes } from '@/lib/utils'

interface PageGridProps {
  file: File | null
  selected?: Set<number>
  onToggle?: (page: number) => void
  /** Tone for selected pages: 'select' (accent) or 'remove' (danger). */
  tone?: 'select' | 'remove'
  label?: string
  /** Degrees to visually preview an upcoming rotation. */
  previewRotation?: 0 | 90 | 180 | 270
}

export function PageGrid({
  file,
  selected,
  onToggle,
  tone = 'select',
  label,
  previewRotation = 0,
}: PageGridProps) {
  const { thumbs, numPages, loading, progress, error } = usePdfThumbnails(file)

  if (!file) return null

  if (error) {
    return <Alert tone="error">Could not render previews: {error}</Alert>
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm text-ink-soft">
        <span>
          {file.name} · {numPages || '…'} page{numPages === 1 ? '' : 's'} · {formatBytes(file.size)}
        </span>
        {loading ? (
          <span className="inline-flex items-center gap-2 text-ink-muted">
            <Spinner /> Rendering previews {Math.round(progress * 100)}%
          </span>
        ) : null}
      </div>

      <ul
        className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
        aria-label={label ?? 'Page previews'}
      >
        {thumbs.map((thumb) => {
          const isSelected = selected?.has(thumb.page) ?? false
          return (
            <li key={thumb.page}>
              <button
                type="button"
                onClick={() => onToggle?.(thumb.page)}
                disabled={!onToggle}
                aria-pressed={onToggle ? isSelected : undefined}
                aria-label={`Page ${thumb.page}${isSelected ? ', selected' : ''}`}
                className={cn(
                  'group relative block w-full overflow-hidden rounded-md border bg-surface p-1 transition-colors',
                  isSelected && tone === 'select' && 'border-accent ring-2 ring-accent/30',
                  isSelected && tone === 'remove' && 'border-accent-strong ring-2 ring-accent/40',
                  !isSelected && 'border-line hover:border-line-strong',
                  !onToggle && 'cursor-default',
                )}
              >
                <img
                  src={thumb.url}
                  alt={`Page ${thumb.page} preview`}
                  loading="lazy"
                  className="w-full rounded-sm transition-transform duration-200"
                  style={{
                    aspectRatio: `${thumb.width} / ${thumb.height}`,
                    transform: previewRotation ? `rotate(${previewRotation}deg)` : undefined,
                  }}
                />
                <span className="absolute left-2 top-2 rounded bg-ink/75 px-1.5 py-0.5 text-[11px] font-medium text-white">
                  {thumb.page}
                </span>
                {isSelected ? (
                  <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-white">
                    <Check className="h-3.5 w-3.5" />
                  </span>
                ) : null}
              </button>
            </li>
          )
        })}
        {loading && thumbs.length === 0
          ? Array.from({ length: 6 }).map((_, i) => (
              <li key={`skeleton-${i}`}>
                <div className="aspect-[3/4] w-full animate-pulse rounded-md border border-line bg-surface-sunken" />
              </li>
            ))
          : null}
      </ul>
    </div>
  )
}
