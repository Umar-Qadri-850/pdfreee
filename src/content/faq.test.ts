import { describe, expect, it } from 'vitest'
import { FAQ_CATEGORIES, HOME_FAQS, SITE_FAQS } from './faq'
import { FILE_LIMITS } from '../lib/pdf/errors'

describe('SITE_FAQS', () => {
  it('uses only known categories', () => {
    for (const faq of SITE_FAQS) {
      expect(FAQ_CATEGORIES).toContain(faq.category)
    }
  })

  it('has unique questions', () => {
    const questions = SITE_FAQS.map((f) => f.q)
    expect(new Set(questions).size).toBe(questions.length)
  })

  it('has non-empty questions and answers', () => {
    for (const faq of SITE_FAQS) {
      expect(faq.q.trim().length).toBeGreaterThan(0)
      expect(faq.a.trim().length).toBeGreaterThan(0)
    }
  })

  it('derives the hard file limits from FILE_LIMITS', () => {
    const answer = SITE_FAQS.find((f) => f.q.includes('hard file limits'))?.a ?? ''
    const pdfMb = Math.round(FILE_LIMITS.maxPdfBytes / (1024 * 1024))
    const imageMb = Math.round(FILE_LIMITS.maxImageBytes / (1024 * 1024))
    expect(answer).toContain(`${pdfMb} MB`)
    expect(answer).toContain(`${imageMb} MB`)
  })
})

describe('HOME_FAQS', () => {
  it('is a non-empty subset of the full list', () => {
    expect(HOME_FAQS.length).toBeGreaterThan(0)
    for (const faq of HOME_FAQS) {
      expect(SITE_FAQS).toContain(faq)
    }
  })
})
