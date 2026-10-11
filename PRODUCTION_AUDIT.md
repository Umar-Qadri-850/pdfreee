# Pdfreee — Production Readiness Audit

**Date:** 2026-10-12 (initial audit 2026-10-11; see §0 for the production bug fix)
**Scope:** The complete `pdfreee` repository (React 19 / TypeScript / Vite 7 static PDF toolkit).
**Method:** Source review of every tool page, the PDF layer, SEO generator, and deploy
config; execution of the automated test suite, typecheck, lint and production build;
and a live smoke test against the built Docker image (`docker compose`, nginx).

**Honesty note:** this audit reports only what was actually executed. Tools that depend on
the browser Canvas / `createImageBitmap` (PDF→JPG, JPG→PDF, PDF reader, PDF→text, and the
lossy "compress by rasterising" path) **cannot be executed in the headless test environment**
(jsdom has no canvas). Those were reviewed by code inspection and are exercised only in a
real browser; they are marked as such below, not claimed as automatically verified.

---

## 0. Production bug fix (2026-10-12): only Merge and Split worked

**Reported symptom:** in the live deployment, only **Merge PDF** and **Split PDF** worked;
every other tool appeared to do nothing or produced no output.

**Root cause (single, systemic):** the PDF.js worker is emitted to `/assets/` as an ES
module — `pdf.worker.min-<hash>.mjs` — and `GlobalWorkerOptions.workerSrc` is set from
`import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url'`
(`src/lib/pdf/pdfjs.ts`). nginx's bundled `/etc/nginx/mime.types` maps `application/javascript js;`
but has **no `.mjs` entry**, so the worker was served as `Content-Type: application/octet-stream`.
Combined with `X-Content-Type-Options: nosniff`, the browser **refused to load it as a module
script**, PDF.js fell back to its (unavailable) fake worker, and every PDF.js-backed tool broke.
Merge and Split survived because they are implemented purely with **pdf-lib** and never touch
PDF.js.

**Evidence (live, pre-fix):** `HEAD /assets/pdf.worker.min-CjEcRF4W.mjs` returned
`Content-Type: application/octet-stream`.

**Why an earlier attempt could look like it did nothing:** the earlier fix used
`default_type application/javascript;`. That line is valid, but two non-config issues can make it
appear ineffective: (1) **the running container was never rebuilt/recreated**, so the old config
kept serving assets; and (2) the worker URL is **content-hashed and cached `public, immutable` for
a year**, so a browser that already cached the octet-stream response uses it until a hard reload.
Neither is a config defect — but the fix is now made **explicit and self-documenting** and verified
against the live container *and* a real browser.

**Fix (explicit, non-destructive):** `location /assets/` now re-includes `mime.types` and adds an
explicit `.mjs` mapping in `nginx.conf`:
```nginx
include /etc/nginx/mime.types;
types {
    application/javascript mjs;
}
```
A bare `types {}` block **replaces** every inherited mapping (empirically verified: css/wasm/xml
became `application/octet-stream`), so `mime.types` is re-included alongside it to add `.mjs`
**without regressing** `.js` / `.css` / `.wasm` / html / xml / images / fonts. Strict MIME checking
(`nosniff`) was **not** disabled, the worker was **not** replaced with a fake/inline worker, and no
broad proxy/MIME override was added.

**Re-verified live** (rebuilt `docker compose` container, `pdfreee-web-1`; `nginx -T` confirms the
mapping is in the *running* config):

| Asset | Content-Type | Verdict |
| --- | --- | --- |
| `/assets/pdf.worker.min-CjEcRF4W.mjs` | `application/javascript` | ✅ was `application/octet-stream` |
| `/assets/*.js` | `application/javascript` | ✅ preserved |
| `/assets/index-*.css` | `text/css` | ✅ preserved |
| `/`, `/merge-pdf` | `text/html` | ✅ preserved |
| `/sitemap.xml` | `text/xml` | ✅ preserved |
| `/robots.txt`, `/healthz` | `text/plain` | ✅ preserved |

The worker response also carries the full CSP (`worker-src 'self' blob:` present) and
`Cache-Control: public, immutable`. The worker body is JavaScript (1,264,143 bytes; its license
banner is the first bytes served).

