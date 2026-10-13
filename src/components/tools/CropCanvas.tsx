import { useMemo, useRef, type CSSProperties, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react'
import {
  clampMargins,
  clampCropRect,
  marginsToPreviewRect,
  previewRectToMargins,
  MIN_CROP_PX,
  type CropMargins,
  type CropRect,
} from '@/lib/pdf/crop-selection'
import type { SinglePagePreview } from './usePdfPagePreview'

type Handle = 'move' | 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'

const CURSORS: Record<Handle, string> = {
  move: 'cursor-move',
  n: 'cursor-ns-resize',
  s: 'cursor-ns-resize',
  e: 'cursor-ew-resize',
  w: 'cursor-ew-resize',
  ne: 'cursor-nesw-resize',
  sw: 'cursor-nesw-resize',
  nw: 'cursor-nwse-resize',
  se: 'cursor-nwse-resize',
}

const HANDLES: { key: Handle; style: CSSProperties }[] = [
  { key: 'nw', style: { left: -6, top: -6 } },
  { key: 'n', style: { left: '50%', top: -6, transform: 'translateX(-50%)' } },
  { key: 'ne', style: { right: -6, top: -6 } },
  { key: 'e', style: { right: -6, top: '50%', transform: 'translateY(-50%)' } },
  { key: 'se', style: { right: -6, bottom: -6 } },
  { key: 's', style: { left: '50%', bottom: -6, transform: 'translateX(-50%)' } },
  { key: 'sw', style: { left: -6, bottom: -6 } },
  { key: 'w', style: { left: -6, top: '50%', transform: 'translateY(-50%)' } },
]

/** Apply a drag delta (preview pixels) to a crop rectangle for one handle. */
function applyDrag(
  rect: CropRect,
  handle: Handle,
  dx: number,
  dy: number,
  previewWidth: number,
  previewHeight: number,
): CropRect {
  if (handle === 'move') {
    return clampCropRect(
      { x: rect.x + dx, y: rect.y + dy, width: rect.width, height: rect.height },
      previewWidth,
      previewHeight,
    )
  }
  let { x, y, width, height } = rect
  const right = x + width
  const bottom = y + height
  if (handle.includes('w')) {
    const nx = Math.min(x + dx, right - MIN_CROP_PX)
    width = right - nx
    x = nx
  } else if (handle.includes('e')) {
    width = Math.max(MIN_CROP_PX, width + dx)
  }
  if (handle.includes('n')) {
    const ny = Math.min(y + dy, bottom - MIN_CROP_PX)
    height = bottom - ny
    y = ny
  } else if (handle.includes('s')) {
    height = Math.max(MIN_CROP_PX, height + dy)
  }
  return clampCropRect({ x, y, width, height }, previewWidth, previewHeight)
}

/**
 * An interactive crop box over a rendered PDF page. Dragging the box moves it
 * and dragging a handle resizes it; the resulting margins (fractions of the
 * unrotated page) flow back through `onChange`, keeping the numeric inputs and
 * every other page in sync.
 */
export function CropCanvas({
  preview,
  margins,
  onChange,
  maxMargin = 0.9,
}: {
  preview: SinglePagePreview
  margins: CropMargins
  onChange: (margins: CropMargins) => void
  /** Largest margin (fraction) a drag may produce on any edge. */
  maxMargin?: number
}) {
  const containerRef = useRef<HTMLDivElement>(null)

  const rect = useMemo(
    () => marginsToPreviewRect(preview.transform, margins, preview.width, preview.height),
    [preview.transform, preview.width, preview.height, margins],
  )

  const beginDrag = (ev: ReactPointerEvent, handle: Handle) => {
    ev.stopPropagation()
    ev.preventDefault()
    const container = containerRef.current
    if (!container) return
    const bounds = container.getBoundingClientRect()
    const scaleX = preview.width / (bounds.width || 1)
    const scaleY = preview.height / (bounds.height || 1)
    const startX = ev.clientX
    const startY = ev.clientY
    const startRect = rect

    const move = (e: PointerEvent) => {
      const next = applyDrag(
        startRect,
        handle,
        (e.clientX - startX) * scaleX,
        (e.clientY - startY) * scaleY,
        preview.width,
        preview.height,
      )
      onChange(previewRectToMargins(preview.transform, next, preview.width, preview.height, maxMargin))
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

  const nudge = (ev: KeyboardEvent) => {
    const step = ev.shiftKey ? 0.05 : 0.01
    let next = margins
    switch (ev.key) {
      case 'ArrowUp':
        ev.preventDefault()
        next = { ...margins, top: margins.top - step, bottom: margins.bottom + step }
        break
      case 'ArrowDown':
        ev.preventDefault()
        next = { ...margins, top: margins.top + step, bottom: margins.bottom - step }
        break
      case 'ArrowLeft':
        ev.preventDefault()
        next = { ...margins, left: margins.left - step, right: margins.right + step }
        break
      case 'ArrowRight':
        ev.preventDefault()
        next = { ...margins, left: margins.left + step, right: margins.right - step }
        break
    }
    const clamped = clampMargins(next, maxMargin)
    if (clamped !== margins) onChange(clamped)
  }

  return (
    <div
      ref={containerRef}
      className="relative inline-block overflow-hidden border border-line bg-white"
      style={{ width: preview.width, height: preview.height }}
    >
      <img
        src={preview.blobUrl}
        alt={`Page ${preview.pageNumber} crop preview`}
        className="pointer-events-none block select-none"
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{ boxShadow: '0 0 0 9999px rgba(2, 6, 23, 0.4)' }}
      />
      <div className="absolute" style={{ left: rect.x, top: rect.y, width: rect.width, height: rect.height }}>
        <div
          role="button"
          tabIndex={0}
          aria-label={`Crop area for page ${preview.pageNumber}; drag to move, arrow keys to nudge`}
          className="absolute -inset-px cursor-move touch-none border-2 border-accent outline-none focus-visible:ring-2 focus-visible:ring-accent"
          onPointerDown={(ev) => beginDrag(ev, 'move')}
          onKeyDown={nudge}
        />
        {HANDLES.map(({ key, style }) => (
          <span
            key={key}
            role="button"
            aria-label={`Resize crop ${key}`}
            onPointerDown={(ev) => beginDrag(ev, key)}
            className={`absolute z-10 h-3 w-3 touch-none rounded-[3px] border border-white bg-accent shadow-sm ${CURSORS[key]}`}
            style={style}
          />
        ))}
      </div>
    </div>
  )
}