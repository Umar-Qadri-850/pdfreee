/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { PDFDocument } from 'pdf-lib'
import { PdfError } from './errors'
import { addPageNumbers, addWatermark } from './overlay'
import { compressLossless } from './compress'
import {
  deletePages,
  extractPages,
  getPageCount,
  getPageSizes,
  mergePdfs,
  reorderPages,
  rotatePages,
  splitPdf,
  verifyPdf,
} from './operations'

/**
 * End-to-end coverage of every tool operation that runs on pdf-lib, driven by a
 * real on-disk fixture (`npm run fixture`) whose pages carry SELECTABLE text
 * (verified separately with PDF.js getTextContent). Each result is reopened to
 * prove the output is a valid, complete document — not just non-empty bytes.
 *
 * PDF.js-backed tools (render to image, text extraction, rasterise compress) and
 * DOM image tools require a browser canvas/bitmap and are verified manually; see
 * FEATURE_MATRIX.md.
 */
const FIXTURE = resolve(process.cwd(), 'test/fixtures/sample-4page.pdf')
const fixtureBytes = new Uint8Array(readFileSync(FIXTURE))

const A4 = { width: 595.28, height: 841.89 }
const A4_LANDSCAPE = { width: 841.89, height: 595.28 }

function pdfFile(bytes: Uint8Array, name: string): File {
  const copy = bytes.slice()
  return new File([copy.buffer as ArrayBuffer], name, { type: 'application/pdf' })
}

async function reload(bytes: Uint8Array): Promise<PDFDocument> {
  return PDFDocument.load(bytes)
}

describe('fixture sanity', () => {
  it('is a 4-page PDF with three portrait pages and one landscape page', async () => {
    expect(await getPageCount(fixtureBytes)).toBe(4)
    expect(await getPageSizes(fixtureBytes)).toEqual([A4, A4, A4_LANDSCAPE, A4])
    await expect(reload(fixtureBytes)).resolves.toBeTruthy()
  })
})

describe('tool pipeline on the real fixture', () => {
  it('merge: two copies concatenate to 8 pages and reopen', async () => {
    const merged = await mergePdfs([
      pdfFile(fixtureBytes, 'sample-4page.pdf'),
      pdfFile(fixtureBytes, 'sample-4page.pdf'),
    ])
    expect(await getPageCount(merged)).toBe(8)
    expect(await getPageSizes(merged)).toEqual([A4, A4, A4_LANDSCAPE, A4, A4, A4, A4_LANDSCAPE, A4])
    await expect(reload(merged)).resolves.toBeTruthy()
  })

  it('split: produces one valid document per selection', async () => {
    const parts = await splitPdf(fixtureBytes, [[1, 2], [3], [4]], 'sample-4page')
    expect(parts.map((p) => p.name)).toEqual([
      'sample-4page-pages-1-2.pdf',
      'sample-4page-pages-3.pdf',
      'sample-4page-pages-4.pdf',
    ])
    expect(await getPageCount(parts[0].bytes)).toBe(2)
    expect(await getPageSizes(parts[2].bytes)).toEqual([A4])
    for (const part of parts) await verifyPdf(part.bytes, part.name.includes('1-2') ? 2 : 1)
  })

  it('extract: keeps only the requested pages, in the requested order', async () => {
    const out = await extractPages(fixtureBytes, [3, 1])
    expect(await getPageSizes(out)).toEqual([A4_LANDSCAPE, A4])
    await expect(reload(out)).resolves.toBeTruthy()
  })

  it('delete: removes a page and keeps the rest', async () => {
    const out = await deletePages(fixtureBytes, [2])
    expect(await getPageSizes(out)).toEqual([A4, A4_LANDSCAPE, A4])
  })

  it('reorder: reverses all four pages', async () => {
    const out = await reorderPages(fixtureBytes, [4, 3, 2, 1])
    expect(await getPageSizes(out)).toEqual([A4, A4_LANDSCAPE, A4, A4])
  })

  it('rotate: rotating page 1 by 90° swaps its reported dimensions', async () => {
    const out = await rotatePages(fixtureBytes, { angle: 90, pages: [1] })
    expect((await getPageSizes(out))[0]).toEqual(A4_LANDSCAPE)
  })

  it('page numbers: stamps and keeps all four pages', async () => {
    const out = await addPageNumbers(fixtureBytes, {
      position: 'bottom-center',
      startNumber: 1,
      startPage: 1,
      format: 'page-n-of-total',
      fontSize: 12,
      margin: 36,
    })
    expect(await getPageCount(out)).toBe(4)
    await expect(reload(out)).resolves.toBeTruthy()
  })

  it('watermark: stamps and keeps all four pages', async () => {
    const out = await addWatermark(fixtureBytes, {
      text: 'CONFIDENTIAL',
      fontSize: 48,
      opacity: 0.25,
      rotation: 45,
      color: '#e2494d',
    })
    expect(await getPageCount(out)).toBe(4)
    await expect(reload(out)).resolves.toBeTruthy()
  })

  it('compress (lossless, strip metadata): keeps pages and clears metadata', async () => {
    const out = await compressLossless(fixtureBytes, { stripMetadata: true })
    expect(await getPageCount(out)).toBe(4)
    const doc = await reload(out)
    expect(doc.getTitle()).toBe('')
    expect(doc.getAuthor()).toBe('')
  })

  it('verifyPdf rejects an unexpected page count', async () => {
    await expect(verifyPdf(fixtureBytes, 5)).rejects.toBeInstanceOf(PdfError)
  })
})
