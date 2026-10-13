# Blog plan

**Honesty note:** no search-volume, difficulty, or traffic figures appear here.
None were measured for this project. Each entry lists the intent, the tool it
should funnel to, and the keyword the page is deliberately built around. Fill in
real metrics yourself with a keyword tool before choosing an order.

## How this plan is built

1. **One primary keyword per article**, matching the tool it supports.
2. **Informational intent for posts, transactional intent for tool pages.**
   A post answers "how/why"; the tool page does the task. Posts link to the
   tool; the tool does not try to rank for the informational query.
3. **Every post links to at least one tool and one other post.** The prerender
   `<noscript>` fallback and the in-page links keep the graph crawlable.
4. **No invented facts.** Any limitation stated in a post must match the tool
   page and `FEATURE_MATRIX.md`.

## Published

| Post | Primary keyword (intent) | Funnels to |
| --- | --- | --- |
| `how-to-merge-pdf-files.md` | how to merge PDF files (informational) | `/merge-pdf` |
| `extract-selected-pages-from-a-pdf.md` | extract pages from a PDF (informational) | `/extract-pdf-pages`, `/split-pdf` |
| `compress-pdf-without-ruining-text.md` | compress PDF without losing quality (informational) | `/compress-pdf` |
| `convert-images-to-pdf.md` | convert images to PDF (informational) | `/jpg-to-pdf`, `/pdf-to-jpg` |

## Planned (prioritised by tool coverage)

Priority reflects how central the tool is and how often the question is asked,
not measured volume.

| # | Working title | Primary keyword (intent) | Funnels to | Priority |
| --- | --- | --- | --- | --- |
| 1 | How to crop PDF margins (and why it stays lossless) | crop PDF (informational) | `/crop-pdf` | High |
| 2 | How to rotate a PDF and fix sideways scans | rotate PDF (informational) | `/rotate-pdf` | High |
| 3 | Delete or reorder PDF pages before you send a file | delete PDF pages (informational) | `/delete-pdf-pages`, `/reorder-pdf-pages` | High |
| 4 | Add page numbers to a PDF: positions, numbering, gotchas | add page numbers to PDF (informational) | `/add-page-numbers` | Medium |
| 5 | Watermark a PDF: what it does and does not protect | watermark PDF (informational) | `/add-watermark` | Medium |
| 6 | Extract text from a PDF, and what to do with scans | extract text from PDF (informational) | `/pdf-to-text` | Medium |
| 7 | PDF to JPG or PNG: choosing a resolution | PDF to JPG (informational) | `/pdf-to-jpg` | Medium |
| 8 | Sign a PDF without printing it | sign PDF (informational) | `/sign-pdf` | Medium |
| 9 | Add text or images to a PDF in the browser | edit PDF (informational) | `/edit-pdf` | Medium |
| 10 | Is it safe to process PDFs in your browser? | are online PDF tools safe (informational) | `/how-it-works`, `/privacy-policy` | Low |
| 11 | PDF file too large to email? Honest ways to shrink it | PDF too large to email (informational) | `/compress-pdf`, `/split-pdf` | Low |

## Format guidelines

- 700-1,200 words, one clear task, a short intro that states the outcome.
- Use the frontmatter fields already supported (`title`, `description`, `date`,
  `updated`, `tool`, `category`) so the post links to its tool automatically.
- Include the tool's real limitations; do not overpromise.
- Add a link to the FAQ for the quick-answer version of common questions.

## Cadence

Publish the High items first, one at a time, and only after the corresponding
tool page is reviewed for accuracy. Quality and honesty over volume.
