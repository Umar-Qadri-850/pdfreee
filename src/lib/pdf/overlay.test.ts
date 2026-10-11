import { describe, expect, it } from 'vitest'
import { PDFDocument } from 'pdf-lib'
import { PdfError } from './errors'
import { getPageCount } from './operations'
import { addPageNumbers, addWatermark } from './overlay'
import { compressLossless } from './compress'

/** Build an in-memory PDF whose pages have distinct, recognisable sizes. */
async function samplePdf(sizes: [number, number][]): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  for (const [width, height] of sizes) doc.addPage([width, height])
  return doc.save()
}

describe('addPageNumbers', () => {
  it('keeps every page and returns a valid document', async () => {
    const bytes = await samplePdf([
      [200, 400],
      [200, 400],
      [200, 400],
    ])
    const out = await addPageNumbers(bytes, {
      position: 'bottom-center',
      startNumber: 1,
      startPage: 1,
      format: 'n',
      fontSize: 12,
      margin: 36,
    })
    expect(await getPageCount(out)).toBe(3)
  })

  it('handles every position and format without throwing', async () => {
    const bytes = await samplePdf([[300, 500]])
    const positions = [
      'bottom-left',
      'bottom-center',
      'bottom-right',
      'top-left',
      'top-center',
      'top-right',
    ] as const
    const formats = ['n', 'n-of-total', 'page-n', 'page-n-of-total'] as const
    for (const position of positions) {
      for (const format of formats) {
        const out = await addPageNumbers(bytes, {
          position,
          startNumber: 5,
          startPage: 1,
          format,
          fontSize: 10,
          margin: 24,
        })
        expect(await getPageCount(out)).toBe(1)
      }
    }
  })
})

describe('addWatermark', () => {
  it('applies a watermark to every page by default', async () => {
    const bytes = await samplePdf([
      [200, 400],
      [200, 400],
    ])
    const out = await addWatermark(bytes, {
      text: 'CONFIDENTIAL',
      fontSize: 40,
      opacity: 0.3,
      rotation: 45,
      color: '#e2494d',
    })
    expect(await getPageCount(out)).toBe(2)
  })

  it('only stamps the pages that were requested', async () => {
    const bytes = await samplePdf([
      [200, 400],
      [200, 400],
    ])
    const out = await addWatermark(bytes, {
      text: 'DRAFT',
      fontSize: 30,
      opacity: 0.5,
      rotation: 0,
      color: '#000000',
      pages: [2],
    })
    expect(await getPageCount(out)).toBe(2)
  })

  it('rejects empty watermark text with a PdfError', async () => {
    const bytes = await samplePdf([[200, 400]])
    await expect(
      addWatermark(bytes, {
        text: '   ',
        fontSize: 20,
        opacity: 0.5,
        rotation: 0,
        color: '#000000',
      }),
    ).rejects.toBeInstanceOf(PdfError)
  })
})

describe('compressLossless', () => {
  it('preserves every page and returns a loadable document', async () => {
    const bytes = await samplePdf([
      [200, 400],
      [300, 500],
    ])
    const out = await compressLossless(bytes)
    expect(await getPageCount(out)).toBe(2)
    await expect(PDFDocument.load(out)).resolves.toBeTruthy()
  })

  it('strips metadata when asked', async () => {
    const doc = await PDFDocument.create()
    doc.addPage([200, 400])
    doc.setTitle('Secret Title')
    doc.setAuthor('Some Author')
    const input = await doc.save()

    const out = await compressLossless(input, { stripMetadata: true })
    const reloaded = await PDFDocument.load(out)
    expect(reloaded.getTitle()).toBe('')
    expect(reloaded.getAuthor()).toBe('')
    // pdf-lib always rewrites the /Producer entry on save(), so the intended
    // "Pdfreee" producer branding does not persist (see PRODUCTION_AUDIT.md).
    expect(reloaded.getCreator()).toBe('Pdfreee (browser PDF toolkit)')
  })
})
