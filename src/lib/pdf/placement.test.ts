import { describe, expect, it } from 'vitest'
import { PDFDocument } from 'pdf-lib'
import {
  embedImageFile,
  pdfPointToPreview,
  previewAngle,
  previewPointToPdf,
  previewRectToPdf,
  rotationDegrees,
  type Transform,
} from './placement'
import { getPageCount, getPageSizes } from './operations'

/** Rotation-0 viewport for a 595.28×841.89 pt page at scale 1.5, top-left origin. */
const A4_PORTRAIT: Transform = [1.5, 0, 0, -1.5, 0, 841.89 * 1.5]

/** Rotation-0 viewport for an 841.89×595.28 pt landscape page at scale 1.5. */
const A4_LANDSCAPE: Transform = [1.5, 0, 0, -1.5, 0, 595.28 * 1.5]

/** 1×1 transparent PNG - a valid, self-contained image for embedding tests. */
const TINY_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='

function pngFile(): File {
  const bytes = Buffer.from(TINY_PNG_BASE64, 'base64')
  return new File([new Uint8Array(bytes)], 'dot.png', { type: 'image/png' })
}

describe('preview ↔ PDF coordinate mapping', () => {
  it('maps a preview point to PDF points with a bottom-left origin (rotation 0)', () => {
    const point = previewPointToPdf(A4_PORTRAIT, 100, 200)
    expect(point.x).toBeCloseTo(100 / 1.5, 5)
    expect(point.y).toBeCloseTo(841.89 - 200 / 1.5, 5)
  })

  it('converts a preview rectangle to a same-sized PDF placement (rotation 0)', () => {
    const placement = previewRectToPdf(A4_PORTRAIT, 100, 200, 150, 60)
    expect(placement.x).toBeCloseTo(100 / 1.5, 5)
    expect(placement.y).toBeCloseTo(841.89 - 260 / 1.5, 5)
    expect(placement.width).toBeCloseTo(100, 5)
    expect(placement.height).toBeCloseTo(40, 5)
    expect(placement.rotation).toBeCloseTo(0, 6)
  })

  it('keeps the preview aspect ratio on a landscape page', () => {
    const placement = previewRectToPdf(A4_LANDSCAPE, 10, 20, 300, 150)
    expect(placement.width / placement.height).toBeCloseTo(2, 5)
    expect(placement.rotation).toBeCloseTo(0, 6)
  })

  it('reports zero rotation for the preview +x axis on an unrotated page', () => {
    expect(previewAngle(A4_PORTRAIT, 123, 456)).toBeCloseTo(0, 6)
  })

  it('produces an upright angle (multiples of 90°) on rotated viewports', () => {
    // A 90°-rotated page at scale 1.5: viewport swaps the axes.
    const rotated: Transform = [0, 1.5, 1.5, 0, 0, 0]
    const angle = previewAngle(rotated, 50, 50)
    expect(Math.abs(Math.abs(angle) - Math.PI / 2)).toBeLessThan(1e-6)
    // Round-trip: forward-applying the transform recovers the preview point.
    const pdf = previewPointToPdf(rotated, 50, 75)
    const screenX = rotated[0] * pdf.x + rotated[2] * pdf.y + rotated[4]
    const screenY = rotated[1] * pdf.x + rotated[3] * pdf.y + rotated[5]
    expect(screenX).toBeCloseTo(50, 4)
    expect(screenY).toBeCloseTo(75, 4)
  })

  it('maps PDF points back to preview pixels (inverse of previewPointToPdf)', () => {
    for (const transform of [A4_PORTRAIT, A4_LANDSCAPE, [0, 1.5, 1.5, 0, 0, 0] as Transform]) {
      const pdf = previewPointToPdf(transform, 123, 456)
      const back = pdfPointToPreview(transform, pdf.x, pdf.y)
      expect(back.x).toBeCloseTo(123, 4)
      expect(back.y).toBeCloseTo(456, 4)
    }
  })

  it('converts radians to pdf-lib degrees', () => {
    expect(rotationDegrees(Math.PI / 2).angle).toBeCloseTo(90, 5)
  })
})

describe('embedImageFile', () => {
  it('embeds a PNG file and preserves intrinsic size', async () => {
    const pdf = await PDFDocument.create()
    const embedded = await embedImageFile(pdf, pngFile())
    expect(embedded.width).toBe(1)
    expect(embedded.height).toBe(1)
  })
})

describe('image placement export', () => {
  it('draws an embedded image onto the correct pages and keeps the document valid', async () => {
    const source = await PDFDocument.create()
    source.addPage([595.28, 841.89])
    source.addPage([841.89, 595.28])
    const input = await source.save()

    const pdf = await PDFDocument.load(input)
    const embedded = await embedImageFile(pdf, pngFile())

    const placements = [
      { page: 0, transform: A4_PORTRAIT },
      { page: 1, transform: A4_LANDSCAPE },
    ]
    for (const item of placements) {
      const page = pdf.getPage(item.page)
      const pos = previewRectToPdf(item.transform, 100, 120, 240, 90)
      page.drawImage(embedded.image, {
        x: pos.x,
        y: pos.y,
        width: pos.width,
        height: pos.height,
        rotate: rotationDegrees(pos.rotation),
      })
    }

    const out = new Uint8Array(await pdf.save())
    expect(await getPageCount(out)).toBe(2)
    expect(await getPageSizes(out)).toEqual([
      { width: 595.28, height: 841.89 },
      { width: 841.89, height: 595.28 },
    ])
    await expect(PDFDocument.load(out)).resolves.toBeTruthy()
  })
})
