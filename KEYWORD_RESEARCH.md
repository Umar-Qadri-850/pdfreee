# Keyword research

> **Read this first.** No third-party search-volume, CPC, or difficulty figures
> are included below, because none were measured for this project. Inventing
> them would be fabrication. What this file provides is (a) the honest list of
> the terms each page is intentionally targeting, and (b) a repeatable method to
> fill in the real numbers yourself using a keyword tool.

## Targeting method

1. **One primary term per tool page.** The primary term is the keyword a user
   would type to reach that tool. It is already encoded per tool in
   [`src/content/registry.ts`](src/content/registry.ts) (`keywords[0]`).
2. **Support the long tail with content.** Each blog guide targets a
   question-style or "how do I" phrase that funnels to a tool.
3. **Keep intent aligned.** Tool pages are transactional/informational tool
   intent; blog posts are informational intent. Do not push a blog post to rank
   for a pure tool query or vice versa.

## Target terms (from the registry)

| Primary term | Intent | Target page | Secondary terms | Priority |
| --- | --- | --- | --- | --- |
| merge pdf | Tool | `/merge-pdf` | combine pdf, join pdf files, pdf merger | High |
| split pdf | Tool | `/split-pdf` | pdf splitter, split pdf pages, separate pdf | High |
| compress pdf | Tool | `/compress-pdf` | reduce pdf size, shrink pdf, pdf compressor | High |
| pdf to jpg | Tool | `/pdf-to-jpg` | pdf to png, pdf to image, convert pdf to jpg | High |
| jpg to pdf | Tool | `/jpg-to-pdf` | image to pdf, png to pdf, convert images to pdf | High |
| rotate pdf | Tool | `/rotate-pdf` | rotate pdf pages, turn pdf, rotate pdf 90 degrees | Medium |
| delete pdf pages | Tool | `/delete-pdf-pages` | remove pages from pdf, delete page pdf | Medium |
| reorder pdf pages | Tool | `/reorder-pdf-pages` | rearrange pdf, organize pdf pages, move pdf pages | Medium |
| extract pdf pages | Tool | `/extract-pdf-pages` | extract pages from pdf, pdf page extractor | Medium |
| add page numbers to pdf | Tool | `/add-page-numbers` | pdf page numbers, number pdf pages, paginate pdf | Medium |
| pdf watermark | Tool | `/add-watermark` | add watermark to pdf, watermark pdf online, stamp pdf | Medium |
| pdf to text | Tool | `/pdf-to-text` | extract text from pdf, pdf text extractor, convert pdf to text | Medium |
| pdf reader | Tool | `/pdf-reader` | view pdf online, open pdf in browser, read pdf | Low |

## Content targets

| Article | Primary query | Funnels to |
| --- | --- | --- |
| `how-to-merge-pdf-files.md` | how to merge pdf files | `/merge-pdf` |
| `compress-pdf-without-ruining-text.md` | compress pdf without losing quality text | `/compress-pdf` |
| `extract-selected-pages-from-a-pdf.md` | extract pages from pdf | `/extract-pdf-pages` |
| `convert-images-to-pdf.md` | convert images to pdf | `/jpg-to-pdf` |

## Filling in the data (do this yourself)

Use a keyword tool you have access to and record real numbers. Suggested columns
to add next to each term above:

| Column | Meaning |
| --- | --- |
| `volume` | Average monthly searches (from your tool) |
| `cpc` | Cost-per-click estimate (from your tool) |
| `difficulty` | The tool's difficulty/competition metric |
| `current_rank` | Your position once indexed (leave blank until measured) |

Sources you can use: Google Keyword Planner, Google Search Console (once live),
Bing Webmaster Tools, or any paid keyword tool you already subscribe to.

## Review cadence

- Re-check Search Console queries monthly and add any high-impression query that
  the current pages do not already answer.
- Add a supporting article when a tool page ranks but a related question keeps
  appearing.
- Never add volume/rank claims to the site copy unless they come from a real,
  current measurement.
