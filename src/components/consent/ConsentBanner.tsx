import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router'
import { X } from 'lucide-react'
import { Button } from '@/components/ui'
import { CONSENT_OPEN_EVENT, saveConsent } from '@/lib/consent'
import { useConsent } from './useConsent'

/**
 * Consent banner. Appears on first visit and can be reopened at any time from
 * the "Cookie settings" controls. The core tools need no consent; only optional
 * advertising storage/scripts are gated by this choice.
 */
export function ConsentBanner() {
  const consent = useConsent()
  const [open, setOpen] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [advertising, setAdvertising] = useState(false)

  useEffect(() => {
    if (consent === null) setOpen(true)
  }, [consent])

  useEffect(() => {
    const handler = () => {
      setAdvertising(consent?.advertising ?? false)
      setShowDetails(true)
      setOpen(true)
    }
    window.addEventListener(CONSENT_OPEN_EVENT, handler)
    return () => window.removeEventListener(CONSENT_OPEN_EVENT, handler)
  }, [consent])

  // Escape dismisses only when a decision already exists; a first-time visitor
  // must make an explicit choice rather than silently dismissing the banner.
  const dismiss = useCallback(() => {
    if (consent === null) return
    setOpen(false)
    setShowDetails(false)
  }, [consent])

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') dismiss()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, dismiss])

  if (!open) return null

  function decide(value: boolean) {
    saveConsent(value)
    setOpen(false)
    setShowDetails(false)
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 p-3 sm:p-4">
      <section
        role="dialog"
        aria-labelledby="consent-title"
        className="pointer-events-auto mx-auto max-w-3xl rounded-lg border border-line-strong bg-surface p-4 shadow-lg sm:p-5"
      >
        <div className="flex items-start justify-between gap-3">
          <h2 id="consent-title" className="text-base font-semibold">
            Your choice on cookies
          </h2>
          {consent !== null ? (
            <button
              type="button"
              onClick={dismiss}
              aria-label="Close cookie settings"
              className="-mr-1 -mt-1 rounded p-1 text-ink-muted hover:bg-surface-sunken hover:text-ink"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          ) : null}
        </div>
        <p className="mt-1.5 text-sm text-ink-soft">
          The core PDF tools run in your browser and need no cookies. We only ask about optional
          storage used for advertising. Read the{' '}
          <Link to="/cookie-policy" className="text-accent-strong underline">
            cookie policy
          </Link>
          .
        </p>

        {showDetails ? (
          <fieldset className="mt-4 space-y-3">
            <legend className="sr-only">Cookie categories</legend>
            <label className="flex items-start gap-3">
              <input type="checkbox" checked disabled className="mt-1" />
              <span>
                <span className="block text-sm font-medium">Strictly necessary</span>
                <span className="block text-xs text-ink-soft">
                  Always on. Required for the site to function and stay secure.
                </span>
              </span>
            </label>
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={advertising}
                onChange={(e) => setAdvertising(e.target.checked)}
                className="mt-1"
              />
              <span>
                <span className="block text-sm font-medium">Advertising</span>
                <span className="block text-xs text-ink-soft">
                  Allows optional ad storage and scripts. Off unless you turn it on.
                </span>
              </span>
            </label>
          </fieldset>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2">
          {showDetails ? (
            <Button size="sm" onClick={() => decide(advertising)}>
              Save choices
            </Button>
          ) : (
            <>
              <Button size="sm" onClick={() => decide(true)}>
                Accept all
              </Button>
              <Button size="sm" variant="secondary" onClick={() => decide(false)}>
                Reject non-essential
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowDetails(true)}>
                Customize
              </Button>
            </>
          )}
        </div>
      </section>
    </div>
  )
}