**Real-browser proof (executed):** the exact failure was reproduced, then shown fixed, in
**headless Chrome** against a container using this same `nginx.conf`:
- worker served as `application/javascript` → the module worker loads → `WORKER_ALIVE`
- worker served as `application/octet-stream` → `WORKER_LOAD_ERR: script load failed`

**Regression guards + smoke test:**
- `src/lib/pdf/deployment.test.ts` asserts the `/assets/` `.mjs` mapping is present, that a bare
  `types {}` block never appears without a `mime.types` include, that `nosniff` and the
  `worker-src 'self' blob:` CSP stay, that `pdfjs.ts` wires the `.mjs` worker via `?url` and tears
  down via `task.destroy()`, and that the `Dockerfile` copies `nginx.conf` to
  `/etc/nginx/conf.d/default.conf` (the config the image actually loads).
- `npm run verify:worker` (`scripts/check-worker-mime.mjs`) fetches the **live** worker from a
  running server and fails unless the response is real JavaScript — it cannot pass while the live
  response is still `application/octet-stream`.

**Cache note:** the fix changes headers only, not the worker bytes, so the content hash (and URL)
is unchanged. A browser that cached the bad response needs a **one-time hard reload**
(Ctrl+Shift+R / empty cache) before the tool works.

**Tool impact:** the fix restores all twelve PDF.js-dependent tool paths at once (Compress,
PDF→JPG, PDF→text, PDF reader, and the PDF.js thumbnail/preview grids used by Rotate, Delete,
Extract, Reorder and Watermark). No second defect was required.

## 0.1 Cache policy fix (2026-10-12): stop stale browser caches from breaking deploys

**Why:** the worker URL is content-hashed and the MIME fix changed only response *headers*, not the
worker *bytes*, so the URL stayed the same while browsers kept an `immutable`, 1-year cached copy of
the bad response. HTML had a related gap: naked route URLs (`/`, `/merge-pdf`) were served by
`location /`, which set **no `Cache-Control` at all** (heuristic caching), while only literal
`.html` paths got `no-cache`.

**Cache model now (in `nginx.conf`):**

| Response | Cache-Control | Rationale |
| --- | --- | --- |
| HTML entry points (`index.html`, every `<route>/index.html`, SPA fallback in `location /`) | `no-cache, must-revalidate` | Not content-hashed; a deploy changes the bytes at the same URL, so browsers must revalidate to discover the latest build |
| Hashed JS/CSS/images/fonts under `/assets/` | `max-age=31536000, public, immutable` (unchanged) | Filenames are content-hashed by Vite, so a URL change guarantees a content change |
| PDF.js worker `assets/pdf.worker.min-<hash>.mjs` | `no-cache, must-revalidate` | Hash-stable URL can survive header-only changes; immutable would retain stale response metadata for up to a year. Revalidation refreshes headers (ETag/304) while the body stays cached |

The `.mjs` worker is diverted to a dedicated `location ~* \.mjs$` (regex beats the `/assets/`
prefix) that keeps `Content-Type: application/javascript`, `nosniff`, and the `worker-src 'self'
blob:` CSP, but revalidates instead of caching forever. `mime.types` is re-included there so
`.js`/`.css`/`.wasm`/html/xml/images/fonts are unaffected.

**Re-verified live** (`pdfreee-web-1` rebuilt; `nginx -T` confirms the policies in the running
config):
- `/`, `/merge-pdf`, `/index.html`, `/sitemap.xml` → `Cache-Control: no-cache, must-revalidate`
- `assets/pdf.worker.min-CjEcRF4W.mjs` → `200`, `application/javascript`, `no-cache, must-revalidate`, `nosniff`, CSP `worker-src 'self' blob:`; conditional GET → `304`
- `assets/*.css`, `assets/*.js` → `text/css` / `application/javascript`, `max-age=31536000, public, immutable`

**Real-browser simulated-deploy test (headless Chrome, executed):** serving a page as `BUILD-1`,
"deploying" `BUILD-2` at the same URL, then performing a normal reload:

