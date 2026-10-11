/**
 * Build-time SEO generator.
 *
 * Honest description of what this does: it is STATIC META PRERENDERING, not
 * server-side rendering. After Vite emits `dist/`, this script writes one real
 * `<route>/index.html` per route, each carrying that route's <title>,
 * meta description, canonical, Open Graph/Twitter tags, JSON-LD and a <noscript>
 * fallback with real content. The React app still hydrates client-side.
 *
 * Why it matters: search engines and social scrapers read the static HTML, and
 * static hosts (GitHub Pages, S3, Netlify) can serve deep links because every
 * route is a real directory with an index.html instead of relying on a rewrite.
 *
 * Usage:
 *   VITE_SITE_URL=https://example.com npm run seo:generate
 */
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { TOOLS, type ToolDefinition } from '../src/content/registry'
import { FOOTER_COLUMNS, SITE, resolveSiteUrl } from '../src/lib/site'
import { parseFrontmatter } from '../src/content/frontmatter'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const distDir = path.join(root, 'dist')
const blogDir = path.join(root, 'src', 'content', 'blog')

const origin = resolveSiteUrl(process.env.VITE_SITE_URL)
const today = new Date().toISOString().slice(0, 10)

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

interface PageSeo {
  path: string
  title: string
  description: string
  noindex?: boolean
  jsonLd?: Record<string, unknown>[]
  lastmod?: string
  /** Extra visible links for the <noscript> fallback. */
  bodyLinks?: { label: string; href: string }[]
}

interface BlogMeta {
  slug: string
  title: string
  description: string
  date: string
  updated?: string
  tool?: string
}

function absolute(p: string) {
  return `${origin}${p === '/' ? '/' : p}`
}

function breadcrumb(items: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absolute(item.path),
    })),
  }
}

function toolJsonLd(tool: ToolDefinition): Record<string, unknown>[] {
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: `${tool.name} — ${SITE.name}`,
      applicationCategory: 'UtilitiesApplication',
      operatingSystem: 'Any (web browser)',
      url: absolute(tool.path),
      description: tool.description,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      isAccessibleForFree: true,
    },
    breadcrumb([
      { name: 'Home', path: '/' },
      { name: 'Tools', path: '/tools' },
      { name: tool.name, path: tool.path },
    ]),
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: tool.faqs.map((f) => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    },
  ]
}

async function readBlogMetas(): Promise<BlogMeta[]> {
  if (!existsSync(blogDir)) return []
  const files = (await readdir(blogDir)).filter((f) => f.endsWith('.md'))
  const metas = await Promise.all(
    files.map(async (file) => {
      const raw = await readFile(path.join(blogDir, file), 'utf8')
      const { data } = parseFrontmatter(raw)
      const slug = file.replace(/\.md$/, '')
      return {
        slug,
        title: String(data.title ?? slug),
        description: String(data.description ?? ''),
        date: String(data.date ?? today),
        updated: data.updated ? String(data.updated) : undefined,
        tool: data.tool ? String(data.tool) : undefined,
      } satisfies BlogMeta
    }),
  )
  return metas.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
}

function navLinks(): { label: string; href: string }[] {
  const seen = new Set<string>()
  const out: { label: string; href: string }[] = []
  for (const col of FOOTER_COLUMNS) {
    for (const link of col.links) {
      if (seen.has(link.href)) continue
      seen.add(link.href)
      out.push(link)
    }
  }
  return out
}

function noscriptBlock(page: PageSeo): string {
  const tools = navLinks()
  const links = [...(page.bodyLinks ?? []), ...tools]
    .map((l) => `          <li><a href="${esc(l.href)}">${esc(l.label)}</a></li>`)
    .join('\n')
  return `<noscript>
      <div style="max-width:46rem;margin:3rem auto;padding:0 1.25rem;font-family:system-ui,sans-serif;color:#1b1815">
        <h1>${esc(page.title)}</h1>
        <p>${esc(page.description)}</p>
        <p>This page needs JavaScript to run the PDF tools, which all process files locally in your browser. You can still explore:</p>
        <ul>
${links}
        </ul>
      </div>
    </noscript>`
}

