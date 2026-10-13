/**
 * Centralised route + tool registry.
 *
 * Nothing in the UI should hard-code a tool path, title, or description:
 * import from here so slugs, navigation, sitemap and metadata stay in sync.
 * This module is dependency-free so Node build scripts can import it too.
 */

export type ToolCategoryId = 'organize' | 'convert' | 'compress' | 'edit'
export type ToolStatus = 'implemented' | 'beta' | 'planned'

export interface ToolFaq {
  q: string
  a: string
}

export interface ToolDefinition {
  /** Route segment without leading slash, e.g. "merge-pdf". */
  slug: string
  /** Absolute path within the site, e.g. "/merge-pdf". */
  path: string
  /** Short name used in nav, cards, and breadcrumbs. */
  name: string
  /** Page H1 — may be longer than `name`. */
  h1: string
  /** One-line value proposition shown on cards. */
  tagline: string
  /** Meta description (aim 120–160 chars). */
  description: string
  category: ToolCategoryId
  /** lucide-react icon name (resolved to a component in the UI layer). */
  icon: string
  keywords: string[]
  /** Input `accept` attribute. */
  accept: string
  /** Whether the file picker allows multiple files. */
  multiple: boolean
  /** Slugs of related tools. */
  related: string[]
  howTo: string[]
  limitations: string[]
  faqs: ToolFaq[]
  status: ToolStatus
}

export interface ToolCategory {
  id: ToolCategoryId
  name: string
  description: string
}

export const TOOL_CATEGORIES: ToolCategory[] = [
  {
    id: 'organize',
    name: 'Organize',
    description: 'Merge, split, reorder, rotate, and remove pages without changing your document.',
  },
  {
    id: 'convert',
    name: 'Convert',
    description: 'Turn PDFs into images or text, and build PDFs from images.',
  },
  {
    id: 'compress',
    name: 'Compress',
    description: 'Reduce file size with clearly described, measurable optimisation levels.',
  },
  {
    id: 'edit',
    name: 'Edit',
    description: 'Add page numbers or text watermarks to existing PDF documents.',
  },
]

export const PDF_ACCEPT = 'application/pdf,.pdf'
export const IMAGE_ACCEPT = 'image/jpeg,image/png,.jpg,.jpeg,.png'
export const MULTI_IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp'

