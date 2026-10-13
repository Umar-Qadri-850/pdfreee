import { PDFDocument, rgb } from 'pdf-lib'
import { PdfError } from './errors'
import { parsePageRanges } from './range'
import { applyFilterToContext, type FilterId } from './filters'
import { verifyPdf, type ProgressFn } from './operations'

const PT_PER_MM = 2.834645669

const PAGE_SIZES: Record<string, { width: number; height: number }> = {
  a4: { width: 595.28, height: 841.89 },
  letter: { width: 612, height: 792 },
  legal: { width: 612, height: 1008 },
  a3: { width: 841.89, height: 1190.55 },
}

export interface PdfToImageOptions {
  dpi: number
  format: 'image/jpeg' | 'image/png'
  quality: number
  /** Page range string; empty means all pages. Ignored when `pages` is set. */
  range?: string
  /** Explicit 1-based page numbers; takes precedence over `range`. */
  pages?: number[]
  /** Optional raster filter applied to each rendered page. */
  filter?: FilterId
  onProgress?: (fraction: number, message?: string) => void
  signal?: AbortSignal
}

export interface RenderedImage {
  page: number
  blob: Blob
  width: number
  height: number
}

/**
 * Render selected PDF pages to images. PDF.js and the renderer are imported
 * lazily so this stays out of the main bundle.
 */
export async function pdfToImages(
  bytes: Uint8Array,
  options: PdfToImageOptions,
): Promise<RenderedImage[]> {
  const { openPdfDocument, renderPageToBlob } = await import('./pdfjs')
  const data = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
  const doc = await openPdfDocument(data)
  try {
    const total = doc.numPages
    let pages: number[]
    if (options.pages && options.pages.length) {
      pages = options.pages.filter((p) => p >= 1 && p <= total)
    } else if (options.range && options.range.trim()) {
      const parsed = parsePageRanges(options.range, total)
      if (parsed.error) throw new PdfError('unsupported', parsed.error)
      pages = parsed.pages
    } else {
      pages = Array.from({ length: total }, (_, i) => i + 1)
    }

    const scale = options.dpi / 72
    const out: RenderedImage[] = []
    for (let i = 0; i < pages.length; i++) {
      if (options.signal?.aborted) throw new DOMException('Aborted', 'AbortError')
      const page = await doc.getPage(pages[i])
      const filter = options.filter
      const rendered = await renderPageToBlob(page, {
        scale,
        type: options.format,
        quality: options.quality,
        signal: options.signal,
        transform:
          filter && filter !== 'none'
            ? (context, width, height) => applyFilterToContext(context, width, height, filter)
            : undefined,
      })
      out.push({ page: pages[i], ...rendered })
      options.onProgress?.((i + 1) / pages.length, `Rendered page ${pages[i]}`)
    }
    if (out.length === 0) throw new PdfError('no-pages', 'No pages were selected.')
    return out
  } finally {
    await doc.close()
  }
}

export interface ImageToPdfOptions {
  pageSize: keyof typeof PAGE_SIZES | 'fit'
  orientation: 'portrait' | 'landscape' | 'auto'
  marginMm: number
  /** Optional raster filter applied to each source image before embedding. */
  filter?: FilterId
  onProgress?: (fraction: number, message?: string) => void
}

interface NormalizedImage {
  bytes: Uint8Array
  kind: 'jpg' | 'png'
  width: number
  height: number
}

/** Decode any supported image (incl. WebP + EXIF orientation) to JPG/PNG bytes. */
async function normalizeImage(file: File, filter: FilterId = 'none'): Promise<NormalizedImage> {
  const bitmap = await loadBitmap(file)
  const width = bitmap.width
  const height = bitmap.height
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new PdfError('unsupported', 'This browser could not process the image.')
  ctx.drawImage(bitmap as CanvasImageSource, 0, 0)
  if ('close' in bitmap && typeof bitmap.close === 'function') bitmap.close()
  applyFilterToContext(ctx, width, height, filter)

  const fileType = file.type
  const isPng = fileType === 'image/png'
  const isWebp = fileType === 'image/webp'
  const outputType = isPng || isWebp ? 'image/png' : 'image/jpeg'
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, outputType, outputType === 'image/jpeg' ? 0.92 : undefined),
  )
  canvas.width = 0
  canvas.height = 0
  if (!blob) throw new PdfError('unsupported', 'The image could not be encoded.')
  return {
    bytes: new Uint8Array(await blob.arrayBuffer()),
    kind: outputType === 'image/png' ? 'png' : 'jpg',
    width,
    height,
  }
}

async function loadBitmap(file: File): Promise<ImageBitmap> {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' } as ImageBitmapOptions)
    } catch {
      return await createImageBitmap(file)
    }
  }
  throw new PdfError('unsupported', 'This browser does not support the image APIs required.')
}

