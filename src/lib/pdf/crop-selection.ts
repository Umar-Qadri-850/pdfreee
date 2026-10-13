import { pdfPointToPreview, previewPointToPdf, type Transform } from './placement'

/**
 * Pure geometry for the interactive crop tool.
 *
 * The UI stores crop margins as fractions of each page's unrotated media box
 * (matching `cropPages`). The on-screen crop box, however, lives in *preview
 * pixels* (top-left origin). These helpers translate between the two using the
 * page's PDF.js viewport transform, so a rectangle drawn on a portrait,
 * landscape or 90°-rotated page always maps to the correct media-box trim.
 */

export interface CropMargins {
  top: number
  right: number
  bottom: number
  left: number
}

export interface CropRect {
  x: number
  y: number
  width: number
  height: number
}

/** Smallest crop box edge, in preview pixels. */
export const MIN_CROP_PX = 16

const DEFAULT_MAX = 0.9

interface Bounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

function boundsOf(
  transform: Transform,
  points: ReadonlyArray<readonly [number, number]>,
): Bounds {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const [px, py] of points) {
    const point = previewPointToPdf(transform, px, py)
    if (point.x < minX) minX = point.x
    if (point.x > maxX) maxX = point.x
    if (point.y < minY) minY = point.y
    if (point.y > maxY) maxY = point.y
  }
  return { minX, minY, maxX, maxY }
}

const PREVIEW_CORNERS = [
  [0, 0],
  [1, 0],
  [1, 1],
  [0, 1],
] as const

/** PDF-space bounding box of the whole preview area for the given transform. */
function pageBounds(transform: Transform, width: number, height: number): Bounds {
  return boundsOf(
    transform,
    PREVIEW_CORNERS.map(([fx, fy]) => [fx * width, fy * height] as const),
  )
}

function clamp(value: number, max: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(max, value))
}

/** Keep margins non-negative and below the point where a page would vanish. */
export function clampMargins(margins: CropMargins, max: number = DEFAULT_MAX): CropMargins {
  return {
    top: clamp(margins.top, max),
    right: clamp(margins.right, max),
    bottom: clamp(margins.bottom, max),
    left: clamp(margins.left, max),
  }
}

/** Convert a crop rectangle in preview pixels to fractional media-box margins. */
export function previewRectToMargins(
  transform: Transform,
  rect: CropRect,
  previewWidth: number,
  previewHeight: number,
  max: number = DEFAULT_MAX,
): CropMargins {
  const full = pageBounds(transform, previewWidth, previewHeight)
  const fullWidth = full.maxX - full.minX || 1
  const fullHeight = full.maxY - full.minY || 1
  const selection = boundsOf(transform, [
    [rect.x, rect.y],
    [rect.x + rect.width, rect.y],
    [rect.x + rect.width, rect.y + rect.height],
    [rect.x, rect.y + rect.height],
  ])
  return clampMargins(
    {
      top: (full.maxY - selection.maxY) / fullHeight,
      right: (full.maxX - selection.maxX) / fullWidth,
      bottom: (selection.minY - full.minY) / fullHeight,
      left: (selection.minX - full.minX) / fullWidth,
    },
    max,
  )
}

/** Inverse of {@link previewRectToMargins}: the preview-space crop rectangle. */
export function marginsToPreviewRect(
  transform: Transform,
  margins: CropMargins,
  previewWidth: number,
  previewHeight: number,
): CropRect {
  const full = pageBounds(transform, previewWidth, previewHeight)
  const fullWidth = full.maxX - full.minX
  const fullHeight = full.maxY - full.minY
  const x0 = full.minX + margins.left * fullWidth
  const x1 = full.maxX - margins.right * fullWidth
  const y0 = full.minY + margins.bottom * fullHeight
  const y1 = full.maxY - margins.top * fullHeight
  const corners = (
    [
      [x0, y0],
      [x1, y0],
      [x1, y1],
      [x0, y1],
    ] as const
  ).map(([x, y]) => pdfPointToPreview(transform, x, y))

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const point of corners) {
    if (point.x < minX) minX = point.x
    if (point.x > maxX) maxX = point.x
    if (point.y < minY) minY = point.y
    if (point.y > maxY) maxY = point.y
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
}

/** Clamp a crop rectangle into the page and enforce a minimum size. */
export function clampCropRect(
  rect: CropRect,
  previewWidth: number,
  previewHeight: number,
  minSize: number = MIN_CROP_PX,
): CropRect {
  const width = Math.min(Math.max(rect.width, Math.min(minSize, previewWidth)), previewWidth)
  const height = Math.min(Math.max(rect.height, Math.min(minSize, previewHeight)), previewHeight)
  const x = Math.min(Math.max(rect.x, 0), Math.max(0, previewWidth - width))
  const y = Math.min(Math.max(rect.y, 0), Math.max(0, previewHeight - height))
  return { x, y, width, height }
}