const tools: ToolDefinition[] = [
  {
    slug: 'merge-pdf',
    path: '/merge-pdf',
    name: 'Merge PDF',
    h1: 'Merge PDF files',
    tagline: 'Combine multiple PDFs into one document, in the order you choose.',
    description:
      'Merge two or more PDF files into a single document directly in your browser. Reorder files, keep bookmarks, and download instantly — no upload, no sign-up.',
    category: 'organize',
    icon: 'Merge',
    keywords: ['merge pdf', 'combine pdf', 'join pdf files', 'pdf merger'],
    accept: PDF_ACCEPT,
    multiple: true,
    related: ['split-pdf', 'reorder-pdf-pages', 'extract-pdf-pages'],
    howTo: [
      'Drop two or more PDF files onto the page, or click to browse.',
      'Drag the file list to set the order they will be merged in.',
      'Press “Merge PDF” and download the combined document.',
    ],
    limitations: [
      'Encrypted or password-protected PDFs must be unlocked before merging.',
      'Interactive form fields and digital signatures are not preserved when pages are copied between documents.',
      'Very large document sets are limited by your device memory, since processing happens in the browser.',
    ],
    faqs: [
      {
        q: 'Are my files uploaded to a server?',
        a: 'No. Merging runs entirely in your browser using JavaScript. The PDF bytes never leave your device.',
      },
      {
        q: 'Can I control the order of the merged files?',
        a: 'Yes. Rearrange the files in the list before merging; the top file becomes the first pages of the result.',
      },
      {
        q: 'Is there a page limit?',
        a: 'There is no fixed page limit. Realistic limits depend on your device’s available memory.',
      },
    ],
    status: 'implemented',
  },
  {
    slug: 'split-pdf',
    path: '/split-pdf',
    name: 'Split PDF',
    h1: 'Split a PDF',
    tagline: 'Split one PDF into several files by page range, or extract every page separately.',
    description:
      'Split a PDF into multiple documents by custom page ranges or single pages. Runs locally in your browser with an instant ZIP download — free and private.',
    category: 'organize',
    icon: 'Scissors',
    keywords: ['split pdf', 'pdf splitter', 'split pdf pages', 'separate pdf'],
    accept: PDF_ACCEPT,
    multiple: false,
    related: ['extract-pdf-pages', 'delete-pdf-pages', 'merge-pdf'],
    howTo: [
      'Add the PDF you want to split.',
      'Choose “Every page” to split into individual files, or enter ranges such as 1-3, 5, 8-10.',
      'Press “Split PDF” and download the ZIP archive of results.',
    ],
    limitations: [
      'Page ranges are 1-based and inclusive; invalid or out-of-order ranges are reported before processing.',
      'A range that selects every page produces identical output to the input.',
    ],
    faqs: [
      {
        q: 'What range format should I use?',
        a: 'Use commas between ranges and a hyphen for a span, for example 1-3, 5, 8-10. Each output file contains one range.',
      },
      {
        q: 'How are the split files delivered?',
        a: 'When more than one file is produced you receive a single ZIP archive containing each part.',
      },
    ],
    status: 'implemented',
  },
  {
    slug: 'extract-pdf-pages',
    path: '/extract-pdf-pages',
    name: 'Extract pages',
    h1: 'Extract PDF pages',
    tagline: 'Pull selected pages out of a PDF into a brand-new document.',
    description:
      'Extract specific pages from a PDF into a new file using simple page ranges. Choose exact pages, preview them, and download — processed privately in your browser.',
    category: 'organize',
    icon: 'FileOutput',
    keywords: ['extract pdf pages', 'extract pages from pdf', 'pdf page extractor'],
    accept: PDF_ACCEPT,
    multiple: false,
    related: ['split-pdf', 'delete-pdf-pages', 'reorder-pdf-pages'],
    howTo: [
      'Add a PDF and let the page previews render.',
      'Enter the pages to keep, for example 1-3, 7, 9.',
      'Press “Extract pages” and download the new PDF.',
    ],
    limitations: [
      'Extraction copies pages in the order you list them, so you can also use it to reorder a subset.',
      'Annotations that reference off-page data are treated the same way as during any page copy.',
    ],
    faqs: [
      {
        q: 'Can I extract non-adjacent pages?',
        a: 'Yes. List each page or range separated by commas, such as 1, 4, 8-10.',
      },
      {
        q: 'Does this change the original file?',
        a: 'No. The original stays on your device and is never modified.',
      },
    ],
    status: 'implemented',
  },
  {
    slug: 'delete-pdf-pages',
    path: '/delete-pdf-pages',
    name: 'Delete pages',
    h1: 'Delete pages from a PDF',
    tagline: 'Remove unwanted pages and download a clean copy.',
    description:
      'Delete pages from a PDF by selecting them visually or entering page ranges. The result downloads instantly and processing stays on your device.',
    category: 'organize',
    icon: 'Trash2',
    keywords: ['delete pdf pages', 'remove pages from pdf', 'delete page pdf'],
    accept: PDF_ACCEPT,
    multiple: false,
    related: ['extract-pdf-pages', 'split-pdf', 'reorder-pdf-pages'],
    howTo: [
      'Add a PDF and review the page thumbnails.',
      'Click pages to mark them for removal, or type ranges like 2, 5-6.',
      'Press “Delete pages” and download the shortened PDF.',
    ],
    limitations: [
      'You cannot delete every page — at least one page must remain.',
    ],
    faqs: [
      {
        q: 'How do I select pages to delete?',
        a: 'Click a thumbnail to toggle it, or type a range such as 2, 5-6 in the range field. Both stay in sync.',
      },
      {
        q: 'Can I undo?',
        a: 'Yes. Nothing is written until you press the action button, and you can reset the selection at any time.',
      },
    ],
    status: 'implemented',
  },
  {
    slug: 'reorder-pdf-pages',
    path: '/reorder-pdf-pages',
    name: 'Reorder pages',
    h1: 'Reorder PDF pages',
    tagline: 'Drag pages into a new order and export the reordered PDF.',
    description:
      'Rearrange PDF pages with drag and drop, plus keyboard-accessible controls. Rebuild the document order and download it — all inside your browser.',
    category: 'organize',
    icon: 'ArrowUpDown',
    keywords: ['reorder pdf pages', 'rearrange pdf', 'organize pdf pages', 'move pdf pages'],
    accept: PDF_ACCEPT,
    multiple: false,
    related: ['rotate-pdf', 'delete-pdf-pages', 'merge-pdf'],
    howTo: [
      'Add a PDF to load its pages.',
      'Drag thumbnails to a new position, or use the move controls for keyboard-friendly ordering.',
      'Press “Apply new order” and download the result.',
    ],
    limitations: [
      'Dragging uses pointer events; keyboard and button controls are provided as an accessible alternative.',
    ],
    faqs: [
      {
        q: 'Can I move a page several positions at once?',
        a: 'Yes. The move buttons shift a page by one step, and dragging moves it as far as you like.',
      },
      {
        q: 'Does reordering rotate pages?',
        a: 'No. Use the Rotate PDF tool if you also need to fix page orientation.',
      },
    ],
    status: 'implemented',
  },
  {
    slug: 'rotate-pdf',
    path: '/rotate-pdf',
    name: 'Rotate PDF',
    h1: 'Rotate PDF pages',
    tagline: 'Rotate all pages or a selection by 90°, 180°, or 270°.',
    description:
      'Rotate PDF pages clockwise with a live preview, applying rotation to every page or just the ones you select. Free, private, and processed in your browser.',
    category: 'organize',
    icon: 'RotateCw',
    keywords: ['rotate pdf', 'rotate pdf pages', 'turn pdf', 'rotate pdf 90 degrees'],
    accept: PDF_ACCEPT,
    multiple: false,
    related: ['reorder-pdf-pages', 'merge-pdf', 'split-pdf'],
    howTo: [
      'Add a PDF and view the previews.',
      'Choose a rotation angle and whether to apply it to all pages or a selection.',
      'Press “Rotate PDF” and download the updated document.',
    ],
    limitations: [
      'Rotation is applied to existing page content; the underlying media box is preserved.',
    ],
    faqs: [
      {
        q: 'Which direction does rotation go?',
        a: 'Rotation is clockwise. Selecting 90° turns portrait pages to landscape.',
      },
      {
        q: 'Can I rotate only some pages?',
        a: 'Yes. Switch off “All pages” and select the thumbnails you want to rotate.',
      },
    ],
    status: 'implemented',
  },
  {
    slug: 'compress-pdf',
    path: '/compress-pdf',
    name: 'Compress PDF',
    h1: 'Compress a PDF',
    tagline: 'Rewrite your PDF to remove redundant data and, where possible, reduce size.',
    description:
      'Compress a PDF by rebuilding its structure in your browser. We show the exact before-and-after file size and never claim a target we cannot reach.',
    category: 'compress',
    icon: 'Minimize2',
    keywords: ['compress pdf', 'reduce pdf size', 'shrink pdf', 'pdf compressor'],
    accept: PDF_ACCEPT,
    multiple: false,
    related: ['merge-pdf', 'pdf-to-jpg', 'split-pdf'],
    howTo: [
      'Add the PDF you want to shrink.',
      'Choose an optimisation level and press “Compress PDF”.',
      'Compare the measured before-and-after sizes, then download if it helped.',
    ],
    limitations: [
      'This tool rebuilds the PDF with pdf-lib and does not re-encode embedded images, so the reduction depends on the document’s internal structure.',
      'If the rebuilt file is not smaller, we tell you and recommend keeping the original instead of handing over a worse file.',
      'Moving real image compression into the browser is planned work, not a current feature.',
    ],
    faqs: [
      {
        q: 'Why did my PDF barely change size?',
        a: 'The current build performs lossless structural rewriting. Documents that are already optimised, or that consist mainly of already-compressed images, often cannot be reduced without re-encoding images.',
      },
      {
        q: 'Will I lose quality?',
        a: 'The rewrite keeps page content and does not intentionally lower image quality. If the output is not smaller we will not present it as an improvement.',
      },
    ],
    status: 'beta',
  },
  {
    slug: 'pdf-to-jpg',
    path: '/pdf-to-jpg',
    name: 'PDF to JPG',
    h1: 'Convert PDF pages to JPG or PNG',
    tagline: 'Render each page to an image at the resolution you choose.',
    description:
      'Convert PDF pages to JPG or PNG images with a selectable resolution, page range, and optional filter (grayscale, black & white, sepia, and more). Rendering happens in your browser using PDF.js — nothing is uploaded.',
    category: 'convert',
    icon: 'FileImage',
    keywords: [
      'pdf to jpg',
      'pdf to png',
      'pdf to image',
      'convert pdf to jpg',
      'pdf to grayscale image',
      'pdf black and white',
    ],
    accept: PDF_ACCEPT,
    multiple: false,
    related: ['jpg-to-pdf', 'compress-pdf', 'pdf-to-text'],
    howTo: [
      'Add a PDF to render its pages.',
      'Pick the image format, resolution (DPI), page range, and an optional filter.',
      'Press “Convert to images” and download individual images or a ZIP.',
    ],
    limitations: [
      'Output quality depends on the chosen DPI; very high DPI values increase memory use.',
      'Vector content is rasterised, so zooming into the exported image will not stay crisp.',
    ],
    faqs: [
      {
        q: 'Should I choose JPG or PNG?',
        a: 'JPG produces smaller files for photos and scans. PNG is better for text, line art, and screenshots that need crisp edges.',
      },
      {
        q: 'What does the DPI setting change?',
        a: 'It sets the raster resolution. 150 DPI suits screen use; 300 DPI suits printing.',
      },
      {
        q: 'Can I convert a PDF to grayscale or black & white?',
        a: 'Yes. Choose a filter before converting — Grayscale suits photos, while Black & white thresholding is ideal for scans of text. Filters are applied to the rendered image in your browser.',
      },
    ],
    status: 'implemented',
  },
  {
    slug: 'jpg-to-pdf',
    path: '/jpg-to-pdf',
    name: 'JPG to PDF',
    h1: 'Convert images to PDF',
    tagline: 'Combine JPG and PNG images into one PDF with your chosen page setup.',
    description:
      'Turn JPG and PNG images into a single multi-page PDF. Choose page size, orientation, margins, and an optional filter, reorder images, and download — processed locally.',
    category: 'convert',
    icon: 'Images',
    keywords: [
      'jpg to pdf',
      'image to pdf',
      'png to pdf',
      'convert images to pdf',
      'grayscale images to pdf',
    ],
    accept: MULTI_IMAGE_ACCEPT,
    multiple: true,
    related: ['pdf-to-jpg', 'merge-pdf', 'compress-pdf'],
    howTo: [
      'Drop one or more JPG or PNG images, or click to browse.',
      'Reorder them and choose page size, orientation, margins, and an optional filter.',
      'Press “Create PDF” and download the multi-page document.',
    ],
    limitations: [
      'Images are embedded at their original pixel dimensions; use a large enough source image for print.',
      'Image metadata such as EXIF orientation is read for display but not always preserved in the output.',
    ],
    faqs: [
      {
        q: 'Can I mix JPG and PNG?',
        a: 'Yes. Both formats can be combined in a single PDF, in the order you arrange them.',
      },
      {
        q: 'Does a margin change the image size?',
        a: 'No. The image is scaled to fit inside the printable area after margins are applied.',
      },
    ],
    status: 'implemented',
  },
  {
    slug: 'add-page-numbers',
    path: '/add-page-numbers',
    name: 'Add page numbers',
    h1: 'Add page numbers to a PDF',
    tagline: 'Stamp sequence numbers with control over position, start, and format.',
    description:
      'Add page numbers to a PDF with selectable position, starting number, and number format. Preview the placement and download — all in your browser.',
    category: 'edit',
    icon: 'Hash',
    keywords: ['add page numbers to pdf', 'pdf page numbers', 'number pdf pages', 'paginate pdf'],
    accept: PDF_ACCEPT,
    multiple: false,
    related: ['add-watermark', 'reorder-pdf-pages', 'merge-pdf'],
    howTo: [
      'Add the PDF you want to number.',
      'Choose position, starting number, and format (for example “Page 1 of N”).',
      'Press “Add page numbers” and download the stamped PDF.',
    ],
    limitations: [
      'Numbers are stamped on top of existing content; on dense pages they may overlap the original text in the chosen corner.',
      'Fonts are limited to the standard PDF fonts bundled with pdf-lib.',
    ],
    faqs: [
      {
        q: 'Where can the numbers go?',
        a: 'Bottom or top edge, aligned left, centre, or right.',
      },
      {
        q: 'Can numbering start at a number other than 1?',
        a: 'Yes. Set the starting number and the first page you want stamped.',
      },
    ],
    status: 'implemented',
  },
  {
    slug: 'add-watermark',
    path: '/add-watermark',
    name: 'Add watermark',
    h1: 'Add a text watermark to a PDF',
    tagline: 'Overlay diagonal or straight text with adjustable size, opacity, and angle.',
    description:
      'Add a text watermark to a PDF with adjustable text, size, colour, opacity, rotation, and placement. Everything is rendered locally and downloadable instantly.',
    category: 'edit',
    icon: 'Droplets',
    keywords: ['pdf watermark', 'add watermark to pdf', 'watermark pdf online', 'stamp pdf'],
    accept: PDF_ACCEPT,
    multiple: false,
    related: ['add-page-numbers', 'rotate-pdf', 'pdf-reader'],
    howTo: [
      'Add a PDF to load its pages.',
      'Type your watermark text and adjust size, opacity, rotation, and position.',
      'Press “Add watermark” and download the watermarked PDF.',
    ],
    limitations: [
      'Watermarks are stamped as vector text; they remain selectable unless you later flatten the file.',
      'Only the standard PDF fonts are available.',
    ],
    faqs: [
      {
        q: 'Can I watermark only some pages?',
        a: 'Yes. Choose all pages or a specific range on the tool page.',
      },
      {
        q: 'Is the watermark removable?',
        a: 'Because it is added as document text, it can be edited out with PDF editing software — it is a deterrent, not tamper-proof protection.',
      },
    ],
    status: 'implemented',
  },
  {
    slug: 'sign-pdf',
    path: '/sign-pdf',
    name: 'Sign PDF',
    h1: 'Sign PDF documents',
    tagline: 'Draw or upload a signature and place it on any page of a PDF.',
    description:
      'Create a signature by drawing or uploading an image, then place it exactly where you need on your PDF pages. All processing happens in your browser - private and secure.',
    category: 'edit',
    icon: 'PenTool',
    keywords: ['sign pdf', 'pdf signature', 'add signature to pdf', 'electronic signature'],
    accept: PDF_ACCEPT,
    multiple: false,
    related: ['edit-pdf', 'add-watermark', 'add-page-numbers'],
    howTo: [
      'Upload the PDF you need to sign.',
      'Draw a signature or upload a signature image (PNG with transparency works best).',
      'Select a page and place your signature where desired.',
      'Adjust position and size if needed, then download the signed PDF.',
    ],
    limitations: [
      'Signatures are placed as embedded images; they do not create cryptographic digital signatures.',
      'Encrypted or password-protected PDFs must be unlocked before signing.',
    ],
    faqs: [
      {
        q: 'Can I use a transparent PNG signature?',
        a: 'Yes. Transparent PNGs are supported so the PDF background remains visible.',
      },
      {
        q: 'Is this a legally binding digital signature?',
        a: 'This tool places a visual signature image. Legal requirements for digital signatures vary by jurisdiction.',
      },
    ],
    status: 'implemented',
  },
  {
    slug: 'edit-pdf',
    path: '/edit-pdf',
    name: 'Edit PDF',
    h1: 'Edit PDF files',
    tagline: 'Add text and images to PDF pages, then download your edited PDF.',
    description:
      'Add custom text and insert images on any page of a PDF, position and resize them, and export a valid PDF with your changes - all in your browser, private and secure.',
    category: 'edit',
    icon: 'Edit',
    keywords: ['edit pdf', 'add text to pdf', 'insert image in pdf', 'pdf editor', 'edit pdf online'],
    accept: PDF_ACCEPT,
    multiple: false,
    related: ['sign-pdf', 'add-watermark', 'add-page-numbers'],
    howTo: [
      'Add the PDF you want to edit.',
      'Click on a page preview to place a text box, or use "Insert image" to place a picture.',
      'Adjust text, font size and colour, or drag and resize placed images.',
      'Press "Download edited PDF" to export your changes.',
    ],
    limitations: [
      'This tool adds new text and images on top of the page; it does not replace or remove existing content.',
      'Fonts are limited to the standard PDF fonts available through pdf-lib.',
      'Encrypted or password-protected PDFs must be unlocked before editing.',
    ],
    faqs: [
      {
        q: 'Will this change my original PDF?',
        a: 'No. You will download a new, modified PDF. Your original file remains unchanged.',
      },
      {
        q: 'Can I edit existing text in the PDF?',
        a: 'This tool adds new text on top of the existing pages. It does not replace or remove existing text.',
      },
      {
        q: 'Are my files uploaded to a server?',
        a: 'No. All editing happens entirely in your browser — your PDF never leaves your device.',
      },
    ],
    status: 'implemented',
  },
  {
    slug: 'pdf-to-text',
    path: '/pdf-to-text',
    name: 'PDF to text',
    h1: 'Extract text from a PDF',
    tagline: 'Pull selectable text out of a PDF and download it as a text file.',
    description:
      'Extract selectable text from a PDF using PDF.js in your browser. Copy the result or download it as a .txt file. Scanned image-only PDFs are reported honestly.',
    category: 'convert',
    icon: 'FileText',
    keywords: ['pdf to text', 'extract text from pdf', 'pdf text extractor', 'convert pdf to text'],
    accept: PDF_ACCEPT,
    multiple: false,
    related: ['pdf-reader', 'pdf-to-jpg', 'extract-pdf-pages'],
    howTo: [
      'Add a PDF that contains selectable text.',
      'Review the extracted text, page by page.',
      'Copy it or download a UTF-8 .txt file.',
    ],
    limitations: [
      'Only text that is actually stored in the PDF can be extracted. Scanned images with no text layer return little or nothing without OCR.',
      'Columns and complex layouts may be linearised in reading order rather than reproduced visually.',
    ],
    faqs: [
      {
        q: 'Why is my extracted text empty?',
        a: 'The PDF is probably a scan made of images with no text layer. That needs OCR, which is a planned feature rather than part of this release.',
      },
      {
        q: 'Does it keep formatting?',
        a: 'It preserves line breaks inferred from text positions, but not fonts, colours, or tables.',
      },
    ],
    status: 'implemented',
  },
  {
    slug: 'pdf-reader',
    path: '/pdf-reader',
    name: 'PDF reader',
    h1: 'Read a PDF in your browser',
    tagline: 'Open and page through a PDF without installing software.',
    description:
      'A minimal, fast PDF reader that renders pages with PDF.js entirely in your browser. No upload, no account, and it works offline once loaded.',
    category: 'convert',
    icon: 'BookOpen',
    keywords: ['pdf reader', 'view pdf online', 'open pdf in browser', 'read pdf'],
    accept: PDF_ACCEPT,
    multiple: false,
    related: ['pdf-to-text', 'rotate-pdf', 'merge-pdf'],
    howTo: [
      'Open the PDF you want to read.',
      'Move between pages with the controls or your keyboard.',
      'Adjust zoom as needed; your file stays on your device.',
    ],
    limitations: [
      'This is a viewer, not a full annotation app — highlighting and comments are not included.',
    ],
    faqs: [
      {
        q: 'Is this just the browser’s built-in viewer?',
        a: 'No. It renders pages with PDF.js so it works consistently across browsers and can later power text search.',
      },
    ],
    status: 'implemented',
  },
]

export const TOOLS: ToolDefinition[] = tools

export const TOOLS_BY_SLUG: Record<string, ToolDefinition> = Object.fromEntries(
  tools.map((t) => [t.slug, t]),
)

export function getTool(slug: string): ToolDefinition | undefined {
  return TOOLS_BY_SLUG[slug]
}

export function toolsByCategory(category: ToolCategoryId): ToolDefinition[] {
  return tools.filter((t) => t.category === category)
}

export function toolPath(slug: string): string {
  return `/${slug}`
}
