export type ClassValue = string | number | false | null | undefined

/** Minimal class-name joiner (no runtime dependency). */
export function cn(...classes: ClassValue[]): string {
  return classes.filter(Boolean).join(' ')
}

export function formatBytes(bytes: number, decimals = 1): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—'
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / Math.pow(1024, i)
  const digits = i === 0 ? 0 : decimals
  return `${value.toFixed(digits)} ${units[i]}`
}

export function percent(part: number, whole: number): number {
  if (whole <= 0) return 0
  return Math.round((part / whole) * 100)
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/** Trigger a browser download for a Blob and revoke the object URL afterwards. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

export function downloadBytes(bytes: Uint8Array, filename: string, type = 'application/pdf'): void {
  const copy = new Uint8Array(bytes.length)
  copy.set(bytes)
  downloadBlob(new Blob([copy], { type }), filename)
}

/** Remove an extension from a filename and optionally append a new one. */
export function stripExtension(name: string): string {
  const dot = name.lastIndexOf('.')
  return dot > 0 ? name.slice(0, dot) : name
}

export function safeBaseName(name: string): string {
  return (
    stripExtension(name)
      .replace(/[^\w\-. ]+/g, '_')
      .replace(/\s+/g, '-')
      .slice(0, 80) || 'document'
  )
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
}

export function uniqueId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

/** UTC-safe, human readable date; returns empty string for invalid input. */
export function formatDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}
