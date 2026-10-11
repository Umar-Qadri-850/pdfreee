import { type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import type { Transform } from '@/lib/pdf/placement'

export interface PagePreview {
  pageNumber: number
  blobUrl: string
  width: number
  height: number
  /** PDF.js viewport transform, captured at preview time for exact coordinate mapping. */
  transform: Transform
}

export interface PlacedImage {
  id: string
  page: number
  /** Top-left position and size in preview pixels. */
  x: number
  y: number
  width: number
  height: number
  /** Object URL used only for on-screen preview. */
  url: string
}

interface PageCanvasProps {
  preview: PagePreview
  images: PlacedImage[]
  selectedId: string | null
  onSelect: (id: string | null) => void
  onChange: (id: string, changes: Partial<PlacedImage>) => void
  /** Called with preview-pixel coordinates when the empty page area is clicked. */
  onPlace: (x: number, y: number) => void
  placeLabel: string
  /** Extra overlays (e.g. text entries) rendered above the page image. */
  children?: ReactNode
}

/**
 * Renders a single PDF page preview plus interactive image placements.
 * Moving and resizing use pointer events (mouse, touch, stylus) so the same
 * code path works on mobile and desktop.
 */
export function PageCanvas({
  preview,
  images,
  selectedId,
  onSelect,
  onChange,
  onPlace,
  placeLabel,
  children,
}: PageCanvasProps) {
  const beginMove = (ev: ReactPointerEvent, item: PlacedImage) => {
    ev.stopPropagation()
    ev.preventDefault()
    onSelect(item.id)
    const startX = ev.clientX
    const startY = ev.clientY
    const origX = item.x
    const origY = item.y
    const move = (e: PointerEvent) =>
      onChange(item.id, { x: origX + (e.clientX - startX), y: origY + (e.clientY - startY) })
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
  }

  const beginResize = (ev: ReactPointerEvent, item: PlacedImage) => {
    ev.stopPropagation()
    ev.preventDefault()
    onSelect(item.id)
    const startX = ev.clientX
    const origWidth = item.width
    const aspect = item.width / item.height || 1
    const move = (e: PointerEvent) => {
      const nextWidth = Math.max(24, origWidth + (e.clientX - startX))
      onChange(item.id, { width: nextWidth, height: nextWidth / aspect })
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
  }

  return (
    <div
      className="relative inline-block border border-line bg-white"
      style={{ width: preview.width, height: preview.height }}
      onClick={(ev) => {
        const rect = ev.currentTarget.getBoundingClientRect()
        onPlace(ev.clientX - rect.left, ev.clientY - rect.top)
      }}
      role="button"
      tabIndex={0}
      aria-label={placeLabel}
      onKeyDown={(ev) => {
        if (ev.key === 'Enter' || ev.key === ' ') {
          ev.preventDefault()
          onPlace(preview.width / 2, preview.height / 2)
        }
      }}
    >
      <img src={preview.blobUrl} alt={`Page ${preview.pageNumber}`} className="pointer-events-none select-none" />
      {children}
      {images.map((item) => (
        <div
          key={item.id}
          className={`absolute cursor-move touch-none ${selectedId === item.id ? 'ring-2 ring-accent' : ''}`}
          style={{ left: item.x, top: item.y, width: item.width, height: item.height }}
          onPointerDown={(ev) => beginMove(ev, item)}
          onClick={(ev) => ev.stopPropagation()}
        >
          <img src={item.url} alt="" className="pointer-events-none h-full w-full select-none object-contain" />
          {selectedId === item.id ? (
            <span
              role="button"
              aria-label="Resize"
              onPointerDown={(ev) => beginResize(ev, item)}
              onClick={(ev) => ev.stopPropagation()}
              className="absolute -bottom-1.5 -right-1.5 h-3.5 w-3.5 cursor-nwse-resize rounded-full border border-white bg-accent shadow-xs"
            />
          ) : null}
        </div>
      ))}
    </div>
  )
}
