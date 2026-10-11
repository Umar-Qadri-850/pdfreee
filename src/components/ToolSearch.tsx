import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { Search, X } from 'lucide-react'
import { TOOLS, type ToolDefinition } from '@/content/registry'
import { ToolIcon } from './ToolIcon'
import { cn } from '@/lib/utils'

export function filterTools(query: string, tools: ToolDefinition[] = TOOLS): ToolDefinition[] {
  const q = query.trim().toLowerCase()
  if (!q) return tools
  const terms = q.split(/\s+/)
  return tools.filter((tool) => {
    const haystack = [tool.name, tool.tagline, tool.description, ...tool.keywords].join(' ').toLowerCase()
    return terms.every((term) => haystack.includes(term))
  })
}

export function ToolSearchDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  const results = useMemo(() => filterTools(query).slice(0, 8), [query])

  useEffect(() => {
    if (open) {
      setQuery('')
      setActive(0)
      const t = setTimeout(() => inputRef.current?.focus(), 20)
      return () => clearTimeout(t)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const go = (tool: ToolDefinition) => {
    navigate(tool.path)
    onClose()
  }

  const onInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((a) => Math.min(a + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => Math.max(a - 1, 0))
    } else if (e.key === 'Enter' && results[active]) {
      e.preventDefault()
      go(results[active])
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-ink/30 p-4 pt-[12vh]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search PDF tools"
        className="w-full max-w-xl overflow-hidden rounded-xl border border-line bg-surface shadow-lg"
      >
        <div className="flex items-center gap-3 border-b border-line px-4">
          <Search className="h-4 w-4 shrink-0 text-ink-muted" aria-hidden="true" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setActive(0)
            }}
            onKeyDown={onInputKeyDown}
            placeholder="Search tools — try “merge”, “compress”, “watermark”…"
            aria-label="Search tools"
            className="h-14 w-full bg-transparent text-base outline-none placeholder:text-ink-muted"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close search"
            className="rounded-md p-1.5 text-ink-muted hover:bg-surface-sunken hover:text-ink"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[52vh] overflow-y-auto p-2">
          {results.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-ink-muted">
              No tools match “{query}”. Try a different word.
            </p>
          ) : (
            <ul role="listbox" aria-label="Tool results" className="space-y-0.5">
              {results.map((tool, i) => (
                <li key={tool.slug}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={i === active}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => go(tool)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left',
                      i === active ? 'bg-surface-sunken' : 'hover:bg-surface-sunken',
                    )}
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-line bg-paper text-accent">
                      <ToolIcon name={tool.icon} className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-ink">{tool.name}</span>
                      <span className="block truncate text-xs text-ink-muted">{tool.tagline}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="flex items-center justify-between border-t border-line px-4 py-2 text-xs text-ink-muted">
          <span>Arrow keys to navigate · Enter to open</span>
          <span>
            Press <kbd className="rounded border border-line px-1">Esc</kbd> to close
          </span>
        </div>
      </div>
    </div>
  )
}
