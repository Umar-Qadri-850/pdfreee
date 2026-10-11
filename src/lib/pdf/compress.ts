import { PDFDocument } from 'pdf-lib'
import { loadPdf } from './operations'

export interface CompressResult {
  bytes: Uint8Array
  originalSize: number
  newSize: number
  /** True when the produced file is smaller than the input. */
  smaller: boolean
}

/**
 * Lossless structural rewrite. Keeps every page and image exactly as-is; only
 * removes redundant objects and (optionally) document metadata. Cannot re-encode
 * images, so image-heavy files may not shrink.
 */
export async function compressLossless(
  bytes: Uint8Array,
  options: { stripMetadata?: boolean } = {},
): Promise<Uint8Array> {
  const doc = await loadPdf(bytes)
  if (options.stripMetadata) {
    doc.setTitle('')
    doc.setAuthor('')
    doc.setSubject('')
    doc.setKeywords([])
    doc.setProducer('Pdfreee')
    doc.setCreator('Pdfreee (browser PDF toolkit)')
  }
  return doc.save()
}

export interface RasterizeOptions {
  dpi: number
  quality: number
  onProgress?: (fraction: number, message?: string) => void
  signal?: AbortSignal
}

/**
 * Lossy compression by rasterising each page to a JPEG and rebuilding the PDF.
 * Text becomes an image: selects/search stops working and quality is reduced.
 * This is the only way to meaningfully shrink scanned, image-heavy documents
 * without a server, and the UI states this trade-off plainly.
 */
export async function compressRasterize(
  bytes: Uint8Array,
  options: RasterizeOptions,
): Promise<Uint8Array> {
  const { openPdfDocument, renderPageToBlob } = await import('./pdfjs')
  const data = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
  const src = await openPdfDocument(data)
  try {
    const out = await PDFDocument.create()
    out.setProducer('Pdfreee')
    out.setCreator('Pdfreee (browser PDF toolkit)')
    const scale = options.dpi / 72
    const total = src.numPages

    for (let p = 1; p <= total; p++) {
      if (options.signal?.aborted) throw new DOMException('Aborted', 'AbortError')
      const page = await src.getPage(p)
      const base = page.getViewport({ scale: 1 })
      const rendered = await renderPageToBlob(page, {
        scale,
        type: 'image/jpeg',
        quality: options.quality,
        signal: options.signal,
      })
      const jpgBytes = new Uint8Array(await rendered.blob.arrayBuffer())
      const embedded = await out.embedJpg(jpgBytes)
      const newPage = out.addPage([base.width, base.height])
      newPage.drawImage(embedded, { x: 0, y: 0, width: base.width, height: base.height })
      options.onProgress?.(p / total, `Compressed page ${p} of ${total}`)
    }
    return out.save()
  } finally {
    await src.close()
  }
}