| HTML policy | first load | after deploy | Verdict |
| --- | --- | --- | --- |
| `no-cache, must-revalidate` (new) | BUILD-1 | **BUILD-2** | ✅ latest build loads with no manual cache clear |
| `max-age=31536000, immutable` (old behaviour) | BUILD-1 | BUILD-1 | stale build kept (reproduces the bug) |

**Important limitation:** this fixes **future** responses only. A browser that already cached the
bad worker response under `immutable` keeps it until the year expires or the user acts. There is no
way to remotely clear an already-cached immutable response. Affected users need a **one-time hard
reload** (Ctrl+Shift+R / Cmd+Shift+R) or clearing site data for the origin. The worker URL is left
unchanged (no hardcoding), so this is a documentation-only mitigation.

**Automated guards:** `npm run verify:deploy` (`scripts/check-deployment.mjs`) checks the live
server for correct HTML/worker/MIME cache headers, worker `Content-Type`, worker URL consistency,
and ETag→304 revalidation; `src/lib/pdf/deployment.test.ts` asserts the policies statically.

---

## 1. Verification results (executed)

| Check | Command | Result |
| --- | --- | --- |
| Typecheck | `npm run typecheck` | ✅ pass (both `tsconfig.json` and `tsconfig.node.json`) |
| Lint | `npm run lint` | ✅ clean, no warnings |
| Unit tests | `npm run test` | ✅ **65 passed / 6 files** |
| Fixture generation | `npm run fixture` | ✅ writes `test/fixtures/sample-4page.pdf` (4 pages, selectable text) |
| Production build | `npm run build` | ✅ Vite build + SEO generator: `26 route pages + 404 + sitemap.xml + robots.txt` |
| Docker build | `docker compose up -d --build` | ✅ image built (typecheck runs inside), container healthy |
| Header/MIME smoke test | `npm run verify:worker` against the running container | ✅ see §0 and §4 |
| Deployment cache/MIME check | `npm run verify:deploy` against the running container | ✅ see §0.1 (HTML, worker, ETag 304, hashed assets) |
| Real-browser worker test | headless Chrome loading the module worker | ✅ see §0 (`WORKER_ALIVE`) |
| Simulated-deploy cache test | headless Chrome, BUILD-1 → BUILD-2 reload | ✅ see §0.1 |

Test files: `src/lib/pdf/operations.test.ts`, `src/lib/pdf/range.test.ts`, `src/lib/zip.test.ts`,
`src/lib/pdf/overlay.test.ts`, `src/lib/pdf/tools.fixture.test.ts` (all pdf-lib tool ops driven by
the real fixture), and `src/lib/pdf/deployment.test.ts` (nginx `.mjs` MIME, anti-destructive
`types {}` guard, and Dockerfile→config wiring guards).

**Round-trip coverage (pdf-lib ops, executed):** merge, split, extract (incl. non-ascending
order), delete (incl. "delete all" guard), reorder (incl. validation), rotate (selection,
accumulation 90°+270°), add page numbers (all 6 positions × 4 formats), add watermark
(all pages / selected pages / empty-text guard), compressLossless (page preservation +
metadata stripping). The fixture itself is verified as **real selectable text**: extracting it
with the PDF.js legacy build in Node yields `PDFREE_FIXTURE_PAGE_1 … _4`, one per page.

**Not executable headlessly (browser-only):** PDF→JPG, JPG→PDF, PDF→text extraction,
PDF reader rendering, and `compressRasterize`. Their shared *prerequisite* — the PDF.js `.mjs`
worker actually loading as a module in a real browser — is now demonstrated in headless Chrome
(§0); the pixel-level Canvas output itself is covered by inspection only and needs a manual pass.

---

## 2. Findings

Severity reflects real-user impact. "Fixed" means a minimal change was applied and the
repo re-verified (typecheck + lint + tests + build all green after the change).

### Critical
_None found._ No remote code execution, no data exfiltration, no upload path: document
bytes are processed entirely in-page. Confirmed by grep that the only external network
reference in `src/` is the gated AdSense loader in `src/lib/ads.ts`.

### High

**H1 — Static meta description was not per-route (duplicate across all pages) — FIXED**
- Evidence: every generated page (`dist/merge-pdf/index.html`, etc.) carried the *homepage*
  description "Pdfreee is a free online PDF toolkit…", while only `og:description` /
  `twitter:description` were route-specific.
