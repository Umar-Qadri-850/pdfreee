/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Regression guards for the production deployment.
 *
 * Two production bugs were caused by how nginx served the SPA:
 *
 * 1. The PDF.js worker is an ES module (.mjs). nginx's mime.types has no ".mjs"
 *    entry, so it was served as application/octet-stream and the browser refused
 *    to load it as a module script. Fixed by explicitly mapping .mjs to
 *    application/javascript.
 * 2. That same worker is served with `immutable` + `max-age=1y`. Its filename is
 *    content-hashed, so the URL stays identical across deploys even when response
 *    headers change - an immutable cached copy therefore keeps stale response
 *    metadata for up to a year. .mjs is now revalidated (no-cache, must-revalidate)
 *    so browsers always refresh headers via ETag/304. HTML entry points must
 *    revalidate for the same reason (they are not content-hashed).
 *
 * These tests fail loudly if those policies (or the worker wiring, or the config
 * the Docker image actually loads) are ever regressed.
 */
const read = (rel: string) => readFileSync(resolve(process.cwd(), rel), 'utf8')

const nginxConf = read('nginx.conf')
const dockerfile = read('Dockerfile')
const pdfjsSource = read('src/lib/pdf/pdfjs.ts')

/** Return the full `{ ... }` block that follows the first match of `header`. */
function extractBlock(source: string, header: RegExp): string {
  const match = header.exec(source)
  if (!match) return ''
  const open = source.indexOf('{', match.index)
  if (open === -1) return ''
  let depth = 0
  for (let i = open; i < source.length; i++) {
    if (source[i] === '{') depth++
    else if (source[i] === '}') {
      depth--
      if (depth === 0) return source.slice(open, i + 1)
    }
  }
  return ''
}

const mjsBlock = extractBlock(nginxConf, /location\s+~\*\s+\\\.mjs\$\s*\{/)
const assetsBlock = extractBlock(nginxConf, /location\s+\/assets\/\s*\{/)
const htmlBlock = extractBlock(nginxConf, /location\s+~\*\s+\\\.\(html\|xml\|txt\)\$\s*\{/)
const rootBlock = extractBlock(nginxConf, /location\s*\/\s*\{/)

describe('nginx: HTML entry points must revalidate (never immutable)', () => {
  it('serves the app HTML with no-cache, must-revalidate', () => {
    expect(htmlBlock).toMatch(/Cache-Control\s+"no-cache,\s*must-revalidate"/)
    expect(rootBlock).toMatch(/Cache-Control\s+"no-cache,\s*must-revalidate"/)
  })

  it('does not mark HTML as immutable', () => {
    expect(htmlBlock).not.toMatch(/immutable/)
    expect(rootBlock).not.toMatch(/immutable/)
  })

  it('keeps the security headers on every HTML-serving location', () => {
    expect(htmlBlock).toContain('X-Content-Type-Options "nosniff"')
    expect(rootBlock).toContain('X-Content-Type-Options "nosniff"')
  })
})

describe('nginx: hashed assets stay immutable', () => {
  it('serves /assets/ with immutable caching for js/css/wasm', () => {
    expect(assetsBlock).toMatch(/Cache-Control\s+"public,\s*immutable"/)
    expect(assetsBlock).toMatch(/immutable/)
    expect(assetsBlock).not.toMatch(/no-cache/)
  })
})

describe('nginx: the .mjs PDF.js worker is JavaScript AND revalidated', () => {
  it('maps .mjs to application/javascript in a dedicated location', () => {
    expect(mjsBlock).not.toBe('')
    expect(mjsBlock).toMatch(/application\/javascript\s+mjs\s*;/)
  })

  it('revalidates .mjs instead of allowing stale immutable metadata', () => {
    expect(mjsBlock).toMatch(/Cache-Control\s+"no-cache,\s*must-revalidate"/)
    expect(mjsBlock).not.toMatch(/immutable/)
  })

  it('keeps nosniff and the CSP worker-src directive on the .mjs response', () => {
    expect(mjsBlock).toContain('X-Content-Type-Options "nosniff"')
    expect(mjsBlock).toMatch(/worker-src[^;]*'self'[^;]*blob:/)
  })
})

describe('nginx: MIME maps stay intact', () => {
  it('never uses a bare `types` block that would wipe the inherited MIME map', () => {
    for (const block of [mjsBlock, assetsBlock]) {
      if (/types\s*\{/.test(block)) {
        expect(block).toMatch(/include\s+\/etc\/nginx\/mime\.types\s*;/)
      }
    }
  })

  it('keeps gzip enabled for javascript and wasm', () => {
    expect(nginxConf).toMatch(/gzip_types[^;]*application\/javascript/)
    expect(nginxConf).toMatch(/gzip_types[^;]*application\/wasm/)
  })
})

describe('Docker: the image loads the nginx config these tests cover', () => {
  it('copies nginx.conf to the default server block inside the image', () => {
    expect(dockerfile).toMatch(/COPY\s+nginx\.conf\s+\/etc\/nginx\/conf\.d\/default\.conf/)
  })
})

describe('pdfjs worker wiring', () => {
  it('imports the worker as a .mjs module URL and assigns it to workerSrc', () => {
    expect(pdfjsSource).toMatch(
      /import\s+workerSrc\s+from\s+['"]pdfjs-dist\/build\/pdf\.worker\.min\.mjs\?url['"]/,
    )
    expect(pdfjsSource).toMatch(/GlobalWorkerOptions\.workerSrc\s*=\s*workerSrc/)
  })

  it('tears the document down through the loading task (v6 API)', () => {
    expect(pdfjsSource).toMatch(/task\.destroy\(\)/)
  })
})