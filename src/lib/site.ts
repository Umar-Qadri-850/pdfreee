/**
 * Centralised, dependency-free site configuration.
 * This module is imported by both the browser app and Node build scripts,
 * so it must not reference the DOM, React, or `import.meta.env`.
 */

export interface NavLink {
  label: string
  href: string
}

export const SITE = {
  name: 'Pdfreee',
  tagline: 'PDF tools that just work.',
  description:
    'Pdfreee is a free online PDF toolkit. Merge, split, compress, rotate, convert and edit PDF files right in your browser — your files never leave your device.',
  locale: 'en_US',
  twitter: '@pdfreee',
  email: 'hello@pdfreee.app',
  defaultOgImage: '/og-image.svg',
} as const

export const PRIMARY_NAV: NavLink[] = [
  { label: 'Tools', href: '/tools' },
  { label: 'Blog', href: '/blog' },
  { label: 'How it works', href: '/how-it-works' },
  { label: 'About', href: '/about' },
]

export const FOOTER_COLUMNS: { heading: string; links: NavLink[] }[] = [
  {
    heading: 'Organize',
    links: [
      { label: 'Merge PDF', href: '/merge-pdf' },
      { label: 'Split PDF', href: '/split-pdf' },
      { label: 'Delete pages', href: '/delete-pdf-pages' },
      { label: 'Reorder pages', href: '/reorder-pdf-pages' },
      { label: 'Extract pages', href: '/extract-pdf-pages' },
      { label: 'Rotate PDF', href: '/rotate-pdf' },
    ],
  },
  {
    heading: 'Convert',
    links: [
      { label: 'PDF to JPG', href: '/pdf-to-jpg' },
      { label: 'JPG to PDF', href: '/jpg-to-pdf' },
      { label: 'PDF to text', href: '/pdf-to-text' },
      { label: 'PDF reader', href: '/pdf-reader' },
    ],
  },
  {
    heading: 'Optimize & edit',
    links: [
      { label: 'Compress PDF', href: '/compress-pdf' },
      { label: 'Add page numbers', href: '/add-page-numbers' },
      { label: 'Add watermark', href: '/add-watermark' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { label: 'About', href: '/about' },
      { label: 'How it works', href: '/how-it-works' },
      { label: 'Contact', href: '/contact' },
      { label: 'Blog', href: '/blog' },
    ],
  },
  {
    heading: 'Legal',
    links: [
      { label: 'Privacy policy', href: '/privacy-policy' },
      { label: 'Terms of use', href: '/terms' },
      { label: 'Cookie policy', href: '/cookie-policy' },
    ],
  },
]

/** Resolves the public site origin for canonical URLs, sitemaps and robots.txt. */
export function resolveSiteUrl(raw?: string): string {
  const value = (raw ?? 'https://pdfreee.app').trim().replace(/\/+$/, '')
  if (/^https?:\/\//i.test(value)) return value
  return `https://${value}`
}
