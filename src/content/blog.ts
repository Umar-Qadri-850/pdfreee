import { parseFrontmatter } from './frontmatter'

export interface BlogPostMeta {
  slug: string
  title: string
  description: string
  date: string
  updated?: string
  category: string
  tags: string[]
  readingTime: number
  tool?: string
}

export interface BlogPost extends BlogPostMeta {
  content: string
}

const modules = import.meta.glob('./blog/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

function toArray(value: string | string[] | undefined): string[] {
  if (Array.isArray(value)) return value
  if (!value) return []
  return value.split(',').map((v) => v.trim()).filter(Boolean)
}

function build(): BlogPost[] {
  const posts = Object.entries(modules).map(([path, raw]) => {
    const slug = path.split('/').pop()!.replace(/\.md$/, '')
    const { data, content } = parseFrontmatter(raw)
    const meta: BlogPostMeta = {
      slug,
      title: String(data.title ?? slug),
      description: String(data.description ?? ''),
      date: String(data.date ?? ''),
      updated: data.updated ? String(data.updated) : undefined,
      category: String(data.category ?? 'Guides'),
      tags: toArray(data.tags),
      readingTime: Number(data.readingTime ?? 5),
      tool: data.tool ? String(data.tool) : undefined,
    }
    return { ...meta, content }
  })
  return posts.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.title.localeCompare(b.title)))
}

export const POSTS: BlogPost[] = build()

export const POST_CATEGORIES: string[] = [...new Set(POSTS.map((p) => p.category))]

export function getPost(slug: string): BlogPost | undefined {
  return POSTS.find((p) => p.slug === slug)
}

export function relatedPosts(slug: string, limit = 3): BlogPost[] {
  const current = getPost(slug)
  if (!current) return POSTS.slice(0, limit)
  return POSTS.filter((p) => p.slug !== slug)
    .sort((a, b) => {
      const overlapA = a.tags.filter((t) => current.tags.includes(t)).length
      const overlapB = b.tags.filter((t) => current.tags.includes(t)).length
      return overlapB - overlapA
    })
    .slice(0, limit)
}

/** Extract H2/H3 headings for a table of contents. */
export function extractHeadings(markdown: string): { id: string; text: string; level: number }[] {
  const headingRe = /^(#{2,3})\s+(.+)$/gm
  const headings: { id: string; text: string; level: number }[] = []
  let match: RegExpExecArray | null
  while ((match = headingRe.exec(markdown)) !== null) {
    const text = match[2].trim()
    headings.push({ id: slugForHeading(text), text, level: match[1].length })
  }
  return headings
}

export function slugForHeading(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
}
