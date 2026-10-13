import type { ReactNode } from 'react'
import { useSeo, breadcrumbJsonLd } from '@/lib/seo'
import { SITE } from '@/lib/site'
import { Breadcrumbs, type Crumb } from './Breadcrumbs'

interface ContentPageProps {
  title: string
  description: string
  path: string
  h1?: string
  children: ReactNode
  wide?: boolean
  intro?: ReactNode
  /** ISO date (yyyy-mm-dd) rendered as a "Last updated" line. */
  updated?: string
}

export function ContentPage({ title, description, path, h1, children, wide, intro, updated }: ContentPageProps) {
  const crumbs: Crumb[] = [
    { name: 'Home', path: '/' },
    { name: h1 ?? title },
  ]
  useSeo({
    title: `${title} | ${SITE.name}`,
    description,
    path,
    jsonLd: breadcrumbJsonLd([
      { name: 'Home', path: '/' },
      { name: h1 ?? title, path },
    ]),
  })

  return (
    <div className="container-page py-8 sm:py-12">
      <Breadcrumbs items={crumbs} />
      <article className={wide ? '' : 'max-w-3xl'}>
        <h1 className="text-3xl font-semibold sm:text-4xl">{h1 ?? title}</h1>
        {intro ? <div className="mt-4 text-lg text-ink-soft">{intro}</div> : null}
        {updated ? (
          <p className="mt-3 text-xs text-ink-muted">
            Last updated <time dateTime={updated}>{updated}</time>
          </p>
        ) : null}
        <div className="prose-pdfreee mt-8">{children}</div>
      </article>
    </div>
  )
}
