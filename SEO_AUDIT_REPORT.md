# SEO audit report

**Date:** 2026-10-13
**Scope:** Technical SEO and answer-engine optimisation (AEO) for the static
Pdfreee site.
**Honesty note:** this report contains no ranking, traffic, or impression claims.
No third-party SEO tool was run against a live deployment. Everything below
describes what the code actually emits and what was verified locally.

## What the site emits

### Per-route metadata

Every page calls `useSeo` (`src/lib/seo.ts`) to set, idempotently:

- `<title>` and `<meta name="description">`
- `<meta name="robots">` (`index, follow`, or `noindex` for 404)
- `<link rel="canonical">` resolved against `VITE_SITE_URL`
- Open Graph + Twitter card tags
- One per-route JSON-LD script

### Structured data

| Page type | JSON-LD |
| --- | --- |
| Home | `WebSite`, `Organization` |
| Tool page | `SoftwareApplication`, `HowTo`, `FAQPage`, `BreadcrumbList` |
| Blog index/posts | `BlogPosting`, `BreadcrumbList` |
| FAQ | `FAQPage`, `BreadcrumbList` |
| Other content pages | `BreadcrumbList` |

`HowTo` and the `FAQPage`/`llms.txt` additions are new in this pass; the rest
already existed.

### Build-time prerendering

`scripts/generate-seo.ts` runs after `vite build` and writes a real
`dist/<route>/index.html` per route with route-specific metadata, JSON-LD, and a
`<noscript>` fallback containing genuine content and internal links. This is
**static meta prerendering, not SSR**, and is described as such throughout.

### Files served for crawlers

- `sitemap.xml` and `robots.txt`, generated from the registry at build time.
- `llms.txt` (new), copied from `public/` into `dist/`.

## Changes in this pass

- Added `/faq` (searchable, FAQPage JSON-LD) and included it in the prerender
  list and sitemap.
- Added `HowTo` structured data to all tool pages, runtime and prerendered.
- Added `public/llms.txt` summarising the toolkit, limits, and honest scope.
- Added `/crop-pdf`; every tool is registered centrally, so its route, sitemap
  entry, metadata, and structured data were generated automatically.
- Added the FAQ link to the footer and the new tool links to the footer
  columns, improving internal linking and crawl paths.

## Verified locally

After `npm run build`:

- `[seo] Wrote 30 route pages + 404 + sitemap.xml + robots.txt`.
- `[seo] 4 blog post(s), 16 tool(s).`
- `dist/llms.txt` exists.
- `dist/sitemap.xml` contains both `/crop-pdf` and `/faq`.
- `dist/crop-pdf/index.html` contains `HowToStep`, `FAQPage`, and
  `SoftwareApplication` JSON-LD.

## Open recommendations (operator actions)

These are not done by the code and require a live deployment and accounts:

1. Replace the commented `google-site-verification` (and add Bing `msvalidate.01`)
   tokens in `index.html` once the real domain is connected.
2. Confirm the production `VITE_SITE_URL` matches the canonical domain so every
   canonical, sitemap URL, and OG tag is consistent.
3. Submit `sitemap.xml` in Google Search Console and Bing Webmaster Tools.
4. Add a real Open Graph image if desired; `og-image.svg` is used by default and
   note that some social scrapers prefer a raster PNG/JPG.
5. Validate structured data with the Rich Results Test and Schema Markup
   Validator after deploy, and fix any type-specific warnings they surface.
6. Continue the blog cadence described in `BLOG_PLAN.md` so tool pages gain
   supporting informational content.

## Known limitations

- Prerendered HTML contains metadata and fallback content, not the hydrated UI.
  JavaScript is still required to run the tools.
- The FAQ and tool FAQs are the same content surfaced in two places; keep
  `src/content/faq.ts` and the registry as the single sources of truth.
