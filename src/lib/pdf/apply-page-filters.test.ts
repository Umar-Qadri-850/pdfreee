/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { deflateSync } from 'node:zlib'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PDFDocument, StandardFonts } from 'pdf-lib'
import { applyPageFilters } from './images'
import { PdfError } from './errors'

// pdf.js canvas rendering cannot run under jsdom, so the rasterizer module is
// mocked here; the rest of the pipeline uses the real pdf-lib implementation.
vi.mock('./pdfjs', () => ({
  openPdfDocument: vi.fn(),
  renderPageToBlob: vi.fn(),
}))

import { openPdfDocument, renderPageToBlob } from './pdfjs'

/**
 * End-to-end coverage of the page-filter export builder (applyPageFilters).
 *
 * pdf.js canvas rendering cannot run under jsdom, so the rasterizer
 * (openPdfDocument / renderPageToBlob) is mocked while pdf-lib's real
 * copy/embed/save pipeline runs against real PDF bytes: the on-disk 4-page
 * fixture (3 portrait + 1 landscape) and documents generated at 5 and 12
 * pages. This proves page order and dimensions are preserved, only selected
 * pages are rasterised, progress completes, abort/abort errors surface, and
 * the result is a valid multi-page PDF.
 */

const openMock = vi.mocked(openPdfDocument)
const renderMock = vi.mocked(renderPageToBlob)

const FIXTURE = resolve(process.cwd(), 'test/fixtures/sample-4page.pdf')
const fixtureBytes = new Uint8Array(readFileSync(FIXTURE))

const A4 = { width: 595.28, height: 841.89 }
const A4_LANDSCAPE = { width: 841.89, height: 595.28 }

function closeTo(actual: { width: number; height: number }, expected: typeof A4) {
  expect(Math.abs(actual.width - expected.width)).toBeLessThan(1)
  expect(Math.abs(actual.height - expected.height)).toBeLessThan(1)
}

