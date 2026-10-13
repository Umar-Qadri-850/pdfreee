import { useEffect, useState } from 'react'
import { readConsent, subscribeConsent, type ConsentState } from '@/lib/consent'

/**
 * Subscribe to the stored consent decision. Returns the current state (or null
 * when the visitor has not chosen yet) and re-renders on changes in this tab or
 * another tab.
 */
export function useConsent(): ConsentState | null {
  const [consent, setConsent] = useState<ConsentState | null>(() => readConsent())
  useEffect(() => subscribeConsent(() => setConsent(readConsent())), [])
  return consent
}
