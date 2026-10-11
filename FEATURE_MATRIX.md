# Feature matrix

Status legend: **Shipped** = implemented and unit-tested where applicable ·
**Beta** = works but with a clearly stated caveat · **Planned** = not built yet.

Nothing in this table is aspirational-without-a-caveat. If a limitation exists,
it is written here and surfaced in the UI.

## Tools

| Tool | Route | Status | Notes / honest limitations |
| --- | --- | --- | --- |
| Merge PDF | `/merge-pdf` | Shipped | Reorders files; forms/signatures are not carried across documents |
| Split PDF | `/split-pdf` | Shipped | Ranges are 1-based inclusive; multi-file output is delivered as a ZIP |
| Extract pages | `/extract-pdf-pages` | Shipped | Copies pages in listed order, so it doubles as subset reorder |
| Delete pages | `/delete-pdf-pages` | Shipped | Cannot delete every page |
| Reorder pages | `/reorder-pdf-pages` | Shipped | Pointer drag plus keyboard/button controls |
| Rotate PDF | `/rotate-pdf` | Shipped | Rotates existing content; media box preserved |
| Compress PDF | `/compress-pdf` | Beta | Lossless rebuild often does not shrink image-heavy files; lossy "rasterise" is offered with a clear quality warning. We report exact before/after sizes and say so when a file could not be made smaller |
| PDF to JPG/PNG | `/pdf-to-jpg` | Shipped | Vector content is rasterised at the chosen DPI |
| JPG/PNG to PDF | `/jpg-to-pdf` | Shipped | Images embedded at source pixel dimensions |
| Add page numbers | `/add-page-numbers` | Shipped | Standard PDF fonts only; stamped on top of content |
| Add watermark | `/add-watermark` | Shipped | Vector text watermark; removable with editing software (a deterrent, not tamper-proofing) |
| PDF to text | `/pdf-to-text` | Shipped | Only extracts real text; scanned image PDFs return little/nothing (no OCR) |
| PDF reader | `/pdf-reader` | Shipped | Viewer only; no annotation or highlighting |

## Platform & infrastructure

| Capability | Status | Notes |
| --- | --- | --- |
| 100% client-side processing | Shipped | No upload endpoint exists in this codebase |
| Responsive, accessible UI | Shipped | Keyboard support, focus styles, reduced-motion support, ARIA labels |
| Per-route SEO metadata | Shipped | `useSeo` at runtime + build-time static meta prerendering |
| `sitemap.xml` + `robots.txt` | Shipped | Generated at build time from the registry |
| JSON-LD (WebSite, Organization, SoftwareApplication, FAQPage, BreadcrumbList, BlogPosting) | Shipped | Injected per route |
| Content pages | Shipped | Home, Tools, Blog (4 articles), About, How it works, Contact, Privacy, Terms, Cookie policy |
| Unit tests | Shipped | 62 tests / 6 files: range parser, ZIP writer, pdf-lib operations, overlays, and deployment guards (`nginx.conf` `.mjs` mapping, anti-destructive `types {}` rule, Dockerfile→config wiring, PDF.js worker wiring). A real 4-page selectable-text fixture (`npm run fixture`) drives every pdf-lib tool end-to-end |
| Docker image + nginx | Shipped | Multi-stage build, health check, security headers, caching, and an explicit `types { application/javascript mjs; }` mapping (with `mime.types` re-included so nothing else regresses) so the PDF.js `.mjs` worker is served with the right MIME type. `npm run verify:worker` checks the live response |
| Automated browser (canvas/PDF.js) tests | Partial | Headless-Chrome check proves the `.mjs` module worker loads (the root cause of the PDF.js outage); pixel-level Canvas raster still needs a manual pass (see `PRODUCTION_AUDIT.md` §0 and §6) |
| Docker Compose | Shipped | Single `web` service |
| Static meta prerendering | Shipped | Real `dist/<route>/index.html` per route |
| Full server-side rendering (SSR) | Planned | Not implemented; current solution is documented honestly as prerendering |
| Real image re-compression in-browser | Planned | Compress currently rebuilds structure (lossless) or rasterises (lossy) |
| OCR for scanned PDFs | Planned | PDF-to-text reports image-only files instead of pretending |
| PDF search / annotation | Planned | Reader is view-only for now |
| Analytics / ads | Not included | No scripts bundled; CSP would need updating before adding any |
| Password-protected PDFs | Not supported | Detected and reported as a clear error; unlocking is not offered |
