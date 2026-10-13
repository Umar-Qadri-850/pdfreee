import { describe, expect, it } from 'vitest'
import { outputFileName, sanitizeOutputBase, stripExtension } from './utils'

describe('sanitizeOutputBase', () => {
  it('removes a trailing extension', () => {
    expect(sanitizeOutputBase('report.pdf')).toBe('report')
  })

  it('replaces unsafe characters with underscores', () => {
    expect(sanitizeOutputBase('a/b:c*d?')).toBe('a_b_c_d')
  })

  it('converts whitespace to single dashes', () => {
    expect(sanitizeOutputBase('my   final  draft')).toBe('my-final-draft')
  })

  it('collapses repeated dashes and trims separators', () => {
    expect(sanitizeOutputBase('--a---b--')).toBe('a-b')
  })

  it('falls back to a default for empty input', () => {
    expect(sanitizeOutputBase('   ')).toBe('document')
    expect(sanitizeOutputBase('...')).toBe('document')
  })

  it('caps very long names', () => {
    expect(sanitizeOutputBase('a'.repeat(200)).length).toBeLessThanOrEqual(80)
  })
})

describe('outputFileName', () => {
  it('joins a sanitised base and extension', () => {
    expect(outputFileName('My Report', 'pdf')).toBe('My-Report.pdf')
  })

  it('normalises a leading dot in the extension', () => {
    expect(outputFileName('notes', '.txt')).toBe('notes.txt')
  })

  it('strips an extension the user typed into the base', () => {
    expect(outputFileName('report.pdf', 'pdf')).toBe('report.pdf')
  })

  it('ignores invalid characters in the extension', () => {
    expect(outputFileName('x', 'p!d?f')).toBe('x.pdf')
  })

  it('falls back when the base is empty', () => {
    expect(outputFileName('', 'pdf')).toBe('document.pdf')
  })
})

describe('stripExtension', () => {
  it('removes only the final extension', () => {
    expect(stripExtension('a.b.c.pdf')).toBe('a.b.c')
  })
})
