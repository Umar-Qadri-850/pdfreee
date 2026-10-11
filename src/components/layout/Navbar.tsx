import { useEffect, useState } from 'react'
import { Link, NavLink } from 'react-router'
import { Menu, Search, X } from 'lucide-react'
import { PRIMARY_NAV } from '@/lib/site'
import { Logo } from '../Logo'
import { ToolSearchDialog } from '../ToolSearch'
import { buttonClasses } from '../ui'
import { cn } from '@/lib/utils'

export function Navbar() {
  const [searchOpen, setSearchOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/85 backdrop-blur-md">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:z-50 focus:rounded-md focus:bg-surface focus:px-3 focus:py-2 focus:text-sm"
      >
        Skip to content
      </a>
      <div className="container-page flex h-16 items-center gap-4">
        <Link to="/" className="shrink-0" aria-label="Pdfreee home">
          <Logo />
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
          {PRIMARY_NAV.map((link) => (
            <NavLink
              key={link.href}
              to={link.href}
              className={({ isActive }) =>
                cn(
                  'rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive ? 'text-ink' : 'text-ink-soft hover:bg-surface-sunken hover:text-ink',
                )
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className={cn(buttonClasses('secondary', 'sm'), 'pr-2')}
            aria-label="Search tools"
          >
            <Search className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Search</span>
            <kbd className="ml-1 hidden rounded border border-line px-1.5 text-[11px] text-ink-muted lg:inline">
              ⌘K
            </kbd>
          </button>
          <Link to="/tools" className={cn(buttonClasses('primary', 'sm'), 'hidden sm:inline-flex')}>
            All tools
          </Link>
          <button
            type="button"
            className="rounded-md p-2 text-ink-soft hover:bg-surface-sunken md:hidden"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((o) => !o)}
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {menuOpen ? (
        <nav aria-label="Mobile" className="border-t border-line bg-surface md:hidden">
          <ul className="container-page flex flex-col py-2">
            {PRIMARY_NAV.map((link) => (
              <li key={link.href}>
                <NavLink
                  to={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="block rounded-md px-2 py-2.5 text-sm font-medium text-ink-soft hover:bg-surface-sunken hover:text-ink"
                >
                  {link.label}
                </NavLink>
              </li>
            ))}
            <li>
              <Link
                to="/tools"
                onClick={() => setMenuOpen(false)}
                className="block rounded-md px-2 py-2.5 text-sm font-medium text-accent-strong hover:bg-surface-sunken"
              >
                All tools
              </Link>
            </li>
          </ul>
        </nav>
      ) : null}

      <ToolSearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
    </header>
  )
}