function renderHtml(template: string, page: PageSeo): string {
  const url = absolute(page.path)
  let html = template

  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${esc(page.title)}</title>`)
  html = html.replace(
    /<meta\s+name=["']description["'][^>]*>/i,
    `<meta name="description" content="${esc(page.description)}" />`,
  )

  const head: string[] = []
  head.push(`<meta name="robots" content="${page.noindex ? 'noindex, nofollow' : 'index, follow'}" />`)
  head.push(`<link rel="canonical" href="${url}" />`)
  head.push(`<meta property="og:type" content="website" />`)
  head.push(`<meta property="og:site_name" content="${esc(SITE.name)}" />`)
  head.push(`<meta property="og:title" content="${esc(page.title)}" />`)
  head.push(`<meta property="og:description" content="${esc(page.description)}" />`)
  head.push(`<meta property="og:url" content="${url}" />`)
  head.push(`<meta property="og:image" content="${absolute(SITE.defaultOgImage)}" />`)
  head.push(`<meta property="og:locale" content="${SITE.locale}" />`)
  head.push(`<meta name="twitter:card" content="summary_large_image" />`)
  head.push(`<meta name="twitter:title" content="${esc(page.title)}" />`)
  head.push(`<meta name="twitter:description" content="${esc(page.description)}" />`)
  head.push(`<meta name="twitter:image" content="${absolute(SITE.defaultOgImage)}" />`)
  if (SITE.twitter) head.push(`<meta name="twitter:site" content="${esc(SITE.twitter)}" />`)
  if (page.jsonLd && page.jsonLd.length > 0) {
    head.push(
      `<script type="application/ld+json">${JSON.stringify(
        page.jsonLd.length === 1 ? page.jsonLd[0] : page.jsonLd,
      )}</script>`,
    )
  }

  const headBlock = `    ${head.join('\n    ')}\n  </head>`
  html = html.replace('</head>', headBlock)
  html = html.replace(/<noscript>[\s\S]*?<\/noscript>/i, noscriptBlock(page))
  return html
}

function sitemap(pages: PageSeo[]): string {
  const entries = pages
    .filter((p) => !p.noindex)
    .map((p) => {
      const lastmod = p.lastmod ? `\n    <lastmod>${p.lastmod}</lastmod>` : ''
      return `  <url>\n    <loc>${absolute(p.path)}</loc>${lastmod}\n    <changefreq>weekly</changefreq>\n  </url>`
    })
    .join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`
}

function robots(): string {
  return [
    'User-agent: *',
    'Allow: /',
    'Disallow: /404',
    '',
    `Sitemap: ${absolute('/sitemap.xml')}`,
    '',
  ].join('\n')
}

