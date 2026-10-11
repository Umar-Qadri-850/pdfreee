# Pdfreee

A free-first, privacy-conscious toolkit of PDF tools that runs entirely in your
browser. Merge, split, compress, rotate, convert, and edit PDF files without
uploading them anywhere.

> **The core promise:** your files are processed locally with JavaScript. The
> PDF bytes never leave your device. There is no upload endpoint, no account,
> and no server-side processing in this project.

## Why another PDF site?

Most online PDF tools upload your document to a server you cannot see. Pdfreee
does the work in the browser using [pdf-lib](https://pdf-lib.js.org/) and
[PDF.js](https://mozilla.github.io/pdf.js/), so there is nothing to trust beyond
the page you already have open.

## Tools

| Tool | Path | What it does |
| --- | --- | --- |
| Merge PDF | `/merge-pdf` | Combine multiple PDFs into one, in the order you choose |
| Split PDF | `/split-pdf` | Split by page ranges or into single pages (ZIP download) |
| Extract pages | `/extract-pdf-pages` | Pull selected pages into a new document |
| Delete pages | `/delete-pdf-pages` | Remove pages you do not want |
| Reorder pages | `/reorder-pdf-pages` | Drag pages into a new order |
| Rotate PDF | `/rotate-pdf` | Rotate all pages or a selection by 90/180/270° |
| Compress PDF | `/compress-pdf` | Lossless rebuild, or lossy rasterise, with measured before/after sizes |
| PDF to JPG | `/pdf-to-jpg` | Render pages to JPG or PNG at a chosen DPI |
| JPG to PDF | `/jpg-to-pdf` | Combine JPG/PNG images into one PDF |
| Add page numbers | `/add-page-numbers` | Stamp numbers with position, start and format control |
| Add watermark | `/add-watermark` | Overlay text with size, opacity, colour and angle |
| PDF to text | `/pdf-to-text` | Extract selectable text to copy or a `.txt` file |
| PDF reader | `/pdf-reader` | A minimal in-browser viewer |

The single source of truth for slugs, titles, metadata and FAQs is
[`src/content/registry.ts`](src/content/registry.ts). Navigation, tool cards,
the sitemap and structured data all read from it.

## Tech stack

- **React 19** + **TypeScript 5.9** + **Vite 7**
- **Tailwind CSS 4** for styling
- **react-router 7** for routing (client-side)
- **pdf-lib** for document structure operations
- **pdfjs-dist (PDF.js)** for rendering, thumbnails and text extraction
- **Vitest** for unit tests (jsdom environment)

Dependency choices are deliberately lean: no `clsx`/`tailwind-merge` (small local
`cn` helper), no `JSZip` (a small local ZIP writer), no `react-helmet` (a local
`useSeo` hook).

## Getting started

```bash
npm install
cp .env.example .env   # then set VITE_SITE_URL to your origin
npm run dev
```

Open the printed local URL.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Typecheck, build with Vite, then run the SEO generator |
| `npm run typecheck` | Type-check the app **and** the build scripts |
| `npm run lint` | Run ESLint |
| `npm test` | Run the Vitest suite once |
| `npm run test:watch` | Run Vitest in watch mode |
| `npm run fixture` | Regenerate `test/fixtures/sample-4page.pdf` (the 4-page fixture used by tests) |
| `npm run verify:worker` | Smoke-test a running server: the PDF.js `.mjs` worker must be served as JavaScript |
| `npm run verify:deploy` | Live deployment check: HTML revalidates; the worker is served with the correct MIME and revalidates (no-cache, must-revalidate); hashed assets are immutable; ETag revalidation returns 304 |
| `npm run seo:generate` | Regenerate per-route HTML, `sitemap.xml` and `robots.txt` in `dist/` |

## How the production build works

`npm run build` runs three steps:

1. **Typecheck** — `tsc` over the app (`tsconfig.json`) and the build scripts
   (`tsconfig.node.json`).
2. **`vite build`** — bundles the SPA into `dist/`.
3. **`npm run seo:generate`** — a small Node script
   ([`scripts/generate-seo.ts`](scripts/generate-seo.ts)) that writes one real
   `dist/<route>/index.html` per route.

That last step is **static meta prerendering, not server-side rendering**: each
route's HTML carries the correct `<title>`, meta description, canonical URL,
Open Graph/Twitter tags, JSON-LD, and a `<noscript>` fallback with real content.
The React app still hydrates and runs client-side. This gives crawlers real HTML
and lets static hosts serve deep links without a rewrite rule.

## Privacy model

- All processing happens in the browser via JavaScript.
- Files are never uploaded; there is no backend in this repository.
- No analytics or ad scripts are bundled. (Any future ad integration would need
  the Content-Security-Policy in `nginx.conf` updated.)

## Testing

```bash
npm test
```

Unit tests cover the page-range parser, the ZIP writer, and the core pdf-lib
operations (extract/delete/reorder/rotate/split/merge) against generated sample
PDFs. Deployment guards assert that `nginx.conf` serves the PDF.js `.mjs` worker
with the right MIME type.

Against a running server, `npm run verify:worker` fetches the worker and fails
unless it is served as real JavaScript — this catches the "wrong MIME type"
regression that breaks every PDF.js-backed tool.

For cache safety after deploys, `npm run verify:deploy` checks that HTML entry
points revalidate (`no-cache, must-revalidate`), the PDF.js `.mjs` worker
revalidates (never `immutable`), and content-hashed JS/CSS under `/assets/`
remain `public, immutable`. It also verifies ETag-based revalidation returns 304.

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for Docker, Docker Compose, and static-host
instructions. See [SEO.md](SEO.md) for the SEO approach and
[FEATURE_MATRIX.md](FEATURE_MATRIX.md) for exactly what is implemented versus
planned.

## Honesty and limitations

This project favours telling the truth over marketing claims:

- **Compress** shows the measured before/after size and explicitly says when a
  file could **not** be made smaller, rather than shipping a worse file.
- **PDF to text** states plainly that scanned, image-only PDFs need OCR, which is
  not part of this release.
- The SEO generator performs **static meta prerendering**, which is described as
  such — not as full SSR.
- No performance, traffic, ranking or revenue numbers are claimed anywhere in
  this repository, because none were measured.

## License

MIT.
