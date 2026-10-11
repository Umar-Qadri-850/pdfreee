export type PdfErrorCode =
  | 'invalid-type'
  | 'empty'
  | 'encrypted'
  | 'corrupt'
  | 'too-large'
  | 'no-pages'
  | 'unsupported'
  | 'unknown'

export class PdfError extends Error {
  code: PdfErrorCode
  constructor(code: PdfErrorCode, message: string) {
    super(message)
    this.name = 'PdfError'
    this.code = code
  }
}

export const FILE_LIMITS = {
  /** Reject PDFs larger than this outright. */
  maxPdfBytes: 300 * 1024 * 1024,
  /** Show a performance warning above this. */
  warnPdfBytes: 50 * 1024 * 1024,
  maxImageBytes: 40 * 1024 * 1024,
} as const

export function isPdfFile(file: File): boolean {
  return file.type === 'application/pdf' || /\.pdf$/i.test(file.name)
}

export function isImageFile(file: File): boolean {
  return /^image\/(jpeg|png|webp)$/.test(file.type) || /\.(jpe?g|png|webp)$/i.test(file.name)
}

/** Read the first bytes of a file to confirm it is really a PDF ("%PDF-"). */
export async function looksLikePdf(file: File): Promise<boolean> {
  try {
    const head = await file.slice(0, 5).arrayBuffer()
    const bytes = new Uint8Array(head)
    return bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46 // %PDF
  } catch {
    return false
  }
}

export async function validatePdfFile(file: File): Promise<void> {
  if (file.size === 0) throw new PdfError('empty', `“${file.name}” is empty (0 bytes).`)
  if (!isPdfFile(file)) {
    throw new PdfError('invalid-type', `“${file.name}” is not a PDF file.`)
  }
  if (file.size > FILE_LIMITS.maxPdfBytes) {
    throw new PdfError('too-large', `“${file.name}” is larger than the 300 MB limit.`)
  }
  if (!(await looksLikePdf(file))) {
    throw new PdfError('corrupt', `“${file.name}” does not appear to be a valid PDF.`)
  }
}

export function validateImageFile(file: File): void {
  if (file.size === 0) throw new PdfError('empty', `“${file.name}” is empty (0 bytes).`)
  if (!isImageFile(file)) {
    throw new PdfError('invalid-type', `“${file.name}” is not a supported image (JPG, PNG or WebP).`)
  }
  if (file.size > FILE_LIMITS.maxImageBytes) {
    throw new PdfError('too-large', `“${file.name}” is larger than the 40 MB image limit.`)
  }
}

/** Convert any thrown value into a safe, human-readable message. */
export function friendlyMessage(error: unknown): string {
  if (error instanceof PdfError) return error.message
  if (error instanceof Error) {
    if (/encrypted/i.test(error.message)) {
      return 'This PDF is encrypted or password-protected. Remove the password, then try again.'
    }
    if (/password/i.test(error.message)) {
      return 'This PDF requires a password. Unlock it first, then try again.'
    }
    if (/Invalid PDF|Failed to parse|Expected instance/i.test(error.message)) {
      return 'This file could not be read as a PDF. It may be damaged or in an unsupported format.'
    }
    return error.message
  }
  return 'Something went wrong while processing this file. Please try again.'
}
