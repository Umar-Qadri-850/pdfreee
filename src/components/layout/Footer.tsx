import { Link } from 'react-router'
import { FOOTER_COLUMNS, SITE } from '@/lib/site'
import { Logo } from '../Logo'

export function Footer() {
  const year = new Date().getFullYear()
  return (
    <footer className="mt-24 border-t border-line bg-surface">
      <div className="container-page py-12">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 sm:gap-10 lg:grid-cols-[1.4fr_repeat(5,minmax(0,1fr))]">
          <div className="col-span-1 min-w-0 sm:col-span-2 lg:col-span-1">
            <Logo />
            <p className="mt-3 text-sm text-ink-soft break-words">
              Free, privacy-conscious PDF tools that run in your browser. No uploads, no account
              required for the core toolkit.
            </p>
            <p className="mt-3 text-xs text-ink-muted break-words">
              <a href={`mailto:${SITE.email}`} className="underline hover:text-ink">
                {SITE.email}
              </a>
            </p>
          </div>

          {FOOTER_COLUMNS.map((column) => (
            <nav
              key={column.heading}
              aria-label={column.heading}
              className="col-span-1 min-w-0 break-words"
            >
              <h2 className="font-sans text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">
                {column.heading}
              </h2>
              <ul className="mt-3 space-y-2">
                {column.links.map((link) => (
                  <li key={link.href} className="break-words">
                    <Link to={link.href} className="text-sm text-ink-soft hover:text-accent-strong">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-line pt-6 text-xs text-ink-muted sm:flex-row sm:items-center sm:justify-between">
          <p className="break-words">
            © {year} {SITE.name}. Built to be useful, not to farm your documents.
          </p>
          <p className="break-words">
            Files are processed locally in your browser. See our{' '}
            <Link to="/privacy-policy" className="underline hover:text-ink">
              privacy policy
            </Link>
            .
          </p>
        </div>
      </div>
    </footer>
  )
}