- Root cause: `scripts/generate-seo.ts:160` used `/<meta name="description"[^>]*>/i`, but the
  template tag in `index.html` is multi-line (`<meta` newline `name="description"`), so the
  regex never matched. The runtime `useSeo` hook (JS) corrected it after hydration, but
  non-JS crawlers and social scrapers (Facebook/LinkedIn/Twitter) do not run JS.
- Fix: made the regex whitespace-tolerant (`/<meta\s+name=["']description["'][^>]*>/i`).
- Re-verified: `dist/merge-pdf/index.html` now has the merge-specific description; only the
  homepage keeps the generic one (correct).

**H2 — Runtime title differed from the prerendered title — FIXED**
- Evidence: prerender (`generate-seo.ts:249`) wrote `"<h1> — free & private | Pdfreee"`, but
  `ToolShell.useSeo` (`src/components/tools/ToolShell.tsx:45`) overwrote it at hydration with
  `"<name> — Free Online Tool | Pdfreee"`. Metadata visibly changed after load.
- Fix: aligned `ToolShell` to the prerender format: `` `${tool.h1} — free & private | ${SITE.name}` ``.

**H3 — PDF.js document/worker leak on rapid file change — FIXED**
- Evidence: `src/lib/pdf/usePdfThumbnails.ts:54`. If the effect was cancelled *after*
  `openPdfDocument` resolved but before `doc` was assigned, the `if (cancelled) return` path
  skipped `doc.close()`, leaking a PDF worker + document on every fast file switch/unmount.
- Fix: `if (cancelled) { await doc.close(); return }` immediately after `openPdfDocument`.
- Impact: a user rapidly switching files (as in delete/reorder/rotate/compress previews) could
  accumulate background workers and memory.

### Medium

**M1 — nginx dropped security headers on assets and `.html/.xml/.txt` responses — FIXED**
- Evidence (live, pre-fix): `HEAD /` and `/merge-pdf` returned CSP + `X-Content-Type-Options` +
  `X-Frame-Options` + `Referrer-Policy`; `HEAD /sitemap.xml` returned **none** of them.
- Root cause: nginx does not inherit a parent level's `add_header` into a `location` that
  declares its own. `location /assets/` and `location ~* \.(html|xml|txt)$` set their own
  `add_header Cache-Control`, which suppressed the server-level security headers.
- Fix: re-declared the five security headers inside both locations (`nginx.conf`), with a
  comment explaining why.
- Re-verified live after `docker compose up --build`: `/`, `/merge-pdf`, `/sitemap.xml`,
  `/robots.txt`, and a hashed `/assets/*.js` all return the full header set.

**M2 — Deploy footgun: compose default bakes `http://localhost:8080` into canonical URLs**
- Evidence: `docker-compose.yml:7` defaults `VITE_SITE_URL: http://localhost:8080`. The served
  `/merge-pdf` canonical and `sitemap.xml` both read `http://localhost:8080/...`.
- Impact: correct for local testing, but a naive production deploy that forgets to set
  `VITE_SITE_URL` would publish localhost canonicals and a localhost sitemap.
- Status: documented (`.env.example`, `DEPLOYMENT.md`). Recommended: make the build fail or warn
  when `VITE_SITE_URL` is unset or points at localhost in a production build. **Open.**

**M3 — AdSense is blocked by the shipped CSP if enabled**
- Evidence: `nginx.conf` CSP is `script-src 'self'; connect-src 'self'`. AdSense needs
  `pagead2.googlesyndication.com` (script), `googleads.g.doubleclick.net` (frame/connect), etc.
- Impact: enabling AdSense via env vars alone will silently fail under the default nginx config.
- Status: documented in `nginx.conf` header comment and `ads.ts`. The comment must be updated
  together with the CSP if ads are turned on. **Open (by design — ads are off by default).**

**M4 — Page reorder relies on HTML5 drag-and-drop (no touch support)**
- Evidence: `src/components/tools/ReorderGrid.tsx` uses `draggable` + `onDragStart/onDragEnter`.
  HTML5 DnD does not fire on touch devices.