async function main() {
  const templatePath = path.join(distDir, 'index.html')
  if (!existsSync(templatePath)) {
    throw new Error(`dist/index.html not found. Run "vite build" before "seo:generate".`)
  }
  const template = await readFile(templatePath, 'utf8')

  const pages: PageSeo[] = []

  pages.push({
    path: '/',
    title: `${SITE.name} — ${SITE.tagline.replace(/\.$/, '')}`,
    description: SITE.description,
    lastmod: today,
    bodyLinks: [{ label: 'All PDF tools', href: '/tools' }],
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: SITE.name,
        url: origin,
        description: SITE.description,
      },
      {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: SITE.name,
        url: origin,
        email: SITE.email,
      },
    ],
  })

  for (const tool of TOOLS) {
    pages.push({
      path: tool.path,
      title: `${tool.h1} — free & private | ${SITE.name}`,
      description: tool.description,
      lastmod: today,
      jsonLd: toolJsonLd(tool),
    })
  }

  const staticRoutes: PageSeo[] = [
    {
      path: '/tools',
      title: `All PDF tools — free, private, in-browser | ${SITE.name}`,
      description:
        'Browse the full Pdfreee toolkit: merge, split, compress, rotate, convert and edit PDFs, plus a PDF reader. Every tool runs in your browser.',
      lastmod: today,
    },
    {
      path: '/blog',
      title: `PDF guides and how-tos | ${SITE.name}`,
      description:
        'Practical, honest guides for working with PDF files: merging, compressing without wrecking text, extracting pages, and converting images.',
      lastmod: today,
    },
    {
      path: '/about',
      title: `About ${SITE.name}`,
      description:
        'Why Pdfreee exists: fast, free, privacy-first PDF tools that run entirely in your browser instead of uploading your documents.',
      lastmod: today,
    },
    {
      path: '/how-it-works',
      title: `How ${SITE.name} keeps your files private`,
      description:
        'A plain-language explanation of how in-browser PDF processing works and why your documents never leave your device.',
      lastmod: today,
    },
    {
      path: '/contact',
      title: `Contact ${SITE.name}`,
      description: `Get in touch with the ${SITE.name} team with questions, bug reports, or feedback about the PDF tools.`,
      lastmod: today,
    },
    {
      path: '/privacy-policy',
      title: `Privacy policy | ${SITE.name}`,
      description: `How ${SITE.name} handles data. Short version: your files are processed locally and never uploaded.`,
      lastmod: today,
    },
    {
      path: '/terms',
      title: `Terms of use | ${SITE.name}`,
      description: `The terms that govern your use of the free ${SITE.name} PDF tools.`,
      lastmod: today,
    },
    {
      path: '/cookie-policy',
      title: `Cookie policy | ${SITE.name}`,
      description: `What cookies and local storage ${SITE.name} uses, and how to control them.`,
      lastmod: today,
    },
  ]
  pages.push(...staticRoutes)

  const blogMetas = await readBlogMetas()
  for (const post of blogMetas) {
    const pathSlug = `/blog/${post.slug}`
    pages.push({
      path: pathSlug,
      title: `${post.title} | ${SITE.name}`,
      description: post.description,
      lastmod: (post.updated || post.date).slice(0, 10),
      jsonLd: [
        {
          '@context': 'https://schema.org',
          '@type': 'BlogPosting',
          headline: post.title,
          description: post.description,
          datePublished: post.date,
          dateModified: post.updated || post.date,
          mainEntityOfPage: absolute(pathSlug),
          author: { '@type': 'Organization', name: SITE.name },
          publisher: { '@type': 'Organization', name: SITE.name },
        },
        breadcrumb([
          { name: 'Home', path: '/' },
          { name: 'Blog', path: '/blog' },
          { name: post.title, path: pathSlug },
        ]),
      ],
    })
  }

  // 404 stays out of the sitemap and is marked noindex.
  const notFound: PageSeo = {
    path: '/404',
    title: `Page not found | ${SITE.name}`,
    description: 'The page you were looking for does not exist.',
    noindex: true,
  }

  let written = 0
  for (const page of pages) {
    const outPath =
      page.path === '/'
        ? path.join(distDir, 'index.html')
        : path.join(distDir, ...page.path.replace(/^\//, '').split('/'), 'index.html')
    await mkdir(path.dirname(outPath), { recursive: true })
    await writeFile(outPath, renderHtml(template, page), 'utf8')
    written++
  }

  const notFoundHtml = renderHtml(template, notFound)
  await writeFile(path.join(distDir, '404.html'), notFoundHtml, 'utf8')
  const notFoundDir = path.join(distDir, '404')
  await mkdir(notFoundDir, { recursive: true })
  await writeFile(path.join(notFoundDir, 'index.html'), notFoundHtml, 'utf8')

  await writeFile(path.join(distDir, 'sitemap.xml'), sitemap(pages), 'utf8')
  await writeFile(path.join(distDir, 'robots.txt'), robots(), 'utf8')

  console.log(
    `[seo] Wrote ${written} route pages + 404 + sitemap.xml + robots.txt (${origin})`,
  )
  console.log(`[seo] ${blogMetas.length} blog post(s), ${TOOLS.length} tool(s).`)
}

main().catch((error) => {
  console.error('[seo] Failed:', error)
  process.exit(1)
})
