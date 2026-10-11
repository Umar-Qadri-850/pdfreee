#!/usr/bin/env node
// Live deployment cache/MIME check for the running Pdfreee server.
//
//   node scripts/check-deployment.mjs [baseUrl]
//
// baseUrl defaults to http://localhost:8080. This is the check that would have
// caught both production bugs: the .mjs worker served as octet-stream, and an
// `immutable`/1-year cache on HTML entry points and the (hash-stable) worker,
// which pinned browsers to stale response metadata across deployments.
//
// It verifies against the RUNNING server:
//   1. HTML entry points (/, a route) -> no-cache, must-revalidate (NOT immutable)
//   2. The PDF.js .mjs worker -> application/javascript AND no-cache,
//      must-revalidate (so a content-hash-stable URL never keeps stale headers)
//   3. The built bundles reference the exact worker filename being served
//   4. The worker honours conditional requests (ETag -> 304)
//   5. Hashed js/css stay immutable; xml/plain keep their MIME types
//   6. nosniff and the CSP worker-src blob: policy remain intact
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const base = (process.argv[2] ?? 'http://localhost:8080').replace(/\/+$/, '')
const assetsDir = join(process.cwd(), 'dist', 'assets')

let failed = false
const pass = (msg) => console.log(`  \u2713 ${msg}`)
const fail = (msg) => {
  failed = true
  console.error(`  \u2717 ${msg}`)
}

async function get(url) {
  try {
    return await fetch(url)
  } catch (err) {
    fail(`${url}: request failed (${err?.message ?? err}) - is the server up?`)
    return null
  }
}

function cacheHeaders(res) {
  return (res.headers.get('cache-control') ?? '').toLowerCase()
}

async function expectNoCache(url, label) {
  const res = await get(url)
  if (!res) return
  const cc = cacheHeaders(res)
  if (!cc.includes('no-cache')) fail(`${label}: Cache-Control missing no-cache ("${cc}")`)
  else if (!cc.includes('must-revalidate')) fail(`${label}: Cache-Control missing must-revalidate ("${cc}")`)
  else if (cc.includes('immutable')) fail(`${label}: Cache-Control must not be immutable ("${cc}")`)
  else pass(`${label}: no-cache, must-revalidate (${res.status})`)
}

console.log(`Checking ${base}`)

// 1. HTML entry points must revalidate so the latest build is discovered.
await expectNoCache(`${base}/`, '/ (index.html)')
await expectNoCache(`${base}/merge-pdf`, '/merge-pdf (SPA route)')
await expectNoCache(`${base}/sitemap.xml`, '/sitemap.xml')

// 2. The PDF.js worker: correct MIME + revalidate (not immutable).
if (!existsSync(assetsDir)) {
  console.error(`dist/assets not found at ${assetsDir}. Run \`npm run build\` first.`)
  process.exit(2)
}
const workers = readdirSync(assetsDir).filter((f) => /^pdf\.worker.*\.mjs$/.test(f))
if (workers.length !== 1) {
  console.error(
    `expected exactly one pdf.worker*.mjs in dist/assets, found ${workers.length}: ${workers.join(', ')}`,
  )
  process.exit(2)
}
const workerName = workers[0]
const workerUrl = `${base}/assets/${workerName}`
console.log(`Worker: ${workerUrl}`)

const workerRes = await get(workerUrl)
if (workerRes) {
  const type = (workerRes.headers.get('content-type') ?? '').split(';')[0].trim()
  const cc = cacheHeaders(workerRes)

  if (type === 'application/javascript' || type === 'text/javascript') pass('content-type application/javascript')
  else fail(`content-type "${type}" (expected application/javascript)`)

  if (cc.includes('no-cache') && cc.includes('must-revalidate') && !cc.includes('immutable') && !cc.includes('max-age=')) {
    pass(`revalidates: ${workerRes.headers.get('cache-control')}`)
  } else {
    fail(`Cache-Control "${workerRes.headers.get('cache-control')}" (expected no-cache, must-revalidate, no long max-age/immutable)`)
  }

  const body = await workerRes.text()
  if (body.length < 1024) fail(`worker body is only ${body.length} bytes (not a real worker)`)
  else if (body.trimStart().startsWith('<')) fail('worker body looks like HTML, not JavaScript')
  else pass(`worker body is ${body.length} bytes of JavaScript`)

  if (/nosniff/i.test(workerRes.headers.get('x-content-type-options') ?? '')) pass('X-Content-Type-Options: nosniff')
  else fail('X-Content-Type-Options is missing nosniff')

  const csp = workerRes.headers.get('content-security-policy') ?? ''
  if (/worker-src[^;]*'self'[^;]*blob:/.test(csp)) pass("CSP keeps worker-src 'self' blob:")
  else fail(`CSP is missing worker-src 'self' blob: (got "${csp}")`)

  // 4. Conditional revalidation must work (ETag -> 304).
  const etag = workerRes.headers.get('etag')
  if (etag) {
    const reval = await fetch(workerUrl, { headers: { 'If-None-Match': etag } })
    if (reval.status === 304) pass(`ETag revalidation returns 304 (${etag})`)
    else fail(`conditional GET returned ${reval.status} (expected 304)`)
  } else {
    fail('worker response has no ETag (revalidation unavailable)')
  }
}

// 3. The built bundles must reference the exact worker filename being served.
const chunkFiles = existsSync(assetsDir) ? readdirSync(assetsDir).filter((f) => f.endsWith('.js')) : []
const referencing = chunkFiles.filter((f) => readFileSync(join(assetsDir, f), 'utf8').includes(workerName))
if (referencing.length > 0) {
  pass(`built bundle(s) reference the served worker: ${referencing[0]}${referencing.length > 1 ? ` (+${referencing.length - 1} more)` : ''}`)
} else {
  fail(`no built JS bundle under dist/assets references "${workerName}"`)
}

// 5. Other asset types / cache policies from the served index.html.
const home = await get(`${base}/`)
if (home) {
  const html = await home.text()
  const cssRefs = [...new Set(html.match(/\/assets\/[^"'\s]+\.css/g) ?? [])]
  const jsRefs = [...new Set(html.match(/\/assets\/[^"'\s]+\.js/g) ?? [])]
  for (const ref of cssRefs.slice(0, 2)) {
    const res = await get(`${base}${ref}`)
    if (!res) continue
    const type = (res.headers.get('content-type') ?? '').split(';')[0].trim()
    const cc = cacheHeaders(res)
    if (type === 'text/css' && cc.includes('immutable')) pass(`${ref}: text/css, immutable`)
    else fail(`${ref}: type="${type}", cache="${res.headers.get('cache-control')}" (expected text/css immutable)`)
  }
  for (const ref of jsRefs.slice(0, 2)) {
    if (ref.endsWith('.mjs')) continue
    const res = await get(`${base}${ref}`)
    if (!res) continue
    const type = (res.headers.get('content-type') ?? '').split(';')[0].trim()
    const cc = cacheHeaders(res)
    if (type === 'application/javascript' && cc.includes('immutable')) pass(`${ref}: application/javascript, immutable`)
    else fail(`${ref}: type="${type}", cache="${res.headers.get('cache-control')}" (expected application/javascript immutable)`)
  }
}

const health = await get(`${base}/healthz`)
if (health && (health.headers.get('content-type') ?? '').startsWith('text/plain') && (await health.text()) === 'ok') {
  pass('/healthz: text/plain, ok')
} else {
  fail('/healthz: unexpected response')
}

console.log(failed ? '\nFAILED' : '\nAll deployment checks passed')
process.exit(failed ? 1 : 0)