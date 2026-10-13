/**
 * Cookie / consent manager.
 *
 * Stores a single, small record in localStorage describing whether the visitor
 * has allowed optional (advertising) storage and scripts. Nothing optional —
 * no ad script, no ad markup — runs until `advertising` is explicitly true.
 *
 * The record is versioned so that if the categories ever change, an old stored
 * decision is treated as stale and the visitor is asked again.
 */

const STORAGE_KEY = 'pdfreee.consent'
const VERSION = 1

export interface ConsentState {
  version: number
  /** Necessary storage is always permitted; it cannot be switched off. */
  necessary: true
  advertising: boolean
  updatedAt: string
}

type Listener = () => void

const listeners = new Set<Listener>()

function emit(): void {
  for (const listener of listeners) listener()
}

/** Read the stored decision, or null when the visitor has not chosen yet. */
export function readConsent(): ConsentState | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<ConsentState>
    if (parsed?.version !== VERSION) return null
    return {
      version: VERSION,
      necessary: true,
      advertising: parsed.advertising === true,
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : '',
    }
  } catch {
    return null
  }
}

/** Persist a decision and notify subscribers. */
export function saveConsent(advertising: boolean): ConsentState {
  const state: ConsentState = {
    version: VERSION,
    necessary: true,
    advertising: Boolean(advertising),
    updatedAt: new Date().toISOString(),
  }
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      /* storage may be unavailable (private mode); the choice simply won't persist */
    }
  }
  emit()
  return state
}

/** Forget the stored decision so the visitor is asked again. */
export function clearConsent(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
  emit()
}

/** True only when optional advertising scripts may run. */
export function hasAdConsent(): boolean {
  return readConsent()?.advertising === true
}

export function subscribeConsent(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** Event used to (re)open the preferences panel from anywhere in the app. */
export const CONSENT_OPEN_EVENT = 'pdfreee:open-consent'

export function openConsentPreferences(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(CONSENT_OPEN_EVENT))
  }
}

if (typeof window !== 'undefined') {
  // Keep multiple tabs in sync when the choice changes elsewhere.
  window.addEventListener('storage', (event) => {
    if (event.key === STORAGE_KEY) emit()
  })
}
