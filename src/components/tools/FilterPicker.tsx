import { useEffect, useState } from 'react'
import { FILTER_PRESETS, filterPixels, type FilterId } from '@/lib/pdf/filters'
import { cn } from '@/lib/utils'

const PREVIEW_WIDTH = 112

/**
 * A visible filter picker: every preset is shown as a live thumbnail rendered
 * with the exact same pixel engine used at export time, so the preview always
 * matches the output. `previewUrl` is any page image (typically a blob URL of
 * the first rendered page).
 */
export function FilterPicker({
  value,
  onChange,
  previewUrl,
  label = 'Filter',
  hint,
}: {
  value: FilterId
  onChange: (value: FilterId) => void
  previewUrl?: string | null
  label?: string
  hint?: string
}) {
  const [thumbs, setThumbs] = useState<Partial<Record<FilterId, string>>>({})

  useEffect(() => {
    let cancelled = false
    setThumbs({})
    if (!previewUrl) return

    const image = new Image()
    image.onload = () => {
      if (cancelled || image.width === 0) return
      const scale = Math.min(1, PREVIEW_WIDTH / image.width)
      const width = Math.max(1, Math.round(image.width * scale))
      const height = Math.max(1, Math.round(image.height * scale))

      const base = document.createElement('canvas')
      base.width = width
      base.height = height
      const baseCtx = base.getContext('2d')
      if (!baseCtx) return
      baseCtx.drawImage(image, 0, 0, width, height)
      const source = baseCtx.getImageData(0, 0, width, height)

      const work = document.createElement('canvas')
      work.width = width
      work.height = height
      const workCtx = work.getContext('2d')
      if (!workCtx) return

      const next: Partial<Record<FilterId, string>> = {}
      for (const preset of FILTER_PRESETS) {
        const data = new Uint8ClampedArray(source.data)
        filterPixels(data, preset.id)
        const frame = workCtx.createImageData(width, height)
        frame.data.set(data)
        workCtx.putImageData(frame, 0, 0)
        next[preset.id] = work.toDataURL('image/png')
      }
      if (!cancelled) setThumbs(next)
    }
    image.src = previewUrl
    return () => {
      cancelled = true
    }
  }, [previewUrl])

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-ink">{label}</p>
      <ul className="flex flex-wrap gap-2" role="radiogroup" aria-label={label}>
        {FILTER_PRESETS.map((preset) => {
          const selected = preset.id === value
          const thumb = thumbs[preset.id]
          return (
            <li key={preset.id}>
              <button
                type="button"
                role="radio"
                aria-checked={selected}
                title={preset.description}
                onClick={() => onChange(preset.id)}
                className={cn(
                  'flex w-24 flex-col items-center gap-1 rounded-md border p-1.5 text-center transition-colors',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
                  selected ? 'border-accent ring-2 ring-accent/30' : 'border-line hover:border-line-strong',
                )}
              >
                <span className="block w-full overflow-hidden rounded-sm border border-line bg-surface-sunken">
                  {thumb ? (
                    <img src={thumb} alt="" className="block aspect-[3/4] w-full object-cover" />
                  ) : (
                    <span className="block aspect-[3/4] w-full animate-pulse bg-surface-sunken" />
                  )}
                </span>
                <span className="text-[11px] font-medium leading-tight text-ink-soft">
                  {preset.label}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
      {hint ? <p className="text-xs text-ink-muted">{hint}</p> : null}
    </div>
  )
}
