import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { Search } from 'lucide-react'
import { FAQ_CATEGORIES, SITE_FAQS } from '@/content/faq'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import { buttonClasses } from '@/components/ui'
import { useSeo, breadcrumbJsonLd, siteOrigin } from '@/lib/seo'
import { SITE } from '@/lib/site'

export function Faq() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<string>('all')

  useSeo({
    title: `Frequently asked questions | ${SITE.name}`,
    description:
      'Straight answers about the Pdfreee PDF tools: what is free, how your files stay private, file size limits, compression results, and which conversions are not supported yet.',
    path: '/faq',
    jsonLd: [
      breadcrumbJsonLd([
        { name: 'Home', path: '/' },
        { name: 'FAQ', path: '/faq' },
      ]),
      {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        url: `${siteOrigin()}/faq`,
        mainEntity: SITE_FAQS.map((faq) => ({
          '@type': 'Question',
          name: faq.q,
          acceptedAnswer: { '@type': 'Answer', text: faq.a },
        })),
      },
    ],
  })

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return SITE_FAQS.filter((faq) => {
      const inCategory = category === 'all' || faq.category === category
      const matches = !q || `${faq.q} ${faq.a}`.toLowerCase().includes(q)
      return inCategory && matches
    })
  }, [query, category])

  return (
    <div className="container-page py-8 sm:py-12">
      <Breadcrumbs items={[{ name: 'Home', path: '/' }, { name: 'FAQ' }]} />

      <header className="max-w-2xl">
        <h1 className="text-3xl font-semibold sm:text-4xl">Frequently asked questions</h1>
        <p className="mt-3 text-lg text-ink-soft">
          Honest answers about privacy, limits, and what each tool can and cannot do. Missing
          something? <Link to="/contact" className="text-accent-strong underline">Contact us</Link>.
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
            placeholder="Search the FAQs…"
            aria-label="Search frequently asked questions"
            className="h-11 w-full rounded-md border border-line-strong bg-surface pl-9 pr-3 text-sm outline-none focus:border-accent"
          />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {['all', ...FAQ_CATEGORIES].map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(c)}
            aria-pressed={category === c}
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
          No questions match that search. Try a different word or{' '}
          <Link to="/contact" className="text-accent-strong underline">
            ask us directly
          </Link>
          .
        </p>
      ) : (
        <div className="mt-10 max-w-3xl divide-y divide-line rounded-lg border border-line bg-surface">
          {filtered.map((faq) => (
            <details key={faq.q} className="group px-5 py-4">
              <summary className="cursor-pointer list-none font-medium text-ink marker:hidden">
                <span className="flex items-start justify-between gap-4">
                  <span>{faq.q}</span>
                  <span className="mt-0.5 shrink-0 text-ink-muted transition-transform group-open:rotate-45">
                    +
                  </span>
                </span>
              </summary>
              <p className="mt-2 text-sm text-ink-soft">{faq.a}</p>
            </details>
          ))}
        </div>
      )}

      <section className="mt-14 max-w-3xl rounded-lg border border-line bg-surface-sunken/50 p-6">
        <h2 className="text-lg font-semibold">Ready to try a tool?</h2>
        <p className="mt-2 text-sm text-ink-soft">
          Every tool runs locally in your browser — no upload, no account.
        </p>
        <Link to="/tools" className={`${buttonClasses('primary')} mt-4`}>
          Browse all PDF tools
        </Link>
      </section>
    </div>
  )
}

export default Faq
