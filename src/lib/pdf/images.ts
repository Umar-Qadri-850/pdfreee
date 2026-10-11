import { PDFDocument, rgb } from 'pdf-lib'
import { PdfError } from './errors'
import { parsePageRanges } from './range'

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
  /** Page range string; empty means all pages. */
  range?: string
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
    if (options.range && options.range.trim()) {
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
      const rendered = await renderPageToBlob(page, {
        scale,
        type: options.format,
        quality: options.quality,
        signal: options.signal,
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
  onProgress?: (fraction: number, message?: string) => void
}

interface NormalizedImage {
  bytes: Uint8Array
  kind: 'jpg' | 'png'
  width: number
  height: number
}

/** Decode any supported image (incl. WebP + EXIF orientation) to JPG/PNG bytes. */
async function normalizeImage(file: File): Promise<NormalizedImage> {
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
    const image = await normalizeImage(files[i])
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
