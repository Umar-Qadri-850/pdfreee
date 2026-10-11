import { degrees, type PDFDocument, type PDFImage } from 'pdf-lib'
import { PdfError } from './errors'

/**
 * Shared geometry for placing images (signatures, inserted pictures, stamps)
 * onto rendered PDF pages. The editor stores placements in *preview pixels*
 * (top-left origin, matching the on-screen canvas) and converts them to PDF
 * user-space points only at export time - so what the user positions is exactly
 * what pdf-lib draws, on portrait, landscape and rotated pages alike.
 */

/** Pixels per PDF point used for every editor preview canvas. */
export const RENDER_SCALE = 1.5

/** PDF.js viewport affine matrix: [a, b, c, d, e, f]. */
export type Transform = readonly [number, number, number, number, number, number]

interface Point {
  x: number
  y: number
}

/** Map a point from preview pixels (top-left origin) to PDF points (bottom-left origin). */
export function previewPointToPdf(transform: Transform, px: number, py: number): Point {
  const [a, b, c, d, e, f] = transform
  const det = a * d - b * c
  if (!det) return { x: 0, y: 0 }
  return {
    x: (d * (px - e) - c * (py - f)) / det,
    y: (-b * (px - e) + a * (py - f)) / det,
  }
}

/** Angle (radians) in PDF space of the preview's +x axis, used to keep media upright on rotated pages. */
export function previewAngle(transform: Transform, px: number, py: number): number {
  const origin = previewPointToPdf(transform, px, py)
  const unit = previewPointToPdf(transform, px + 1, py)
  return Math.atan2(unit.y - origin.y, unit.x - origin.x)
}

export interface PdfPlacement {
  x: number
  y: number
  width: number
  height: number
  /** Counter-clockwise rotation in radians for pdf-lib's drawImage. */
  rotation: number
}

/**
 * Convert a preview-space rectangle (top-left origin, in preview pixels) into
 * destination coordinates pdf-lib can draw at. Anchoring on the preview
 * bottom-left edge makes the result correct for any page rotation.
 */
export function previewRectToPdf(
  transform: Transform,
  x: number,
  y: number,
  width: number,
  height: number,
): PdfPlacement {
  const bottomLeft = previewPointToPdf(transform, x, y + height)
  const bottomRight = previewPointToPdf(transform, x + width, y + height)
  const topLeft = previewPointToPdf(transform, x, y)
  return {
    x: bottomLeft.x,
    y: bottomLeft.y,
    width: Math.hypot(bottomRight.x - bottomLeft.x, bottomRight.y - bottomLeft.y),
    height: Math.hypot(topLeft.x - bottomLeft.x, topLeft.y - bottomLeft.y),
    rotation: Math.atan2(bottomRight.y - bottomLeft.y, bottomRight.x - bottomLeft.x),
  }
}

export interface EmbeddedImage {
  image: PDFImage
  /** Intrinsic pixel dimensions, used to preserve aspect ratio when placing. */
  width: number
  height: number
}

async function decodeBitmap(file: Blob): Promise<ImageBitmap> {
  if (typeof createImageBitmap !== 'function') {
    throw new PdfError('unsupported', 'This browser does not support the image APIs required.')
  }
  try {
    return await createImageBitmap(file, { imageOrientation: 'from-image' } as ImageBitmapOptions)
  } catch {
    try {
      return await createImageBitmap(file)
    } catch {
      throw new PdfError(
        'unsupported',
        'This image could not be decoded. It may be corrupt or in an unsupported format.',
      )
    }
  }
}

/**
 * Embed a user-selected image into a pdf-lib document.
 *
 * PNG and JPEG are embedded directly (so PNG transparency and EXIF-applied JPEG
 * data survive). Anything else the browser can decode - notably WebP - is
 * rasterised to PNG through a canvas first, which also preserves alpha.
 */
export async function embedImageFile(
  pdf: PDFDocument,
  file: File,
  signal?: AbortSignal,
): Promise<EmbeddedImage> {
  const type = (file.type || '').toLowerCase()
  try {
    if (type === 'image/png') {
      const image = await pdf.embedPng(new Uint8Array(await file.arrayBuffer()))
      return { image, width: image.width, height: image.height }
    }
    if (type === 'image/jpeg' || type === 'image/jpg') {
      const image = await pdf.embedJpg(new Uint8Array(await file.arrayBuffer()))
      return { image, width: image.width, height: image.height }
    }
  } catch {
    throw new PdfError('corrupt', `“${file.name}” could not be read as an image.`)
  }

  const bitmap = await decodeBitmap(file)
  if (signal?.aborted) {
    bitmap.close()
    throw new DOMException('Aborted', 'AbortError')
  }
  const canvas = document.createElement('canvas')
  canvas.width = bitmap.width
  canvas.height = bitmap.height
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    bitmap.close()
    throw new PdfError('unsupported', 'This browser could not process the image.')
  }
  ctx.drawImage(bitmap as CanvasImageSource, 0, 0)
  bitmap.close()
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
  canvas.width = 0
  canvas.height = 0
  if (!blob) throw new PdfError('unsupported', 'The image could not be encoded.')
  const image = await pdf.embedPng(new Uint8Array(await blob.arrayBuffer()))
  return { image, width: image.width, height: image.height }
}

/** pdf-lib-ready rotation for a placement computed in radians. */
export function rotationDegrees(radians: number) {
  return degrees((radians * 180) / Math.PI)
}
