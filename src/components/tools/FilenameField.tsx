import { Field } from '@/components/ui'
import { cn } from '@/lib/utils'

/**
 * A small, accessible control that lets the user choose the output file name.
 * The extension is shown as a fixed suffix so people cannot accidentally drop
 * it; the value is sanitised when the download name is built.
 */
export function FilenameField({
  base,
  extension,
  onChange,
  id = 'output-name',
  label = 'Output file name',
  hint,
  className,
}: {
  base: string
  extension: string
  onChange: (value: string) => void
  id?: string
  label?: string
  hint?: string
  className?: string
}) {
  const ext = extension.replace(/^\./, '')
  return (
    <Field
      label={label}
      htmlFor={id}
      hint={hint ?? `The extension .${ext} is added automatically.`}
    >
      <div className={cn('flex items-stretch', className)}>
        <input
          id={id}
          type="text"
          value={base}
          onChange={(e) => onChange(e.target.value)}
          onBlur={(e) => {
            if (!e.target.value.trim()) onChange('document')
          }}
          spellCheck={false}
          autoComplete="off"
          placeholder="document"
          className="h-10 w-full rounded-l-md border border-r-0 border-line-strong bg-paper px-3 text-sm outline-none focus:border-accent"
        />
        <span className="inline-flex select-none items-center rounded-r-md border border-line-strong bg-surface-sunken px-3 text-sm text-ink-muted">
          .{ext}
        </span>
      </div>
    </Field>
  )
}