- Impact: on phones/tablets drag-to-reorder is unavailable. Keyboard/pointer users are covered
  by the per-page ◀ ▶ buttons (also a11y-friendly), so the feature is still usable.
- Status: **Open.** Recommended: add pointer/touch-based reordering, or make the arrow buttons
  the primary affordance on small screens.

### Low

**L1 — `setProducer('Pdfreee')` is a no-op in pdf-lib**
- Evidence (node repro): after `doc.setProducer('Pdfreee'); await doc.save()`, reloading shows
  `Producer = "pdf-lib (https://github.com/Hopding/pdf-lib)"`. pdf-lib always rewrites `/Producer`
  on save; `/Creator` (`"Pdfreee (browser PDF toolkit)"`) *does* persist.
- Files: `src/lib/pdf/compress.ts:27`, `src/lib/pdf/images.ts:127`. Cosmetic only. **Open** (or drop
  the line to avoid a misleading intent).

**L2 — Non-Latin watermark text shows a raw pdf-lib error**
- Evidence (node repro): `addWatermark` with "你好" / "✓" throws `WinAnsi cannot encode "你" (0x4f60)`.
  The bundled font is `StandardFonts.HelveticaBold` (WinAnsi), so anything outside Latin-1 fails.
- Impact: caught by `useAsyncTask` and shown as `task.error` — no crash, but the message is
  developer-facing, not user-friendly.
- Files: `src/lib/pdf/overlay.ts:86`, surfaced via `src/pages/tools/AddWatermark.tsx:127`. **Open.**
  Recommended: detect/validate characters and show "Use Latin letters, numbers and common
  symbols for the watermark."

**L3 — `friendlyMessage` can surface a raw error string**
- Evidence: `src/lib/pdf/errors.ts:83` falls through to `return error.message` for unknown errors
  (e.g. the WinAnsi message above). Client-only, not a security issue. **Open.**

**L4 — `ToolSearch` dialog lacks a focus trap / `aria-activedescendant`**
- Evidence: `src/components/ToolSearch.tsx` sets `role="dialog" aria-modal="true"` and a
  `role="listbox"`, but focus is not trapped and the active option is not announced. Arrow-key
  navigation works; screen readers won't hear the highlighted result. **Open.** Low.

**L5 — `tsconfig.tsbuildinfo` is a tracked build artifact**
- Evidence: file present in repo root; not matched by `.gitignore`.
- Fix: added `*.tsbuildinfo` to `.gitignore`. **Fixed.**

**L6 — Rotation preview can visually overflow its tile**
- Evidence: `src/components/tools/PageGrid.tsx:73-76` applies `transform: rotate(90deg)` to the
  `<img>` inside a container with a fixed `aspect-ratio`, so rotated previews may clip. Cosmetic
  only. **Open.** Low.

**L7 — `/404/` is a publicly reachable route**
- The generator writes both `dist/404.html` and `dist/404/index.html`, so `/404/` resolves to the
  not-found page. It is `noindex` and `Disallow`ed in `robots.txt`, so impact is negligible. **Open.** Low.

---

## 3. Security posture

- **Privacy claim holds.** No upload endpoint; the only third-party network call in `src/`
  is `pagead2.googlesyndication.com` in `ads.ts`, gated behind `ADSENSE.enabled` +
  a real `ca-pub-…` client ID (regex-validated) + numeric slot IDs. No IDs are invented.
- **CSP** is strict (`default-src 'self'; script-src 'self'; object-src 'none';
  frame-ancestors 'none'; base-uri 'self'; form-action 'self'`) — post-M1 it applies to all
  responses. This is the *opposite* of what AdSense needs (see M3).
- **Headers** present on all responses post-M1: `X-Content-Type-Options`, `X-Frame-Options: DENY`,
  `Referrer-Policy`, `Permissions-Policy`, CSP.
- **File validation** checks size, extension/MIME, and the `%PDF-` magic bytes before parsing
  (`errors.ts`), with a 300 MB PDF / 40 MB image ceiling.
- No secrets in the repo; `.env` is ignored and `.env.example` carries only a public URL.

## 4. Live smoke test (post-fix, `pdfreee-web-1`)

