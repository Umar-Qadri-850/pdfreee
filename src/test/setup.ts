import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

// jsdom lacks a few browser APIs the app touches during tests.
if (!('createObjectURL' in URL)) {
  // @ts-expect-error assign for test environment
  URL.createObjectURL = vi.fn(() => 'blob:test')
  // @ts-expect-error assign for test environment
  URL.revokeObjectURL = vi.fn()
}

if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
}
