import { Link } from 'react-router'
import { ChevronRight } from 'lucide-react'

export interface Crumb {
  name: string
  path?: string
}

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-4">
      <ol className="flex flex-wrap items-center gap-1 text-sm text-ink-muted">
        {items.map((item, i) => {
          const last = i === items.length - 1
          return (
            <li key={`${item.name}-${i}`} className="flex items-center gap-1">
              {item.path && !last ? (
                <Link to={item.path} className="hover:text-accent-strong">
                  {item.name}
                </Link>
              ) : (
                <span aria-current={last ? 'page' : undefined} className="text-ink-soft">
                  {item.name}
                </span>
              )}
              {!last ? <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" /> : null}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