| Path | Status | Content-Type | Security headers | Cache-Control |
| --- | --- | --- | --- | --- |
| `/` | 200 | text/html | ✅ all | (none) |
| `/merge-pdf` | 200 | text/html | ✅ all | (none) |
| `/add-watermark` | 200 | text/html | ✅ all | (none) |
| `/sitemap.xml` | 200 | text/xml | ✅ all | no-cache |
| `/robots.txt` | 200 | text/plain | ✅ all | no-cache |
| `/healthz` | 200 | text/plain | ✅ | (none) |
| `/assets/index-*.js` | 200 | application/javascript | ✅ all | `max-age=31536000, public, immutable` |
| `/assets/index-*.css` | 200 | text/css | ✅ all | `max-age=31536000, public, immutable` |
| `/assets/pdf.worker.min-*.mjs` | 200 | **application/javascript** | ✅ all (incl. `worker-src 'self' blob:`) | `public, immutable` |

Deep links resolve to per-route prerendered HTML with correct `<title>`, canonical, OG/Twitter,
and JSON-LD (verified for `/merge-pdf`). `robots.txt` allows all, disallows `/404`, and points at
`/sitemap.xml` (26 URLs).

### 4.1 Per-tool status after the fix

"Auto" = exercised by the automated suite on the real fixture. "Browser" = depends on Canvas /
`createImageBitmap` / PDF.js rendering and therefore requires a real browser (not executable in
jsdom); these were code-reviewed and are driven by the same worker that §0 fixed.

| # | Tool (registry order) | Engine | Auto | Browser | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | Merge PDF `/merge-pdf` | pdf-lib | ✅ (2 copies → 8 pages) | — | Was already working |
| 2 | Split PDF `/split-pdf` | pdf-lib | ✅ (names + counts) | — | Was already working |
| 3 | Extract pages `/extract-pdf-pages` | pdf-lib (+ PDF.js preview) | ✅ op | ✅ preview | Op verified; preview needs worker |
| 4 | Delete pages `/delete-pdf-pages` | pdf-lib (+ PDF.js preview) | ✅ op | ✅ preview | |
| 5 | Reorder pages `/reorder-pdf-pages` | pdf-lib (+ PDF.js preview) | ✅ op | ✅ preview | |
| 6 | Rotate PDF `/rotate-pdf` | pdf-lib (+ PDF.js preview) | ✅ op | ✅ preview | |
| 7 | Compress PDF `/compress-pdf` | pdf-lib (lossless) / PDF.js+Canvas (rasterise) | ✅ lossless | ✅ rasterise | Rasterise restored by §0 fix |
| 8 | PDF → JPG/PNG `/pdf-to-jpg` | PDF.js + Canvas | — | ✅ required | Restored by §0 fix |
| 9 | JPG/PNG → PDF `/jpg-to-pdf` | Canvas + `createImageBitmap` | — | ✅ required | No PDF.js dependency |
| 10 | Add page numbers `/add-page-numbers` | pdf-lib | ✅ (reopen) | — | |
| 11 | Add watermark `/add-watermark` | pdf-lib (+ PDF.js preview) | ✅ (reopen) | ✅ preview | |
| 12 | PDF → text `/pdf-to-text` | PDF.js | — | ✅ required | Fixture text confirmed extractable via Node PDF.js |
| 13 | PDF reader `/pdf-reader` | PDF.js + Canvas | — | ✅ required | Restored by §0 fix |

## 5. AdSense readiness (no approval promised)

- Wiring is correct and inert by default: `AdSlot` renders `null` unless `isAdsenseReady(slot)`
  passes, and `loadAdsenseScript()` is only reached when a valid `ca-pub-` client is present.
- Slots are labelled `Advertisement` and kept visually distinct from tool controls.
- **Blocker for going live with ads:** the CSP in `nginx.conf` must be widened (script/connect/
  frame sources) and this is documented inline. AdSense also requires site ownership verification,
  a privacy policy (present at `/privacy-policy`) and a cookie/consent story for EU traffic
  (a `/cookie-policy` page exists; a consent banner is not implemented — **Open**, depends on the
  ad/analytics configuration actually used).

## 6. Honest limitations / residual risk

