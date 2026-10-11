import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

type Variant = 'primary' | 'secondary' | 'ghost' | 'subtle' | 'danger'
type Size = 'sm' | 'md' | 'lg'

const variants: Record<Variant, string> = {
  primary:
    'bg-accent text-white hover:bg-accent-strong shadow-xs border border-transparent disabled:opacity-50',
  secondary:
    'bg-surface text-ink border border-line-strong hover:border-ink-muted hover:bg-surface-sunken disabled:opacity-50',
  ghost: 'bg-transparent text-ink-soft hover:bg-surface-sunken hover:text-ink disabled:opacity-50',
  subtle: 'bg-surface-sunken text-ink border border-transparent hover:bg-line disabled:opacity-50',
  danger: 'bg-transparent text-accent-strong border border-accent/40 hover:bg-accent-soft',
}

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-sm gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-6 text-base gap-2',
}

export function buttonClasses(variant: Variant = 'primary', size: Size = 'md', className?: string): string {
  return cn(
    'inline-flex items-center justify-center rounded-md font-medium transition-colors',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
    'disabled:cursor-not-allowed select-none whitespace-nowrap',
    variants[variant],
    sizes[size],
    className,
  )
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
}

export function Button({ variant = 'primary', size = 'md', className, ...rest }: ButtonProps) {
  return <button className={buttonClasses(variant, size, className)} {...rest} />
}

export function Card({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('rounded-lg border border-line bg-surface shadow-xs', className)}
      {...rest}
    >
      {children}
    </div>
  )
}

export function Badge({
  children,
  tone = 'neutral',
  className,
}: {
  children: ReactNode
  tone?: 'neutral' | 'accent' | 'success' | 'warn'
  className?: string
}) {
  const tones = {
    neutral: 'bg-surface-sunken text-ink-soft border-line',
    accent: 'bg-accent-soft text-accent-strong border-accent/20',
    success: 'bg-success-soft text-success border-success/20',
    warn: 'bg-warn-soft text-warn border-warn/20',
  } as const
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

export function Alert({
  tone = 'info',
  title,
  children,
  className,
}: {
  tone?: 'info' | 'success' | 'warn' | 'error'
  title?: string
  children: ReactNode
  className?: string
}) {
  const tones = {
    info: 'border-line bg-surface-sunken text-ink-soft',
    success: 'border-success/25 bg-success-soft text-success',
    warn: 'border-warn/25 bg-warn-soft text-warn',
    error: 'border-accent/30 bg-accent-soft text-accent-strong',
  } as const
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={cn('rounded-md border px-3.5 py-2.5 text-sm', tones[tone], className)}>
      {title ? <p className="font-semibold">{title}</p> : null}
      <div className={cn(title && 'mt-0.5')}>{children}</div>
    </div>
  )
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn(
        'inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent',
        className,
      )}
    />
  )
}

export function ProgressBar({ value, label }: { value: number; label?: string }) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)))
  return (
    <div>
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-surface-sunken"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={clamped}
        aria-label={label ?? 'Progress'}
      >
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-300 ease-out"
          style={{ width: `${clamped}%` }}
        />
      </div>
      {label ? <p className="mt-1.5 text-xs text-ink-muted">{label}</p> : null}
    </div>
  )
}

export function Field({
  label,
  hint,
  htmlFor,
  children,
}: {
  label: string
  hint?: string
  htmlFor?: string
  children: ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-ink">
        {label}
      </label>
      {children}
      {hint ? <p className="text-xs text-ink-muted">{hint}</p> : null}
    </div>
  )
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'left',
}: {
  eyebrow?: string
  title: string
  description?: string
  align?: 'left' | 'center'
}) {
  return (
    <div className={cn('max-w-2xl', align === 'center' && 'mx-auto text-center')}>
      {eyebrow ? (
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">{eyebrow}</p>
      ) : null}
      <h2 className="mt-2 text-2xl font-semibold sm:text-3xl">{title}</h2>
      {description ? <p className="mt-3 text-ink-soft">{description}</p> : null}
    </div>
  )
}
