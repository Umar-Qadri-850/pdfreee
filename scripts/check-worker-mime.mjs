#!/usr/bin/env node
// Live MIME smoke test for the deployed PDF.js worker.
//
//   node scripts/check-worker-mime.mjs [baseUrl]
//
// baseUrl defaults to http://localhost:8080. It fetches the worker from the
// RUNNING server and fails unless the response is a real JavaScript module.
// This is the check that would have caught the "application/octet-stream"
// regression in the actual container, which a config-only unit test cannot see.
//
// Fingerprinting notes:
//   * The worker filename is content-stable across builds (it does not embed
//     the site URL), so it is read from the local build.
//   * The app's own chunk/asset names DO change between builds because
//     VITE_SITE_URL is inlined, so they are discovered from the served HTML.
import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const base = (process.argv[2] ?? 'http://localhost:8080').replace(/\/+$/, '')
const assetsDir = join(process.cwd(), 'dist', 'assets')

let failed = false
const pass = (msg) => console.log(`  \u2713 ${msg}`)
const fail = (msg) => {
  failed = true
  console.error(`  \u2717 ${msg}`)
}

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

async function get(url) {
  try {
    return await fetch(url)
  } catch (err) {
    fail(`${url}: request failed (${err?.message ?? err}) - is the server up?`)
    return null
  }
}

async function check(url, expectType, label) {
  const res = await get(url)
  if (!res) return null
  const type = (res.headers.get('content-type') ?? '').split(';')[0].trim()
  if (res.status !== 200) fail(`${label}: HTTP ${res.status} (expected 200)`)
  else if (type !== expectType) fail(`${label}: content-type "${type}" (expected ${expectType})`)
  else pass(`${label}: 200 ${type}`)
  return res
}

console.log(`Checking ${base}`)

// 1. The PDF.js worker - the whole point of this check.
const workerUrl = `${base}/assets/${workers[0]}`
const workerRes = await check(workerUrl, 'application/javascript', workers[0])

if (workerRes) {
  const body = await workerRes.text()
  if (body.length < 1024) fail(`worker body is only ${body.length} bytes (not a real worker)`)
  else if (body.trimStart().startsWith('<')) fail('worker body looks like HTML, not JavaScript')
  else pass(`worker body is ${body.length} bytes of JavaScript`)

  const nosniff = workerRes.headers.get('x-content-type-options') ?? ''
  if (/nosniff/i.test(nosniff)) pass('x-content-type-options: nosniff')
  else fail(`x-content-type-options is "${nosniff}" (expected nosniff)`)

  const csp = workerRes.headers.get('content-security-policy') ?? ''
  if (/worker-src[^;]*'self'[^;]*blob:/.test(csp)) pass("CSP keeps worker-src 'self' blob:")
  else fail(`CSP is missing worker-src 'self' blob: (got "${csp}")`)
} else {
  // Give the rest of the checks something to do even if the worker 404'd.
  await check(`${base}/`, 'text/html', '/ (route html)')
}

// 2. Other asset types - so the .mjs fix cannot silently regress them.
const home = await get(`${base}/`)
if (home) {
  const html = await home.text()
  const cssRefs = [...new Set(html.match(/\/assets\/[^"'\s]+\.css/g) ?? [])]
  const jsRefs = [...new Set(html.match(/\/assets\/[^"'\s]+\.js/g) ?? [])]
  for (const ref of cssRefs.slice(0, 2)) await check(`${base}${ref}`, 'text/css', ref)
  for (const ref of jsRefs.slice(0, 2)) await check(`${base}${ref}`, 'application/javascript', ref)
}

// 3. Metadata / health endpoints.
await check(`${base}/sitemap.xml`, 'text/xml', '/sitemap.xml')
await check(`${base}/healthz`, 'text/plain', '/healthz')

console.log(failed ? '\nFAILED' : '\nAll live MIME checks passed')
process.exit(failed ? 1 : 0)
