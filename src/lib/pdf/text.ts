import { PdfError } from './errors'
import { parsePageRanges } from './range'

export interface ExtractedPage {
  page: number
  text: string
}

export interface ExtractTextResult {
  pages: ExtractedPage[]
  full: string
  characters: number
}

export interface ExtractTextOptions {
  range?: string
  onProgress?: (fraction: number, message?: string) => void
  signal?: AbortSignal
}

/** Extract selectable text. Image-only (scanned) PDFs will return little or nothing. */
export async function extractText(
  bytes: Uint8Array,
  options: ExtractTextOptions = {},
): Promise<ExtractTextResult> {
  const { openPdfDocument } = await import('./pdfjs')
  const data = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
  const doc = await openPdfDocument(data)
  try {
    const total = doc.numPages
    let pagesToRead: number[]
    if (options.range && options.range.trim()) {
      const parsed = parsePageRanges(options.range, total)
      if (parsed.error) throw new PdfError('unsupported', parsed.error)
      pagesToRead = parsed.pages
    } else {
      pagesToRead = Array.from({ length: total }, (_, i) => i + 1)
    }

    const pages: ExtractedPage[] = []
    for (let i = 0; i < pagesToRead.length; i++) {
      if (options.signal?.aborted) throw new DOMException('Aborted', 'AbortError')
      const pageNumber = pagesToRead[i]
      const page = await doc.getPage(pageNumber)
      const content = await page.getTextContent()
      pages.push({ page: pageNumber, text: itemsToText(content.items) })
      options.onProgress?.((i + 1) / pagesToRead.length, `Read page ${pageNumber}`)
    }

    const full = pages
      .map((p) => `--- Page ${p.page} ---\n${p.text}`)
      .join('\n\n')
    const characters = pages.reduce((sum, p) => sum + p.text.replace(/\s/g, '').length, 0)
    return { pages, full, characters }
  } finally {
    await doc.close()
  }
}

interface TextItemLike {
  str?: string
  hasEOL?: boolean
  transform?: number[]
}

function itemsToText(items: unknown[]): string {
  const lines: string[] = []
  let current = ''
  let lastY: number | null = null

  for (const raw of items) {
    const item = raw as TextItemLike
    if (typeof item.str !== 'string') continue
    const y = Array.isArray(item.transform) ? item.transform[5] : null
    if (lastY !== null && y !== null && Math.abs(y - lastY) > 2 && current.trim()) {
      lines.push(current.trimEnd())
      current = ''
    }
    current += item.str
    if (item.hasEOL && current.trim()) {
      lines.push(current.trimEnd())
      current = ''
    }
    if (y !== null) lastY = y
  }
  if (current.trim()) lines.push(current.trimEnd())
  return lines.join('\n')
}
