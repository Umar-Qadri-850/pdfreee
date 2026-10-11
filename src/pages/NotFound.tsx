import { Link } from 'react-router'
import { useSeo } from '@/lib/seo'
import { SITE } from '@/lib/site'
import { TOOLS } from '@/content/registry'
import { buttonClasses } from '@/components/ui'
import { ToolIcon } from '@/components/ToolIcon'

export function NotFound() {
  useSeo({
    title: `Page not found (404) | ${SITE.name}`,
    description: 'The page you were looking for does not exist. Browse the Pdfreee PDF tools instead.',
    path: '/404',
    noindex: true,
  })

  return (
    <div className="container-page py-20 text-center">
      <p className="font-display text-6xl font-semibold text-accent">404</p>
      <h1 className="mt-4 text-3xl font-semibold">We couldn’t find that page</h1>
      <p className="mx-auto mt-3 max-w-md text-ink-soft">
        The link may be broken or the page may have moved. Here are some popular tools to get you
        back on track.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link to="/tools" className={buttonClasses('primary')}>
          Browse all tools
        </Link>
        <Link to="/" className={buttonClasses('secondary')}>
          Go to homepage
        </Link>
      </div>

      <ul className="mx-auto mt-12 grid max-w-3xl gap-2 text-left sm:grid-cols-2">
        {TOOLS.slice(0, 6).map((tool) => (
          <li key={tool.slug}>
            <Link
              to={tool.path}
              className="flex items-center gap-3 rounded-md border border-line bg-surface px-3 py-2.5 hover:border-line-strong hover:bg-surface-sunken"
            >
              <ToolIcon name={tool.icon} className="h-4 w-4 text-accent" />
              <span className="text-sm font-medium text-ink">{tool.name}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
