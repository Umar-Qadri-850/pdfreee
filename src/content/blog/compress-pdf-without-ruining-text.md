---
title: How to compress a PDF without making the text unreadable
description: Why some PDFs shrink easily and others barely budge, how image-heavy scans behave, and an honest look at what lossless rewriting can and cannot achieve.
date: 2026-10-11
updated: 2026-10-11
category: Guides
tags: [compress, size]
readingTime: 6
tool: compress-pdf
---

"Compress PDF" sounds like a single button that always makes a file smaller. In reality the result depends entirely on what is inside the file. This guide explains what actually takes up space in a PDF, and sets honest expectations for what compression can do.

## What makes a PDF large

There are two broad reasons a PDF is big:

1. **Images.** Photos and scanned pages are stored as image data. A 300-page scanned document is essentially 300 photographs, and it is usually the images that dominate the file size.
2. **Structure and redundancy.** Documents edited repeatedly with different tools can accumulate unused objects, duplicate fonts, or leftover data from earlier versions.

A text-heavy report exported cleanly from a word processor is often already small, because text and vectors compress well and there is little to trim.

## Lossless rewriting versus image re-encoding

This distinction is the whole game:

- **Lossless rewriting** rebuilds the PDF structure, keeps every page and every image exactly as it is, and removes redundant objects. It never reduces image quality — but it also often cannot do much when the file is mostly images.
- **Image re-encoding** reduces the resolution or quality of embedded images. This is where large reductions come from, and it is also where the text in a scanned page can become blurry if pushed too far.

The [Pdfreee compress tool](/compress-pdf) currently performs lossless structural rewriting. That means it is safe for text and quality, but it will not shrink an image-heavy scan dramatically. The tool measures the before-and-after size for you and, importantly, tells you when the result is not smaller — so you never end up with a worse file for no reason.

## A realistic workflow

1. Check the current size. If a 2 MB text report "needs" to be smaller, the real fix may be removing pages rather than compressing.
2. Try a lossless rewrite first. If it helps and quality is untouched, use it.
3. If the file is still too big and it is image-heavy, lower the image quality deliberately. Many scanners let you re-scan at a lower DPI, which is often cleaner than post-processing.
4. For documents you no longer need at full resolution, [convert pages to JPG](/pdf-to-jpg) at a modest DPI and rebuild if archival quality is not required.

## Honest limitations

- **Not every file shrinks.** A file that is already optimised can come out the same size, or marginally larger after re-saving. A trustworthy tool says so rather than claiming a target it cannot meet.
- **You cannot keep image quality and cut size without limit.** Something has to give, and with images, it is resolution or precision.
- **Text stays text.** Lossless rewriting never rasterises your text, so it remains selectable and searchable.

## Troubleshooting

**The output is larger than the input.** This can happen when the original was already highly optimised. Keep the original — it is the better file.

**The file will not open after compressing.** Rare, but if the source PDF was slightly damaged, rebuilding can surface the problem. Re-check the original with the [PDF reader](/pdf-reader).

## The short version

Compression is not magic. Lossless rewriting removes redundancy without touching quality and is the safe default. Big reductions on scans require re-encoding images, which trades quality for size. A good tool states which one it is doing and reports the measured result.

