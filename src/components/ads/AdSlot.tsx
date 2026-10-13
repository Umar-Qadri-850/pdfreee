import { useEffect, useRef } from 'react'
import { ADSENSE, isAdsenseReady, loadAdsenseScript } from '@/lib/ads'
import { useConsent } from '@/components/consent/useConsent'

/**
 * Reserved responsive ad container. Renders nothing unless AdSense is fully
 * configured with a real publisher and slot ID AND the visitor has consented to
 * advertising. Slots are labelled so they can never be mistaken for tool
 * controls or download buttons.
 */
export function AdSlot({ slot, label = 'Advertisement' }: { slot?: string; label?: string }) {
  const ref = useRef<HTMLModElement>(null)
  const consent = useConsent()
  const ready = isAdsenseReady(slot) && consent?.advertising === true

  useEffect(() => {
    if (!ready) return
    loadAdsenseScript()
    try {
      const w = window as unknown as { adsbygoogle?: unknown[] }
      w.adsbygoogle = w.adsbygoogle ?? []
      w.adsbygoogle.push({})
    } catch {
      /* ad push failures must never break the tool */
    }
  }, [ready])

  if (!ready) return null

  return (
    <aside aria-label={label} className="my-8">
      <p className="mb-1 text-center text-[10px] uppercase tracking-[0.2em] text-ink-muted">
        {label}
      </p>
      <div className="min-h-[100px] overflow-hidden rounded-md border border-line bg-surface-sunken/40">
        <ins
          ref={ref}
          className="adsbygoogle block"
          style={{ display: 'block' }}
          data-ad-client={ADSENSE.client}
          data-ad-slot={slot}
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
      </div>
    </aside>
  )
}
