# SEO approach

This document describes what the project actually does. It deliberately avoids
claims we cannot back up: there are no promised rankings, no purchased
backlinks, and no ad-network integration.

## 1. Per-route metadata at runtime

Every page calls the `useSeo` hook ([`src/lib/seo.ts`](src/lib/seo.ts)), which
sets, idempotently:

- `<title>`
- `<meta name="description">`
- `<meta name="robots">` (`index, follow`, or `noindex` for the 404 page)
- `<link rel="canonical">` (resolved against `VITE_SITE_URL`)
- Open Graph and Twitter card tags
- A single per-route `<script type="application/ld+json">` block

Tool pages additionally emit `SoftwareApplication`, `FAQPage` and
`BreadcrumbList` structured data via `ToolShell`; blog posts emit `BlogPosting`.

## 2. Build-time static meta prerendering

`scripts/generate-seo.ts` runs after `vite build`. For every route it reads the
built `dist/index.html` as a template and writes a real
`dist/<route>/index.html` containing that route's metadata and a `<noscript>`
fallback with genuine content and internal links.

**This is static meta prerendering, not server-side rendering.** The distinction
is important and is stated everywhere it is relevant:

- What it gives you: crawlers and social scrapers see correct per-route HTML;
  static hosts can serve deep links because each route is a real directory.
- What it does **not** do: it does not render the React tree on a server, so the
  initial HTML contains metadata and fallback content rather than the full
  hydrated UI. The app still hydrates on the client.

## 3. Sitemap and robots

- `dist/sitemap.xml` is generated from the tool registry plus the static and
  blog routes. `noindex` routes (the 404 page) are excluded.
- `dist/robots.txt` allows crawling, disallows `/404`, and points at the sitemap.

Both use the origin from `VITE_SITE_URL`.

## 4. Structured data

| Route type | Schema types |
| --- | --- |
| Home | `WebSite`, `Organization` |
| Tool pages | `SoftwareApplication`, `FAQPage`, `BreadcrumbList` |
| Blog posts | `BlogPosting`, `BreadcrumbList` |

FAQs and breadcrumbs are generated from the same data the UI renders, so the
markup cannot drift from the visible page.

## 5. Content

Four long-form guides live in `src/content/blog/`. They are written to answer
real questions and to link to the relevant tool, following the keyword targets
listed in [KEYWORD_RESEARCH.md](KEYWORD_RESEARCH.md).

## 6. Accessibility and performance (technical SEO)

- Semantic landmarks, a single `<h1>` per page, labelled form controls, visible
  focus styles, and `prefers-reduced-motion` support.
- Route-level code splitting keeps the heavy PDF libraries (`pdf-lib`,
  `pdfjs-dist`, the PDF.js worker) out of the initial bundle; they load only on
  the tool pages that need them.
- Long-cache, immutable headers for hashed `/assets/` in `nginx.conf`;
  revalidation for HTML/XML/TXT.

## 7. What we do NOT claim

- No fabricated backlink profile, domain authority, or ranking positions.
- No measured Core Web Vitals or Lighthouse scores are published here; run
  Lighthouse yourself against a real deployment.
- No AdSense approval or third-party script is bundled. If ads are added later,
  `script-src`/`connect-src`/`frame-src` in `nginx.conf` must be updated.

## 8. Pre-launch checklist

- [ ] Set `VITE_SITE_URL` to the real HTTPS origin before building.
- [ ] Verify `dist/sitemap.xml` and `dist/robots.txt` use that origin.
- [ ] Submit `sitemap.xml` in Google Search Console and Bing Webmaster Tools.
- [ ] Add the verification `<meta>` tags in `index.html` (placeholders included).
- [ ] Confirm representative deep links return the correct `<title>` with a
      `curl` against the deployed site.
- [ ] Validate JSON-LD with the Schema Markup Validator and the Rich Results Test.