export async function imagesToPdf(files: File[], options: ImageToPdfOptions): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  doc.setProducer('Pdfreee')
  doc.setCreator('Pdfreee (browser PDF toolkit)')
  const margin = Math.max(0, options.marginMm) * PT_PER_MM

  for (let i = 0; i < files.length; i++) {
    options.onProgress?.((i + 0.5) / files.length, `Processing ${files[i].name}`)
    const image = await normalizeImage(files[i], options.filter ?? 'none')
    const embedded =
      image.kind === 'png' ? await doc.embedPng(image.bytes) : await doc.embedJpg(image.bytes)

    let pageWidth: number
    let pageHeight: number
    if (options.pageSize === 'fit') {
      pageWidth = image.width + margin * 2
      pageHeight = image.height + margin * 2
    } else {
      const base = PAGE_SIZES[options.pageSize]
      const landscape =
        options.orientation === 'auto'
          ? image.width > image.height
          : options.orientation === 'landscape'
      pageWidth = landscape ? base.height : base.width
      pageHeight = landscape ? base.width : base.height
    }

    const page = doc.addPage([pageWidth, pageHeight])
    page.drawRectangle({ x: 0, y: 0, width: pageWidth, height: pageHeight, color: rgb(1, 1, 1) })

    const usableW = Math.max(1, pageWidth - margin * 2)
    const usableH = Math.max(1, pageHeight - margin * 2)
    const scale = Math.min(usableW / image.width, usableH / image.height)
    const drawW = image.width * scale
    const drawH = image.height * scale
    page.drawImage(embedded, {
      x: (pageWidth - drawW) / 2,
      y: (pageHeight - drawH) / 2,
      width: drawW,
      height: drawH,
    })
    options.onProgress?.((i + 1) / files.length, `Added ${i + 1} of ${files.length}`)
  }

  if (files.length === 0) throw new PdfError('empty', 'Add at least one image.')
  return doc.save()
}

export interface PageFilterOptions {
  filter: FilterId
  /** 1-based pages to rasterise and filter; empty means every page. */
  pages?: number[]
  /** Rendering DPI for the rasterised pages (default 150). */
  dpi?: number
  onProgress?: ProgressFn
  signal?: AbortSignal
}

/**
 * Rasterise only the selected pages through a filter and rebuild the PDF:
 * filtered pages become full-page images, while every other page is copied
 * through as vector so its text stays selectable. This is the opt-in page
 * filter behind "Edit PDF" — it never silently rasterises the whole document.
 *
 * Pages are processed strictly in order, one at a time: each page is rendered,
 * embedded, and released before the next begins, so memory never holds every
 * rasterised page at once. The result is verified to contain every page, so a
 * dropped page can never be reported as success.
 */
export async function applyPageFilters(
  bytes: Uint8Array,
  options: PageFilterOptions,
): Promise<Uint8Array> {
  const { filter, signal } = options
  if (filter === 'none' || !bytes.byteLength) return bytes
  const dpi = options.dpi ?? 150
  const scale = dpi / 72

  const { openPdfDocument, renderPageToBlob } = await import('./pdfjs')
  const data = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
  const source = await PDFDocument.load(bytes)
  const out = await PDFDocument.create()
  out.setProducer('Pdfreee')
  out.setCreator('Pdfreee (browser PDF toolkit)')
  const total = source.getPageCount()
  const selected =
    options.pages && options.pages.length
      ? new Set(options.pages.filter((p) => p >= 1 && p <= total))
      : null

  let filteredCount = 0
  const renderDoc = await openPdfDocument(data)
  try {
    for (let i = 1; i <= total; i++) {
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
      if (selected && !selected.has(i)) {
        const [copied] = await out.copyPages(source, [i - 1])
        out.addPage(copied)
        continue
      }
      const page = await renderDoc.getPage(i)
      const rendered = await renderPageToBlob(page, {
        scale,
        type: 'image/png',
        quality: 0.92,
        signal,
        transform: (context, width, height) => applyFilterToContext(context, width, height, filter),
      })
      const width = rendered.width / scale
      const height = rendered.height / scale
      const image = await out.embedPng(new Uint8Array(await rendered.blob.arrayBuffer()))
      const pageOut = out.addPage([width, height])
      pageOut.drawImage(image, { x: 0, y: 0, width, height })
      filteredCount += 1
      options.onProgress?.(0.05 + (0.85 * i) / total, `Filtered page ${i} of ${total}`)
    }
  } finally {
    await renderDoc.close()
  }

  if (filteredCount === 0) {
    throw new PdfError('no-pages', 'No pages matched the filter selection.')
  }
  options.onProgress?.(0.95, 'Saving')
  const result = await out.save()
  await verifyPdf(result, total)
  options.onProgress?.(1, 'Done')
  return result
}
