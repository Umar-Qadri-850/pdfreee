import { hasAdConsent } from './consent'

/**
 * Optional AdSense configuration.
 *
 * Disabled by default. The site renders NO ad markup and loads NO ad scripts
 * unless the owner explicitly opts in via environment variables AND supplies
 * real publisher/slot IDs. This project never ships invented IDs.
 */
export const ADSENSE = {
  enabled: import.meta.env.VITE_ADSENSE_ENABLED === 'true',
  client: (import.meta.env.VITE_ADSENSE_CLIENT ?? '').trim(),
  slots: {
    top: (import.meta.env.VITE_ADSENSE_SLOT_TOP ?? '').trim(),
    bottom: (import.meta.env.VITE_ADSENSE_SLOT_BOTTOM ?? '').trim(),
  },
}

export function isAdsenseReady(slot?: string): boolean {
  return Boolean(
    ADSENSE.enabled &&
      /^ca-pub-\d{10,}$/.test(ADSENSE.client) &&
      slot &&
      /^\d{4,}$/.test(slot),
  )
}

let scriptLoaded = false
export function loadAdsenseScript(): void {
  if (scriptLoaded || typeof document === 'undefined') return
  if (!/^ca-pub-\d{10,}$/.test(ADSENSE.client)) return
  // Never load ad scripts without explicit advertising consent.
  if (!hasAdConsent()) return
  scriptLoaded = true
  const s = document.createElement('script')
  s.async = true
  s.crossOrigin = 'anonymous'
  s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(
    ADSENSE.client,
  )}`
  document.head.appendChild(s)
}
