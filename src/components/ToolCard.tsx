import { Link } from 'react-router'
import type { ToolDefinition } from '@/content/registry'
import { ToolIcon } from './ToolIcon'
import { Badge } from './ui'

export function ToolCard({ tool }: { tool: ToolDefinition }) {
  return (
    <Link
      to={tool.path}
      className="group flex h-full flex-col rounded-lg border border-line bg-surface p-5 transition-colors hover:border-line-strong hover:bg-surface-sunken"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-md border border-line bg-paper text-accent transition-colors group-hover:border-accent/30">
          <ToolIcon name={tool.icon} className="h-5 w-5" />
        </span>
        {tool.status !== 'implemented' ? (
          <Badge tone={tool.status === 'beta' ? 'warn' : 'neutral'}>
            {tool.status === 'beta' ? 'Beta' : 'Planned'}
          </Badge>
        ) : null}
      </div>
      <h3 className="mt-4 font-sans text-base font-semibold text-ink">{tool.name}</h3>
      <p className="mt-1.5 flex-1 text-sm text-ink-soft">{tool.tagline}</p>
      <span className="mt-4 text-sm font-medium text-accent-strong">Open tool →</span>
    </Link>
  )
}
