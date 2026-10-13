/**
 * Site-wide frequently asked questions.
 *
 * Kept dependency-light (only the numeric file limits are imported) so both the
 * React app and the Node SEO build script can use the same source. Numbers are
 * derived from FILE_LIMITS rather than being written twice, so the answers
 * cannot drift out of sync with what the tools actually enforce.
 */
import { FILE_LIMITS } from '../lib/pdf/errors'

export const FAQ_CATEGORIES = [
  'General',
  'Privacy & security',
  'Files & limits',
  'Results & quality',
  'Tools',
] as const

export type FaqCategory = (typeof FAQ_CATEGORIES)[number]

export interface SiteFaq {
  category: FaqCategory
  q: string
  a: string
  /** Show this question in the homepage FAQ section as well. */
  home?: boolean
}

const pdfMb = Math.round(FILE_LIMITS.maxPdfBytes / (1024 * 1024))
const warnMb = Math.round(FILE_LIMITS.warnPdfBytes / (1024 * 1024))
const imageMb = Math.round(FILE_LIMITS.maxImageBytes / (1024 * 1024))

export const SITE_FAQS: SiteFaq[] = [
  {
    category: 'General',
    q: 'Is Pdfreee really free?',
    a: 'Yes. The core PDF tools are free to use and do not require an account or payment.',
    home: true,
  },
  {
    category: 'General',
    q: 'Do I need to install anything?',
    a: 'No. Pdfreee works in a modern desktop or mobile browser. Nothing is installed on your device.',
    home: true,
  },
  {
    category: 'General',
    q: 'Which browsers are supported?',
    a: 'Current versions of Chrome, Edge, Firefox, and Safari. The tools rely on modern browser APIs such as canvas and, for previews, Web Workers.',
  },
  {
    category: 'Privacy & security',
    q: 'Are my files uploaded to a server?',
    a: 'No. The core tools run in your browser using JavaScript. Your documents never leave your device.',
    home: true,
  },
  {
    category: 'Privacy & security',
    q: 'How can I verify my file is not uploaded?',
    a: 'Open your browser developer tools, switch to the Network tab, and run a tool. You will see the page and script requests, but no request carrying your document contents.',
  },
  {
    category: 'Privacy & security',
    q: 'Do you keep copies of my documents or my file names?',
    a: 'No. We never receive your files, so there is nothing to store. Closing or refreshing the tab clears everything the tool held in memory.',
  },
  {
    category: 'Privacy & security',
    q: 'What cookies and local storage do you use?',
    a: 'Only what is needed to remember your cookie/consent choice and, if enabled, to measure anonymous usage. See the cookie policy for the full list and how to change your choice.',
  },
  {
    category: 'Files & limits',
    q: 'Is there a file size or page limit?',
    a: 'There is no fixed limit set by us. Day-to-day limits depend on your device’s available memory, since your browser does the processing.',
    home: true,
  },
  {
    category: 'Files & limits',
    q: 'What are the hard file limits?',
    a: `PDF files up to ${pdfMb} MB are accepted; above ${warnMb} MB we show a performance warning because your device does the work. Images for JPG-to-PDF may be up to ${imageMb} MB each.`,
  },
  {
    category: 'Files & limits',
    q: 'How many files can I merge at once?',
    a: 'There is no fixed cap. The practical limit is your device’s memory, so very large merges may take a while or fail on low-memory devices.',
  },
  {
    category: 'Files & limits',
    q: 'Can I use password-protected PDFs?',
    a: 'Not yet. We do not currently decrypt protected files, so remove the password first. Unlocking is under consideration but not shipped.',
  },
  {
    category: 'Results & quality',
    q: 'Can Pdfreee compress any PDF to any size I want?',
    a: 'No, and any tool that promises that is not being straight with you. Our compression performs lossless structural rewriting; if the rebuilt file is not smaller, we tell you rather than handing over a worse file.',
    home: true,
  },
  {
    category: 'Results & quality',
    q: 'Does compression ever remove the text layer?',
    a: 'The default lossless mode keeps text fully selectable. The optional strong-compression mode rasterises pages, which shrinks scans but turns text into an image that is no longer selectable or searchable.',
  },
  {
    category: 'Results & quality',
    q: 'Can I choose the output file name?',
    a: 'Yes. Every tool that produces a download shows an output name field, and the correct extension is added for you.',
  },
  {
    category: 'Results & quality',
    q: 'Can I apply filters such as grayscale or black & white?',
    a: 'Yes, in PDF-to-image and image-to-PDF, where the output is already raster. Filters are not offered on in-place PDF edits because that would require rasterising pages and destroying selectable text.',
  },
  {
    category: 'Tools',
    q: 'Is OCR (reading text from scans) available?',
    a: 'Not yet. Extracting text from a scanned image needs OCR, which is planned but not part of this release.',
  },
  {
    category: 'Tools',
    q: 'Can you convert a PDF to Word or PowerPoint?',
    a: 'Not yet. High-fidelity office-format conversion needs a dedicated engine and would run as a separate, clearly-labelled service. We have not shipped it and will not pretend otherwise.',
  },
  {
    category: 'Tools',
    q: 'Which tools are available today?',
    a: 'Merge, split, compress, rotate, delete, reorder and extract pages, add page numbers and watermarks, PDF-to-JPG, JPG-to-PDF, PDF-to-text, a PDF reader, plus basic edit and sign tools.',
  },
]

/** Questions surfaced on the homepage FAQ block. */
export const HOME_FAQS = SITE_FAQS.filter((faq) => faq.home)
