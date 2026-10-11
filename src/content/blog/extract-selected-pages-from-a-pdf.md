---
title: Extract selected pages from a PDF (the right way)
description: Pull exactly the pages you need into a new PDF, when to use extract versus split versus delete, and how to handle tricky page ranges.
date: 2026-10-11
updated: 2026-10-11
category: Guides
tags: [extract, organize]
readingTime: 4
tool: extract-pdf-pages
---

Extracting pages is the opposite of merging: instead of combining documents, you pull a subset of pages into a new file. It sounds simple, and it is — once you pick the right operation for the job.

## Extract, split, or delete?

These three tools overlap, and choosing the right one saves time:

- **Extract** keeps only the pages you name, in the order you name them. Use it when you want *this specific subset* and nothing else.
- **Split** breaks one document into several separate files. Use it when each part should stand on its own, such as splitting a workbook into per-chapter PDFs.
- **Delete** removes pages you do not want and keeps everything else. Use it when the "good" pages are most of the document and removing a few is faster than listing the rest.

## How to extract pages

1. Add the PDF to the [extract pages tool](/extract-pdf-pages).
2. Enter the pages you want to keep using ranges: `1-3, 7, 12-15`.
3. Run the extraction and download the new PDF.

The original file is never modified. You always get a new document.

## Reading page ranges

Ranges are inclusive and comma-separated:

- `1-3` means pages one, two, and three.
- `7` means just page seven.
- `1-3, 7, 12-15` means three, then one page, then four pages — eight pages in total.

Because extraction follows the order you write, `3, 1, 2` produces a document whose first page is the original page 3. That is useful for quick reordering, though the dedicated [reorder tool](/reorder-pdf-pages) is friendlier for large rearrangements.

## Common situations

**Pulling a single signed page.** Extract that page alone. Note that if the page carried a digital signature over the whole document, that signature's validity can change once the page is separated — verify before relying on it.

**Building a handout from a long report.** Extract the relevant sections and merge them in the desired order. See [how to merge PDFs](/blog/how-to-merge-pdf-files) if you need to combine the results with other files.

**Removing a cover sheet.** It is often quicker to delete the cover with the [delete tool](/delete-pdf-pages) than to list every remaining page.

## Troubleshooting

**The page numbers do not match.** Some documents have unnumbered cover pages or two-sided numbering. Always refer to the PDF's internal page count (the tool shows it) rather than a printed page number.

**The range is rejected.** Ranges must fall inside the document's page count. A range like `40-45` on a 30-page file is reported as an error before anything is processed.

## The short version

Use extract when you want a specific subset, split when each part is its own file, and delete when removing a few pages is easier than listing the rest. Ranges are 1-based, inclusive, and honour the order you write them in.
