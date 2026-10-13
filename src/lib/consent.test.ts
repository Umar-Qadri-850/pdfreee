import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearConsent,
  hasAdConsent,
  readConsent,
  saveConsent,
  subscribeConsent,
} from './consent'

const STORAGE_KEY = 'pdfreee.consent'

describe('consent', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('has no decision by default', () => {
    expect(readConsent()).toBeNull()
    expect(hasAdConsent()).toBe(false)
  })

  it('records and reads an advertising decision', () => {
    saveConsent(true)
    expect(readConsent()?.advertising).toBe(true)
    expect(hasAdConsent()).toBe(true)
  })

  it('treats a rejected choice as no ad consent', () => {
    saveConsent(false)
    expect(readConsent()?.advertising).toBe(false)
    expect(hasAdConsent()).toBe(false)
  })

  it('clears the stored decision', () => {
    saveConsent(true)
    clearConsent()
    expect(readConsent()).toBeNull()
  })

  it('ignores a stale record from an older version', () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: 0, advertising: true, updatedAt: '' }),
    )
    expect(readConsent()).toBeNull()
    expect(hasAdConsent()).toBe(false)
  })

  it('ignores malformed stored data', () => {
    window.localStorage.setItem(STORAGE_KEY, 'not json')
    expect(readConsent()).toBeNull()
  })

  it('notifies subscribers on save and clear', () => {
    const listener = vi.fn()
    const unsubscribe = subscribeConsent(listener)
    saveConsent(true)
    clearConsent()
    expect(listener).toHaveBeenCalledTimes(2)
    unsubscribe()
    saveConsent(true)
    expect(listener).toHaveBeenCalledTimes(2)
  })
})
