import { Link } from 'react-router'
import type { ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'
import type { ToolDefinition } from '@/content/registry'
import { TOOL_CATEGORIES, getTool } from '@/content/registry'
import { useSeo, breadcrumbJsonLd, siteOrigin } from '@/lib/seo'
import { SITE } from '@/lib/site'
import { Breadcrumbs } from '../layout/Breadcrumbs'
import { ToolIcon } from '../ToolIcon'
import { AdSlot } from '../ads/AdSlot'
import { ADSENSE } from '@/lib/ads'

export function ToolShell({ tool, children }: { tool: ToolDefinition; children: ReactNode }) {
  const category = TOOL_CATEGORIES.find((c) => c.id === tool.category)
  const origin = siteOrigin()

  const jsonLd = [
    breadcrumbJsonLd([
      { name: 'Home', path: '/' },
      { name: 'Tools', path: '/tools' },
      { name: tool.name, path: tool.path },
    ]),
    {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: `${tool.name} — ${SITE.name}`,
      url: `${origin}${tool.path}`,
      applicationCategory: 'UtilitiesApplication',
      operatingSystem: 'Web',
      description: tool.description,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    },
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

  useSeo({
    title: `${tool.h1} — free & private | ${SITE.name}`,
    description: tool.description,
    path: tool.path,
    jsonLd,
  })

  const related = tool.related.map(getTool).filter((t): t is ToolDefinition => Boolean(t))

  return (
    <div className="container-page py-8 sm:py-10">
      <Breadcrumbs
        items={[{ name: 'Home', path: '/' }, { name: 'Tools', path: '/tools' }, { name: tool.name }]}
      />

      <header className="max-w-3xl">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-md border border-line bg-surface text-accent">
            <ToolIcon name={tool.icon} className="h-4.5 w-4.5" />
          </span>
          {category ? (
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">
              {category.name}
            </span>
          ) : null}
        </div>
        <h1 className="mt-4 text-3xl font-semibold sm:text-4xl">{tool.h1}</h1>
        <p className="mt-3 text-lg text-ink-soft">{tool.tagline}</p>
      </header>

      <section aria-label={`${tool.name} tool`} className="mt-8">
        {children}
      </section>

      <AdSlot slot={ADSENSE.slots.bottom} />

      <div className="mt-14 grid gap-12 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="space-y-12">
          <section aria-labelledby="how-to">
            <h2 id="how-to" className="text-xl font-semibold">
              How to {tool.name.toLowerCase()}
            </h2>
            <ol className="mt-4 space-y-3">
              {tool.howTo.map((step, i) => (
                <li key={step} className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-accent-strong">
                    {i + 1}
                  </span>
                  <span className="text-ink-soft">{step}</span>
                </li>
              ))}
            </ol>
          </section>

          <section aria-labelledby="limitations">
            <h2 id="limitations" className="text-xl font-semibold">
              Limitations to know about
            </h2>
            <ul className="mt-4 space-y-2">
              {tool.limitations.map((limit) => (
                <li key={limit} className="flex gap-2.5 text-ink-soft">
                  <AlertTriangle className="mt-1 h-4 w-4 shrink-0 text-warn" aria-hidden="true" />
                  <span>{limit}</span>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="faq">
            <h2 id="faq" className="text-xl font-semibold">
              Frequently asked questions
            </h2>
            <div className="mt-4 divide-y divide-line rounded-lg border border-line bg-surface">
              {tool.faqs.map((faq) => (
                <details key={faq.q} className="group px-4 py-3">
                  <summary className="cursor-pointer list-none font-medium text-ink marker:hidden">
                    <span className="flex items-center justify-between gap-4">
                      {faq.q}
                      <span className="text-ink-muted transition-transform group-open:rotate-45">+</span>
                    </span>
                  </summary>
                  <p className="mt-2 text-sm text-ink-soft">{faq.a}</p>
                </details>
              ))}
            </div>
          </section>

          <section aria-labelledby="privacy" className="rounded-lg border border-line bg-surface-sunken/50 p-5">
            <h2 id="privacy" className="text-lg font-semibold">
              Your files stay on your device
            </h2>
            <p className="mt-2 text-sm text-ink-soft">
              This tool runs entirely in your browser using JavaScript. The document you select is
              read locally and the result is created locally — nothing is uploaded to {SITE.name} or
              any third party. Closing the tab clears everything from memory. See our{' '}
              <Link to="/privacy-policy" className="text-accent-strong underline">
                privacy policy
              </Link>{' '}
              for the full detail.
            </p>
          </section>
        </div>

        <aside className="lg:sticky lg:top-20 lg:self-start">
          <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-ink-muted">
            Related tools
          </h2>
          <ul className="mt-4 space-y-2">
            {related.map((r) => (
              <li key={r.slug}>
                <Link
                  to={r.path}
                  className="flex items-center gap-3 rounded-md border border-line bg-surface px-3 py-2.5 hover:border-line-strong hover:bg-surface-sunken"
                >
                  <ToolIcon name={r.icon} className="h-4 w-4 text-accent" />
                  <span>
                    <span className="block text-sm font-medium text-ink">{r.name}</span>
                    <span className="block text-xs text-ink-muted">{r.tagline}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </div>
  )
}
