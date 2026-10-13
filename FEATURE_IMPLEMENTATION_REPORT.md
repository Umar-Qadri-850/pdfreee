# Feature implementation report

**Branch:** `pdfreee-enhancements`
**Scope:** A focused enhancement pass over the existing Pdfreee toolkit. All
processing remains 100% client-side; no upload endpoint, backend, or external
API was introduced. Existing UI and behaviour were preserved.

**Verification for every commit below:** `npm run typecheck` (clean),
`npm run lint` (clean), `npm run test` (passing), and `npm run build` producing
the prerendered `dist/` output. Final state: **111 tests across 11 files**, build
prerenders **30 route pages + 404**, covering **16 tools** and **4 blog posts**.

## Commits

| Commit | Summary |
| --- | --- |
| `72fbea9` | `feat(filenames)`: output-name helpers, hook, and reusable field |
| `95e9963` | `feat(filenames)`: integrated the naming field into every tool |
| `43e5483` | `feat(filters)`: raster image filters for PDF-to-image and image-to-PDF |
| `2db8c1d` | `feat(faq)`: searchable FAQ page, shared content, route wiring |
| `301a1fb` | `feat(consent)`: consent manager gating ad scripts behind opt-in |
| `367a642` | `feat(crop)`: Crop PDF tool with page-box trimming |
| `330fc30` | `feat(seo)`: `llms.txt` and HowTo structured data |
| `e27d511` | `chore(legal)`: revision dates, consent notes, footer tool links |
| `fbcd446` | `chore(security)`: ad-consent docs, a11y refinements, lazy decoding |

## 1. Custom output filenames (all tools)

Users can now name the file they download, instead of a fixed default.

- `src/lib/utils.ts`: `sanitizeOutputBase()` and `outputFileName()`.
- `src/components/tools/useOutputFileName.ts`: hook returning
  `{ base, setBase, stem, fileName }`, re-syncing when the input file changes.
- `src/components/tools/FilenameField.tsx`: input with a fixed, visible
  extension suffix; blank input falls back to `document`.
- Integrated into all 15 pre-existing tool pages; the merge/split and
  image/zip paths use the sanitized stem where a base name is embedded.
- Tests: `src/lib/utils.test.ts` (12).

## 2. Raster image filters (PDF to JPG/PNG, JPG/PNG to PDF)

- `src/lib/pdf/filters.ts`: `FilterId`, `FILTER_PRESETS`, `isFilterId()`, a pure
  `filterPixels()`, and `applyFilterToContext()`. Presets: grayscale,
  black & white (threshold), sepia, invert, brighten, contrast. Alpha is
  preserved; no dependencies added.
- `src/lib/pdf/pdfjs.ts`: optional `transform` hook in `RenderOptions`, applied
  before the canvas is exported.
- `src/lib/pdf/images.ts`: `filter?: FilterId` added to both pipelines.
- `src/components/tools/FilterSelect.tsx` and UI wiring in `PdfToJpg` /
  `JpgToPdf`.
- Tests: `src/lib/pdf/filters.test.ts` (11).

## 3. FAQ page

- `src/content/faq.ts`: a single source of truth (`SITE_FAQS`, `HOME_FAQS`,
  `FAQ_CATEGORIES`). Size answers are derived from `FILE_LIMITS` so they cannot
  drift from the code. Node-safe (relative imports) for the build script.
- `src/pages/Faq.tsx`: search + category filter, accordion, FAQPage and
  BreadcrumbList JSON-LD, empty state. Registered at `/faq` (lazy route), linked
  from the footer and from the home FAQ section, and added to the prerender list.
- Tests: `src/content/faq.test.ts` (5).

## 4. Consent manager (ads gated behind opt-in)

- `src/lib/consent.ts`: versioned record in `localStorage` under
  `pdfreee.consent`; `readConsent`, `saveConsent`, `clearConsent`,
  `hasAdConsent`, `subscribeConsent`, and an open-preferences event.
- `src/components/consent/`: `useConsent`, `ConsentBanner` (Accept all /
  Reject non-essential / Customize, Escape-to-dismiss only after a choice
  exists), and `ConsentSettingsButton`.
- Enforcement: `loadAdsenseScript()` returns early without advertising consent,
  and `AdSlot` renders nothing unless consent is granted and real IDs exist.
- Cookie policy now shows the stored choice and links the settings control.
- Tests: `src/lib/consent.test.ts` (6).

## 5. New tool: Crop PDF (`/crop-pdf`)

- `src/lib/pdf/operations.ts`: `cropPages()` trims each edge by a percentage of
  the page's own size, setting media and crop boxes; rejects margins that would
  remove the whole page.
- Registered in the tool registry, `ToolIcon`, the router, and the footer.
- Tests added to `src/lib/pdf/operations.test.ts` (3).

## 6. SEO / AEO and trust

- `public/llms.txt` for AI answer engines; ships in `dist/`.
- HowTo structured data added alongside SoftwareApplication, FAQPage, and
  BreadcrumbList on every tool page, at runtime and in the prerendered HTML.
- Legal pages show a "Last updated" date; privacy and cookie pages document the
  single local-storage key the app writes.
- Footer gained packaging links for the new and previously unlinked tools.

## Deferred (with reasons)

These were evaluated and intentionally not built, because the current
dependencies cannot do them honestly:

| Feature | Why it is not offered |
| --- | --- |
| Office (Word/Excel/PPT) to/from PDF | No conversion engine is bundled, and adding one server-side would break the client-side model |
| OCR for scanned PDFs | Requires a WASM OCR engine and trained data (e.g. a ~10 MB+ download); out of scope for this pass |
| Unlock / Protect (encrypt) | `pdf-lib` cannot decrypt or encrypt documents |
| PDF/A conversion | No validator or true archival transform is available |
| Repair damaged PDFs | `pdf-lib` has no recovery mode; results would be unreliable |
| Scan to PDF | Requires camera capture UI and is a separate product surface |
| Compare / Redact | Not implemented; a visual diff and true content removal are non-trivial and easy to get wrong |

None of these are advertised as working anywhere in the UI, the registry, the
FAQ, or `llms.txt`.
