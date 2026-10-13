import { describe, expect, it } from 'vitest'
import { PDFDocument } from 'pdf-lib'
import { PdfError } from './errors'
import {
  cropPages,
  deletePages,
  extractPages,
  getPageCount,
  getPageSizes,
  loadPdf,
  mergePdfs,
  reorderPages,
  rotatePages,
  splitPdf,
  verifyPdf,
} from './operations'

/** Build an in-memory PDF whose pages have distinct, recognisable sizes. */
async function samplePdf(sizes: [number, number][]): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  for (const [width, height] of sizes) doc.addPage([width, height])
  return doc.save()
}

async function pdfFile(bytes: Uint8Array, name: string): Promise<File> {
  const copy = bytes.slice()
  return new File([copy.buffer as ArrayBuffer], name, { type: 'application/pdf' })
}

describe('loadPdf / verifyPdf', () => {
  it('loads a valid PDF and reports its page count', async () => {
    const bytes = await samplePdf([
      [200, 400],
      [300, 500],
    ])
    expect(await getPageCount(bytes)).toBe(2)
  })

  it('rejects non-PDF bytes with a corrupt PdfError', async () => {
    const junk = new TextEncoder().encode('not a pdf at all')
    await expect(loadPdf(junk)).rejects.toBeInstanceOf(PdfError)
  })

  it('throws when the verified page count does not match', async () => {
    const bytes = await samplePdf([[200, 400]])
    await expect(verifyPdf(bytes, 2)).rejects.toBeInstanceOf(PdfError)
    await expect(verifyPdf(bytes, 1)).resolves.toBeUndefined()
  })
})

describe('extractPages', () => {
  it('keeps only the requested pages and reports sizes that match', async () => {
    const bytes = await samplePdf([
      [100, 100],
      [200, 200],
      [300, 300],
    ])
    const out = await extractPages(bytes, [2])
    expect(await getPageCount(out)).toBe(1)
    expect(await getPageSizes(out)).toEqual([{ width: 200, height: 200 }])
  })

  it('respects the order the pages are listed in', async () => {
    const bytes = await samplePdf([
      [100, 100],
      [200, 200],
      [300, 300],
    ])
    const out = await extractPages(bytes, [3, 1])
    expect(await getPageSizes(out)).toEqual([
      { width: 300, height: 300 },
      { width: 100, height: 100 },
    ])
  })
})

describe('deletePages', () => {
  it('removes the given pages and keeps the rest in order', async () => {
    const bytes = await samplePdf([
      [100, 100],
      [200, 200],
      [300, 300],
    ])
    const out = await deletePages(bytes, [1])
    expect(await getPageSizes(out)).toEqual([
      { width: 200, height: 200 },
      { width: 300, height: 300 },
    ])
  })

  it('refuses to delete every page', async () => {
    const bytes = await samplePdf([[100, 100]])
    await expect(deletePages(bytes, [1])).rejects.toBeInstanceOf(PdfError)
  })
})

describe('reorderPages', () => {
  it('rebuilds the document in the supplied order', async () => {
    const bytes = await samplePdf([
      [100, 100],
      [200, 200],
      [300, 300],
    ])
    const out = await reorderPages(bytes, [3, 1, 2])
    expect(await getPageSizes(out)).toEqual([
      { width: 300, height: 300 },
      { width: 100, height: 100 },
      { width: 200, height: 200 },
    ])
  })

  it('rejects an order that omits or duplicates pages', async () => {
    const bytes = await samplePdf([
      [100, 100],
      [200, 200],
    ])
    await expect(reorderPages(bytes, [1, 1])).rejects.toBeInstanceOf(PdfError)
    await expect(reorderPages(bytes, [1])).rejects.toBeInstanceOf(PdfError)
  })
})

describe('rotatePages', () => {
  it('rotates all pages and swaps reported width/height for 90 degrees', async () => {
    const bytes = await samplePdf([[200, 400]])
    const out = await rotatePages(bytes, { angle: 90 })
    expect(await getPageSizes(out)).toEqual([{ width: 400, height: 200 }])
  })

  it('rotates only the selected pages', async () => {
    const bytes = await samplePdf([
      [200, 400],
      [200, 400],
    ])
    const out = await rotatePages(bytes, { angle: 90, pages: [2] })
    expect(await getPageSizes(out)).toEqual([
      { width: 200, height: 400 },
      { width: 400, height: 200 },
    ])
  })

  it('accumulates rotation on repeated calls (90 + 270 == 360)', async () => {
    const bytes = await samplePdf([[200, 400]])
    const once = await rotatePages(bytes, { angle: 90 })
    const twice = await rotatePages(once, { angle: 270 })
    expect(await getPageSizes(twice)).toEqual([{ width: 200, height: 400 }])
  })
})

describe('cropPages', () => {
  it('trims the requested margins from every page', async () => {
    const bytes = await samplePdf([[200, 400]])
    const out = await cropPages(bytes, { top: 0.1, right: 0.1, bottom: 0.1, left: 0.1 })
    expect(await getPageSizes(out)).toEqual([{ width: 160, height: 320 }])
  })

  it('crops only the selected pages', async () => {
    const bytes = await samplePdf([
      [200, 400],
      [200, 400],
    ])
    const out = await cropPages(
      bytes,
      { top: 0, right: 0.5, bottom: 0, left: 0 },
      [2],
    )
    expect(await getPageSizes(out)).toEqual([
      { width: 200, height: 400 },
      { width: 100, height: 400 },
    ])
  })

  it('rejects margins that would remove the whole page', async () => {
    const bytes = await samplePdf([[200, 400]])
    await expect(
      cropPages(bytes, { top: 0.6, right: 0, bottom: 0.6, left: 0 }),
    ).rejects.toBeInstanceOf(PdfError)
  })
})

describe('splitPdf', () => {
  it('creates one document per selection with descriptive names', async () => {
    const bytes = await samplePdf([
      [100, 100],
      [200, 200],
      [300, 300],
      [400, 400],
    ])
    const parts = await splitPdf(bytes, [[1, 2], [3], [4]], 'doc')
    expect(parts).toHaveLength(3)
    expect(parts[0].name).toBe('doc-pages-1-2.pdf')
    expect(parts[1].name).toBe('doc-pages-3.pdf')
    expect(await getPageCount(parts[0].bytes)).toBe(2)
    expect(await getPageCount(parts[2].bytes)).toBe(1)
  })
})

describe('mergePdfs', () => {
  it('concatenates files in the given order', async () => {
    const first = await samplePdf([
      [100, 100],
      [200, 200],
    ])
    const second = await samplePdf([[300, 300]])
    const merged = await mergePdfs([await pdfFile(first, 'a.pdf'), await pdfFile(second, 'b.pdf')])
    expect(await getPageSizes(merged)).toEqual([
      { width: 100, height: 100 },
      { width: 200, height: 200 },
      { width: 300, height: 300 },
    ])
  })

  it('reports progress while merging', async () => {
    const a = await samplePdf([[100, 100]])
    const seen: number[] = []
    await mergePdfs([await pdfFile(a, 'a.pdf'), await pdfFile(a, 'b.pdf')], (f) => seen.push(f))
    expect(seen).toEqual([0.5, 1])
  })
})
