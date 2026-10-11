import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { Search } from 'lucide-react'
import { POSTS, POST_CATEGORIES } from '@/content/blog'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import { useSeo, breadcrumbJsonLd, siteOrigin } from '@/lib/seo'
import { SITE } from '@/lib/site'
import { formatDate } from '@/lib/utils'

export function BlogIndex() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<string>('all')

  useSeo({
    title: `Blog — practical guides for working with PDFs | ${SITE.name}`,
    description:
      'Practical, honest guides for merging, compressing, splitting, and converting PDF files, including the limitations that generic how-tos leave out.',
    path: '/blog',
    jsonLd: [
      breadcrumbJsonLd([
        { name: 'Home', path: '/' },
        { name: 'Blog', path: '/blog' },
      ]),
      {
        '@context': 'https://schema.org',
        '@type': 'Blog',
        name: `${SITE.name} blog`,
        url: `${siteOrigin()}/blog`,
        blogPost: POSTS.map((p) => ({
          '@type': 'BlogPosting',
          headline: p.title,
          url: `${siteOrigin()}/blog/${p.slug}`,
          datePublished: p.date,
        })),
      },
    ],
  })

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return POSTS.filter((post) => {
      const inCategory = category === 'all' || post.category === category
      const matches =
        !q ||
        [post.title, post.description, ...post.tags].join(' ').toLowerCase().includes(q)
      return inCategory && matches
    })
  }, [query, category])

  return (
    <div className="container-page py-8 sm:py-12">
      <Breadcrumbs items={[{ name: 'Home', path: '/' }, { name: 'Blog' }]} />
      <header className="max-w-2xl">
        <h1 className="text-3xl font-semibold sm:text-4xl">The Pdfreee blog</h1>
        <p className="mt-3 text-lg text-ink-soft">
          Short, practical guides for working with PDFs — what works, what does not, and the
          trade-offs nobody mentions.
        </p>
      </header>

      <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search articles…"
            aria-label="Search articles"
            className="h-11 w-full rounded-md border border-line-strong bg-surface pl-9 pr-3 text-sm outline-none focus:border-accent"
          />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {['all', ...POST_CATEGORIES].map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(c)}
            className={`rounded-full border px-3 py-1.5 text-sm ${
              category === c
                ? 'border-accent bg-accent-soft text-accent-strong'
                : 'border-line bg-surface text-ink-soft hover:border-line-strong'
            }`}
          >
            {c === 'all' ? 'All' : c}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="mt-12 rounded-lg border border-dashed border-line-strong bg-surface p-8 text-center text-ink-soft">
          No articles found. Try a different search or category.
        </p>
      ) : (
        <ul className="mt-10 grid gap-5 sm:grid-cols-2">
          {filtered.map((post) => (
            <li key={post.slug}>
              <article className="flex h-full flex-col rounded-lg border border-line bg-surface p-6 hover:border-line-strong hover:bg-surface-sunken">
                <span className="text-xs font-medium uppercase tracking-wide text-accent">
                  {post.category}
                </span>
                <h2 className="mt-2 font-display text-xl font-semibold leading-snug">
                  <Link to={`/blog/${post.slug}`} className="hover:text-accent-strong">
                    {post.title}
                  </Link>
                </h2>
                <p className="mt-2 flex-1 text-sm text-ink-soft">{post.description}</p>
                <p className="mt-4 text-xs text-ink-muted">
                  {formatDate(post.date)} · {post.readingTime} min read
                </p>
              </article>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default BlogIndex
