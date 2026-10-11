import { PDFDocument, StandardFonts, degrees, rgb } from 'pdf-lib'
import { PdfError } from './errors'
import { loadPdf } from './operations'

export type NumberPosition =
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right'
  | 'top-left'
  | 'top-center'
  | 'top-right'

export interface PageNumberOptions {
  position: NumberPosition
  startNumber: number
  /** 1-based first page that receives a number. */
  startPage: number
  format: 'n' | 'n-of-total' | 'page-n' | 'page-n-of-total'
  fontSize: number
  margin: number
}

function formatLabel(format: PageNumberOptions['format'], n: number, total: number): string {
  switch (format) {
    case 'n-of-total':
      return `${n} / ${total}`
    case 'page-n':
      return `Page ${n}`
    case 'page-n-of-total':
      return `Page ${n} of ${total}`
    default:
      return `${n}`
  }
}

export async function addPageNumbers(bytes: Uint8Array, options: PageNumberOptions): Promise<Uint8Array> {
  const doc = await loadPdf(bytes)
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const pages = doc.getPages()
  const total = pages.length

  pages.forEach((page, index) => {
    const pageNumber1Based = index + 1
    if (pageNumber1Based < options.startPage) return
    const label = formatLabel(
      options.format,
      options.startNumber + (pageNumber1Based - options.startPage),
      total,
    )
    const { width, height } = page.getSize()
    const textWidth = font.widthOfTextAtSize(label, options.fontSize)
    const bottom = options.position.startsWith('bottom')
    const y = bottom ? options.margin : height - options.margin - options.fontSize
    let x: number
    if (options.position.endsWith('left')) x = options.margin
    else if (options.position.endsWith('right')) x = width - options.margin - textWidth
    else x = (width - textWidth) / 2

    page.drawText(label, {
      x,
      y,
      size: options.fontSize,
      font,
      color: rgb(0.11, 0.09, 0.08),
    })
  })

  return doc.save()
}

export interface WatermarkOptions {
  text: string
  fontSize: number
  opacity: number
  rotation: number
  color: string
  /** 1-based pages to watermark; omit for all pages. */
  pages?: number[]
}

export async function addWatermark(bytes: Uint8Array, options: WatermarkOptions): Promise<Uint8Array> {
  const text = options.text.trim()
  if (!text) throw new PdfError('unsupported', 'Enter the watermark text first.')

  const doc = await loadPdf(bytes)
  const font = await doc.embedFont(StandardFonts.HelveticaBold)
  const pages = doc.getPages()
  const targets = options.pages && options.pages.length ? new Set(options.pages) : null
  const color = hexToRgb(options.color)
  const theta = (options.rotation * Math.PI) / 180

  pages.forEach((page, index) => {
    if (targets && !targets.has(index + 1)) return
    const { width, height } = page.getSize()
    const textWidth = font.widthOfTextAtSize(text, options.fontSize)
    const cx = width / 2
    const cy = height / 2
    const x = cx - (textWidth / 2) * Math.cos(theta)
    const y = cy - (textWidth / 2) * Math.sin(theta)
    page.drawText(text, {
      x,
      y,
      size: options.fontSize,
      font,
      rotate: degrees(options.rotation),
      opacity: options.opacity,
      color,
    })
  })

  return doc.save()
}

function hexToRgb(hex: string) {
  const clean = hex.replace('#', '')
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean
  const int = Number.parseInt(full, 16)
  if (Number.isNaN(int)) return rgb(0.9, 0.28, 0.3)
  return rgb(((int >> 16) & 255) / 255, ((int >> 8) & 255) / 255, (int & 255) / 255)
}

export async function copyDocument(bytes: Uint8Array): Promise<Uint8Array> {
  const doc = await PDFDocument.load(bytes)
  return doc.save()
}
