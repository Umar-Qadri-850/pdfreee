import { useMemo, type ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Clock, CalendarDays } from 'lucide-react'
import {
  extractHeadings,
  getPost,
  relatedPosts,
  slugForHeading,
} from '@/content/blog'
import { getTool } from '@/content/registry'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import { ToolIcon } from '@/components/ToolIcon'
import { AdSlot } from '@/components/ads/AdSlot'
import { ADSENSE } from '@/lib/ads'
import { useSeo, breadcrumbJsonLd, siteOrigin } from '@/lib/seo'
import { SITE } from '@/lib/site'
import { formatDate } from '@/lib/utils'
import { buttonClasses } from '@/components/ui'

function nodeText(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(nodeText).join('')
  if (node && typeof node === 'object' && 'props' in node) {
    return nodeText((node as { props: { children?: ReactNode } }).props.children)
  }
  return ''
}

function Heading({ level, children }: { level: 2 | 3; children?: ReactNode }) {
  const Tag = level === 2 ? 'h2' : 'h3'
  const id = slugForHeading(nodeText(children))
  return (
    <Tag id={id} className="scroll-mt-24">
      {children}
    </Tag>
  )
}

export default function BlogPost() {
  const { slug = '' } = useParams()
  const post = getPost(slug)
  const headings = useMemo(() => (post ? extractHeadings(post.content) : []), [post])

  useSeo({
    title: post ? `${post.title} | ${SITE.name}` : `Article not found | ${SITE.name}`,
    description: post?.description ?? 'This article could not be found.',
    path: `/blog/${slug}`,
    type: 'article',
    noindex: !post,
    jsonLd: post
      ? [
          breadcrumbJsonLd([
            { name: 'Home', path: '/' },
            { name: 'Blog', path: '/blog' },
            { name: post.title, path: `/blog/${slug}` },
          ]),
          {
            '@context': 'https://schema.org',
            '@type': 'Article',
            headline: post.title,
            description: post.description,
            datePublished: post.date,
            dateModified: post.updated ?? post.date,
            author: { '@type': 'Organization', name: SITE.name, url: siteOrigin() },
            publisher: {
              '@type': 'Organization',
              name: SITE.name,
              logo: { '@type': 'ImageObject', url: `${siteOrigin()}/favicon.svg` },
            },
            mainEntityOfPage: `${siteOrigin()}/blog/${slug}`,
            image: `${siteOrigin()}${SITE.defaultOgImage}`,
            keywords: post.tags.join(', '),
          },
        ]
      : undefined,
  })

  if (!post) {
    return (
      <div className="container-page py-20 text-center">
        <h1 className="text-3xl font-semibold">Article not found</h1>
        <p className="mt-3 text-ink-soft">That guide does not exist or may have been moved.</p>
        <Link to="/blog" className={`${buttonClasses('primary')} mt-6`}>
          Back to the blog
        </Link>
      </div>
    )
  }

  const related = relatedPosts(post.slug)
  const tool = post.tool ? getTool(post.tool) : undefined

  return (
    <div className="container-page py-8 sm:py-12">
      <Breadcrumbs
        items={[{ name: 'Home', path: '/' }, { name: 'Blog', path: '/blog' }, { name: post.title }]}
      />

      <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_16rem]">
        <article className="min-w-0">
          <header className="max-w-3xl">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">
              {post.category}
            </span>
            <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">{post.title}</h1>
            <p className="mt-3 text-lg text-ink-soft">{post.description}</p>
            <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-ink-muted">
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4" aria-hidden="true" /> {formatDate(post.date)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-4 w-4" aria-hidden="true" /> {post.readingTime} min read
              </span>
              <span>By the {SITE.name} team</span>
              {post.updated && post.updated !== post.date ? (
                <span>Updated {formatDate(post.updated)}</span>
              ) : null}
            </div>
          </header>

          {tool ? (
            <Link
              to={tool.path}
              className="mt-6 inline-flex items-center gap-3 rounded-lg border border-accent/25 bg-accent-soft/50 px-4 py-3 hover:bg-accent-soft"
            >
              <ToolIcon name={tool.icon} className="h-5 w-5 text-accent-strong" />
              <span className="text-sm">
                <span className="font-semibold text-ink">Open the {tool.name} tool</span>
                <span className="ml-2 text-ink-soft">{tool.tagline}</span>
              </span>
            </Link>
          ) : null}

          <div className="prose-pdfreee mt-8 max-w-3xl">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h2: ({ children }) => <Heading level={2}>{children}</Heading>,
                h3: ({ children }) => <Heading level={3}>{children}</Heading>,
                a: ({ href, children }) => {
                  const external = href?.startsWith('http')
                  if (external) {
                    return (
                      <a href={href} target="_blank" rel="noopener noreferrer">
                        {children}
                      </a>
                    )
                  }
                  return <Link to={href ?? '#'}>{children}</Link>
                },
              }}
            >
              {post.content}
            </ReactMarkdown>
          </div>

          <AdSlot slot={ADSENSE.slots.bottom} />

          {related.length > 0 ? (
            <section aria-labelledby="related" className="mt-14">
              <h2 id="related" className="text-xl font-semibold">
                Related guides
              </h2>
              <ul className="mt-4 grid gap-4 sm:grid-cols-3">
                {related.map((r) => (
                  <li key={r.slug}>
                    <Link
                      to={`/blog/${r.slug}`}
                      className="block h-full rounded-lg border border-line bg-surface p-4 hover:border-line-strong hover:bg-surface-sunken"
                    >
                      <h3 className="font-sans text-sm font-semibold leading-snug">{r.title}</h3>
                      <p className="mt-1.5 text-xs text-ink-muted">{r.readingTime} min read</p>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </article>

        {headings.length > 0 ? (
          <aside className="lg:sticky lg:top-20 lg:self-start">
            <nav aria-label="Table of contents">
              <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-ink-muted">
                On this page
              </h2>
              <ul className="mt-4 space-y-2 text-sm">
                {headings.map((h) => (
                  <li key={h.id} className={h.level === 3 ? 'pl-4' : ''}>
                    <a href={`#${h.id}`} className="text-ink-soft hover:text-accent-strong">
                      {h.text}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>
        ) : null}
      </div>
    </div>
  )
}