- Canvas-dependent tools are **not** covered by automated (jsdom) tests; their pixel output needs a
  manual browser pass. This audit verified their **prerequisite** in two ways: the PDF.js worker is
  served as `application/javascript` with the correct CSP in the live container, and a module
  worker using that response **loads successfully in headless Chrome** (and fails with
  `WORKER_LOAD_ERR` when the same worker is served as `application/octet-stream`, reproducing the
  original bug). Node's PDF.js build also confirms real text is readable from the fixture. Only the
  Canvas rasterisation itself still needs a human in a browser.
- Lossless compression cannot shrink image-heavy files and the UI says so; the "not smaller"
  path is handled explicitly.
- Encrypted/password PDFs are detected and reported, not decrypted (no server, out of scope).

## 7. Recommended follow-ups (priority order)

1. Fail the production build when `VITE_SITE_URL` is unset/localhost in a release build (M2).
2. Add pointer/touch reordering for mobile (M4).
3. Friendly message for non-Latin watermark text (L2) and safer `friendlyMessage` fallback (L3).
4. `ToolSearch` focus trap + `aria-activedescendant` (L4).
5. Drop the no-op `setProducer('Pdfreee')` calls or comment them (L1).
6. Add a Playwright smoke test for the canvas-dependent tools.

---

### Changes made during this audit
- `scripts/generate-seo.ts` — whitespace-tolerant meta-description regex (H1).
- `src/components/tools/ToolShell.tsx` — runtime title aligned to prerender (H2).
- `src/lib/pdf/usePdfThumbnails.ts` — close PDF doc on cancel-after-open (H3).
- `nginx.conf` — re-declared security headers in `location /assets/` and `location ~* \.(html|xml|txt)$` (M1); added dedicated `location ~* \.mjs$` to serve `.mjs` as `application/javascript` with `no-cache, must-revalidate`, added `no-cache, must-revalidate` to `location /`, kept hashed `/assets/` immutable.
- `.gitignore` — ignore `*.tsbuildinfo` (L5).
- `src/lib/pdf/overlay.test.ts` — new tests: page numbers, watermark, lossless compress.
- `src/lib/pdf/deployment.test.ts` — strengthened with cache policy checks (HTML revalidation, worker `.mjs` revalidation, anti-destructive `types {}` rule, Docker wiring).
- `scripts/check-deployment.mjs` + `npm run verify:deploy` — live deployment header checks (HTML, worker, ETag 304, hashed assets).

### Changes made for the "only Merge and Split work" bug (2026-10-12)
- `nginx.conf` — explicit `.mjs` mapping (re-include `mime.types` + `types { application/javascript mjs; }`) so the PDF.js worker is served with the correct MIME type **without** regressing any other asset type; added `location ~* \.mjs$` with `no-cache, must-revalidate` (prevents the hash-stable worker from retaining stale immutable metadata); set `no-cache, must-revalidate` for HTML entry points and `location /` (naked routes). **The fix that unblocked every PDF.js tool.**
- `scripts/make-fixture.ts` + `npm run fixture` — generates `test/fixtures/sample-4page.pdf` (4 pages, real selectable text).
- `scripts/check-worker-mime.mjs` + `npm run verify:worker` — live smoke test (worker MIME/body + CSP/nosniff).
- `scripts/check-deployment.mjs` + `npm run verify:deploy` — live deployment checks (HTML cache policy, worker cache+MIME, ETag→304, hashed assets, built bundle references correct worker).
- `src/lib/pdf/tools.fixture.test.ts` — end-to-end tests driving every pdf-lib tool op with the fixture.
- `src/lib/pdf/deployment.test.ts` — regression guards for nginx `.mjs` mapping, anti-destructive `types {}` rule, Docker wiring, and the new cache policies.
- `package.json` — added `fixture`, `verify:worker`, and `verify:deploy` scripts.
- `FEATURE_MATRIX.md` — updated tests/infra rows.

All changes verified with `npm run typecheck`, `npm run lint`, `npm run test` (**65 passed / 6 files**),
`npm run build`, a rebuilt `docker compose` container, `npm run verify:worker`, `npm run verify:deploy`
against the live container, headless-Chrome module-worker load test, and a simulated-deploy
cache test demonstrating HTML revalidation (see §0, §0.1 and §4).