/** Build a valid 1×1 truecolor PNG (tiny but embeddable by pdf-lib). */
function pngBytes(): Buffer {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  const crc32 = (buffer: Buffer): number => {
    let crc = 0xffffffff
    for (let i = 0; i < buffer.length; i++) {
      crc ^= buffer[i]
      for (let k = 0; k < 8; k++) crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1
    }
    return (crc ^ 0xffffffff) >>> 0
  }
  const chunk = (type: string, data: Buffer) => {
    const typeBuf = Buffer.from(type, 'ascii')
    const body = Buffer.concat([typeBuf, data])
    const length = Buffer.alloc(4)
    length.writeUInt32BE(data.length, 0)
    const crc = Buffer.alloc(4)
    crc.writeUInt32BE(crc32(body), 0)
    return Buffer.concat([length, body, crc])
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(1, 0)
  ihdr.writeUInt32BE(1, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 2 // color type: truecolor
  const idat = deflateSync(Buffer.from([0, 0, 0, 0])) // 1 row: filter 0 + one RGB pixel
  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

const png = pngBytes()

/** Fresh standalone ArrayBuffer copy of the PNG so Blob() accepts it. */
function pngCopy(): ArrayBuffer {
  const copy = new Uint8Array(png.byteLength)
  copy.set(new Uint8Array(png.buffer, png.byteOffset, png.byteLength))
  return copy.buffer
}

async function makePdf(pages: number): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  for (let i = 1; i <= pages; i++) {
    const page = doc.addPage([595.28, 841.89])
    page.drawText(`Page ${i}`, { x: 64, y: 780, size: 16, font })
  }
  return doc.save()
}

beforeEach(() => {
  const pageNumber = (page: unknown) => (page as { number: number }).number

  openMock.mockImplementation(
    (async () => ({
      getPage: async (n: number) => ({ number: n }),
      close: async () => {},
    })) as never,
  )

  renderMock.mockImplementation(
    (async (page: unknown, options: { scale?: number; type?: string; transform?: unknown }) => {
      const base: Record<number, [number, number]> = {
        1: [A4.width, A4.height],
        2: [A4.width, A4.height],
        3: [A4_LANDSCAPE.width, A4_LANDSCAPE.height],
        4: [A4.width, A4.height],
      }
      const scale = options.scale ?? 150 / 72
      const [w, h] = base[pageNumber(page)] ?? [A4.width, A4.height]
      expect(options.type).toBe('image/png')
      expect(options.transform).toBeTypeOf('function')
      return { blob: new Blob([pngCopy()], { type: 'image/png' }), width: Math.round(w * scale), height: Math.round(h * scale) }
    }) as never,
  )
})

describe('applyPageFilters', () => {
  it('returns bytes unchanged when filter is none, without touching pdf.js', async () => {
    await expect(applyPageFilters(fixtureBytes, { filter: 'none' })).resolves.toBe(fixtureBytes)
    expect(openMock).not.toHaveBeenCalled()
    expect(renderMock).not.toHaveBeenCalled()
  })

  it('keeps every page, filters only selected pages, and preserves copied (unfiltered) pages exactly', async () => {
    const progress: number[] = []
    const result = await applyPageFilters(fixtureBytes, {
      filter: 'blackwhite',
      pages: [1, 4],
      onProgress: (fraction) => progress.push(fraction),
    })

    const sizes = await getSizes(result)
    expect(sizes).toHaveLength(4)
    closeTo(sizes[0], A4)          // page 1 filtered
    expect(sizes[1]).toEqual(A4)          // page 2 copied verbatim
    expect(sizes[2]).toEqual(A4_LANDSCAPE) // page 3 copied verbatim (landscape kept)
    closeTo(sizes[3], A4)          // page 4 filtered

    const renderedPages = renderMock.mock.calls
      .map(([page]) => (page as unknown as { number: number }).number)
      .sort((a, b) => a - b)
    expect(renderedPages).toEqual([1, 4])
    expect(progress[progress.length - 1]).toBe(1)
    for (let i = 1; i < progress.length; i++) expect(progress[i]).toBeGreaterThanOrEqual(progress[i - 1])
  })

  it('filters every page when no range is given', async () => {
    const five = await makePdf(5)
    const result = await applyPageFilters(five, { filter: 'cool' })
    expect(await getSizes(result)).toHaveLength(5)
    expect(renderMock).toHaveBeenCalledTimes(5)
  })

  it('handles 10+ page documents and filters the final page', async () => {
    const twelve = await makePdf(12)
    const result = await applyPageFilters(twelve, {
      filter: 'sepia',
      pages: [1, 6, 12],
    })
    const sizes = await getSizes(result)
    expect(sizes).toHaveLength(12)
    const rendered = renderMock.mock.calls
      .map(([page]) => (page as unknown as { number: number }).number)
      .sort((a, b) => a - b)
    expect(rendered).toEqual([1, 6, 12])
  })

  it('throws a visible error when no page matches the selection', async () => {
    await expect(applyPageFilters(fixtureBytes, { filter: 'warm', pages: [99] })).rejects.toBeInstanceOf(
      PdfError,
    )
  })

  it('aborts cleanly when the signal fires and never leaves the app stuck', async () => {
    const controller = new AbortController()
    controller.abort()
    await expect(
      applyPageFilters(fixtureBytes, { filter: 'sepia', pages: [1, 4], signal: controller.signal }),
    ).rejects.toMatchObject({ name: 'AbortError' })
  })
})

async function getSizes(bytes: Uint8Array) {
  const doc = await PDFDocument.load(bytes)
  return doc.getPages().map((page) => {
    const { width, height } = page.getSize()
    const rotation = page.getRotation().angle
    const swapped = rotation === 90 || rotation === 270
    return { width: swapped ? height : width, height: swapped ? width : height }
  })
}