import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { TOOL_CATEGORIES, TOOLS, type ToolCategoryId } from '@/content/registry'
import { filterTools } from '@/components/ToolSearch'
import { ToolCard } from '@/components/ToolCard'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import { useSeo, breadcrumbJsonLd, siteOrigin } from '@/lib/seo'
import { SITE } from '@/lib/site'

export function ToolsDirectory() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<ToolCategoryId | 'all'>('all')

  useSeo({
    title: `Free PDF tools — full list | ${SITE.name}`,
    description:
      'Every Pdfreee tool in one place: merge, split, compress, rotate, convert, reorder, watermark, number pages and extract text from PDFs. Free and processed in your browser.',
    path: '/tools',
    jsonLd: [
      breadcrumbJsonLd([
        { name: 'Home', path: '/' },
        { name: 'Tools', path: '/tools' },
      ]),
      {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: 'Pdfreee PDF tools',
        itemListElement: TOOLS.map((tool, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: tool.name,
          url: `${siteOrigin()}${tool.path}`,
        })),
      },
    ],
  })

  const filtered = useMemo(() => {
    const byCategory = category === 'all' ? TOOLS : TOOLS.filter((t) => t.category === category)
    return filterTools(query, byCategory)
  }, [query, category])

  return (
    <div className="container-page py-8 sm:py-12">
      <Breadcrumbs items={[{ name: 'Home', path: '/' }, { name: 'Tools' }]} />

      <header className="max-w-2xl">
        <h1 className="text-3xl font-semibold sm:text-4xl">All PDF tools</h1>
        <p className="mt-3 text-lg text-ink-soft">
          {TOOLS.length} working tools for everyday PDF tasks. Everything runs in your browser — no
          uploads and no account required.
        </p>
      </header>

      <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tools…"
            aria-label="Search tools"
            className="h-11 w-full rounded-md border border-line-strong bg-surface pl-9 pr-3 text-sm outline-none focus:border-accent"
          />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setCategory('all')}
          className={`rounded-full border px-3 py-1.5 text-sm ${
            category === 'all'
              ? 'border-accent bg-accent-soft text-accent-strong'
              : 'border-line bg-surface text-ink-soft hover:border-line-strong'
          }`}
        >
          All
        </button>
        {TOOL_CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setCategory(c.id)}
            className={`rounded-full border px-3 py-1.5 text-sm ${
              category === c.id
                ? 'border-accent bg-accent-soft text-accent-strong'
                : 'border-line bg-surface text-ink-soft hover:border-line-strong'
            }`}
          >
            {c.name}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="mt-12 rounded-lg border border-dashed border-line-strong bg-surface p-8 text-center text-ink-soft">
          No tools match “{query}”. Try a different term, or browse all categories.
        </p>
      ) : category === 'all' && !query ? (
        <div className="mt-12 space-y-14">
          {TOOL_CATEGORIES.map((c) => {
            const tools = TOOLS.filter((t) => t.category === c.id)
            if (tools.length === 0) return null
            return (
              <section key={c.id} aria-labelledby={`cat-${c.id}`}>
                <h2 id={`cat-${c.id}`} className="text-2xl font-semibold">
                  {c.name}
                </h2>
                <p className="mt-2 max-w-2xl text-ink-soft">{c.description}</p>
                <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {tools.map((tool) => (
                    <li key={tool.slug}>
                      <ToolCard tool={tool} />
                    </li>
                  ))}
                </ul>
              </section>
            )
          })}
        </div>
      ) : (
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((tool) => (
            <li key={tool.slug}>
              <ToolCard tool={tool} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default ToolsDirectory
