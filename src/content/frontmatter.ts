/**
 * Tiny frontmatter parser (dependency-free) shared by the browser blog loader
 * and the Node SEO/sitemap script. Supports the small YAML subset we use:
 *   key: value
 *   key: 2026-10-11
 *   list: [a, b, c]
 */

export interface Frontmatter {
  data: Record<string, string | string[]>
  content: string
}

export function parseFrontmatter(raw: string): Frontmatter {
  const normalized = raw.replace(/^\uFEFF/, '')
  const match = normalized.match(/^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/)
  if (!match) return { data: {}, content: normalized.trim() }

  const data: Record<string, string | string[]> = {}
  for (const line of match[1].split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const sep = trimmed.indexOf(':')
    if (sep === -1) continue
    const key = trimmed.slice(0, sep).trim()
    const value = trimmed.slice(sep + 1).trim()
    if (value.startsWith('[') && value.endsWith(']')) {
      data[key] = value
        .slice(1, -1)
        .split(',')
        .map((v) => stripQuotes(v.trim()))
        .filter(Boolean)
    } else {
      data[key] = stripQuotes(value)
    }
  }
  return { data, content: match[2].trim() }
}

function stripQuotes(value: string): string {
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1)
  }
  return value
}
