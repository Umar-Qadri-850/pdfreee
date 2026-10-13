/**
 * Lightweight raster filters applied to canvas pixels.
 *
 * Filters only make sense on raster output — image export, or images being
 * embedded into a PDF. They are deliberately not offered as a way to "filter a
 * PDF in place" because doing so would require rasterising every page, which
 * destroys selectable text.
 */

export type FilterId =
  | 'none'
  | 'grayscale'
  | 'blackwhite'
  | 'warm'
  | 'cool'
  | 'sepia'
  | 'invert'
  | 'brighten'
  | 'contrast'

export interface FilterPreset {
  id: FilterId
  label: string
  description: string
}

export const FILTER_PRESETS: FilterPreset[] = [
  { id: 'none', label: 'Original', description: 'No filter — the page is rendered as-is.' },
  {
    id: 'blackwhite',
    label: 'Black & White',
    description: 'High-contrast threshold, good for crisp scans and documents.',
  },
  { id: 'grayscale', label: 'Grayscale', description: 'Uniform grey tones, useful for photos.' },
  { id: 'warm', label: 'Warm', description: 'Adds a golden, sunny cast for a cosier feel.' },
  { id: 'cool', label: 'Cool', description: 'Adds a blue, icy cast for a crisp modern look.' },
  { id: 'sepia', label: 'Sepia', description: 'Classic aged-paper tone.' },
  { id: 'contrast', label: 'High Contrast', description: 'Deepens darks and lightens lights.' },
  { id: 'invert', label: 'Inverted', description: 'Swaps light and dark — handy for dark-mode reads.' },
  { id: 'brighten', label: 'Brighten', description: 'Lifts shadows in an under-exposed scan.' },
]

export function isFilterId(value: string): value is FilterId {
  return FILTER_PRESETS.some((preset) => preset.id === value)
}

/** Rec. 601 luma, the perceived brightness of an RGB pixel. */
function luma(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b
}

/**
 * Transform an RGBA buffer in place. Pure and synchronous so it can be unit
 * tested without a canvas.
 */
export function filterPixels(data: Uint8ClampedArray, preset: FilterId): void {
  if (preset === 'none') return

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]

    switch (preset) {
      case 'grayscale': {
        const y = luma(r, g, b)
        data[i] = y
        data[i + 1] = y
        data[i + 2] = y
        break
      }
      case 'blackwhite': {
        const y = luma(r, g, b) < 128 ? 0 : 255
        data[i] = y
        data[i + 1] = y
        data[i + 2] = y
        break
      }
      case 'warm': {
        data[i] = r + 18
        data[i + 1] = g + 6
        data[i + 2] = b - 12
        break
      }
      case 'cool': {
        data[i] = r - 12
        data[i + 1] = g + 4
        data[i + 2] = b + 18
        break
      }
      case 'sepia': {
        data[i] = 0.393 * r + 0.769 * g + 0.189 * b
        data[i + 1] = 0.349 * r + 0.686 * g + 0.168 * b
        data[i + 2] = 0.272 * r + 0.534 * g + 0.131 * b
        break
      }
      case 'invert': {
        data[i] = 255 - r
        data[i + 1] = 255 - g
        data[i + 2] = 255 - b
        break
      }
      case 'brighten': {
        data[i] = r + 40
        data[i + 1] = g + 40
        data[i + 2] = b + 40
        break
      }
      case 'contrast': {
        const factor = 1.4
        data[i] = (r - 128) * factor + 128
        data[i + 1] = (g - 128) * factor + 128
        data[i + 2] = (b - 128) * factor + 128
        break
      }
    }
  }
}

/** Apply a preset to a 2D canvas context in place. */
export function applyFilterToContext(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  preset: FilterId,
): void {
  if (preset === 'none' || width <= 0 || height <= 0) return
  const image = context.getImageData(0, 0, width, height)
  filterPixels(image.data, preset)
  context.putImageData(image, 0, 0)
}
