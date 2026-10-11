import { useEffect } from 'react'
import { SITE, resolveSiteUrl } from './site'

export function siteOrigin(): string {
  const configured = import.meta.env.VITE_SITE_URL
  if (configured) return resolveSiteUrl(configured)
  if (typeof window !== 'undefined') return window.location.origin
  return resolveSiteUrl()
}

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function upsertLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`)
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', rel)
    document.head.appendChild(el)
  }
  el.setAttribute('href', href)
}

export interface SeoOptions {
  title: string
  description: string
  /** Path beginning with "/" — resolved against the canonical origin. */
  path: string
  type?: 'website' | 'article'
  image?: string
  jsonLd?: Record<string, unknown> | Record<string, unknown>[]
  noindex?: boolean
}

/** Apply per-route document metadata. Idempotent and safe to call on every render. */
export function useSeo({ title, description, path, type = 'website', image, jsonLd, noindex }: SeoOptions) {
  useEffect(() => {
    const origin = siteOrigin()
    const url = `${origin}${path}`
    const ogImage = `${origin}${image ?? SITE.defaultOgImage}`

    document.title = title
    upsertMeta('name', 'description', description)
    upsertMeta('name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow')
    upsertLink('canonical', url)

    upsertMeta('property', 'og:type', type)
    upsertMeta('property', 'og:title', title)
    upsertMeta('property', 'og:description', description)
    upsertMeta('property', 'og:url', url)
    upsertMeta('property', 'og:site_name', SITE.name)
    upsertMeta('property', 'og:image', ogImage)
    upsertMeta('property', 'og:locale', SITE.locale)

    upsertMeta('name', 'twitter:card', 'summary_large_image')
    upsertMeta('name', 'twitter:title', title)
    upsertMeta('name', 'twitter:description', description)
    upsertMeta('name', 'twitter:image', ogImage)
    if (SITE.twitter) upsertMeta('name', 'twitter:site', SITE.twitter)

    const scriptId = 'pdfreee-route-jsonld'
    document.getElementById(scriptId)?.remove()
    if (jsonLd) {
      const script = document.createElement('script')
      script.type = 'application/ld+json'
      script.id = scriptId
      script.textContent = JSON.stringify(jsonLd)
      document.head.appendChild(script)
    }
    return () => {
      document.getElementById(scriptId)?.remove()
    }
  }, [title, description, path, type, image, noindex, jsonLd])
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  const origin = siteOrigin()
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `${origin}${item.path}`,
    })),
  }
}
