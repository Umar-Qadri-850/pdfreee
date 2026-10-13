import { describe, expect, it } from 'vitest'
import { FILTER_PRESETS, filterPixels, isFilterId } from './filters'

function px(...values: number[]): Uint8ClampedArray {
  return new Uint8ClampedArray(values)
}

describe('isFilterId', () => {
  it('accepts known presets', () => {
    expect(isFilterId('grayscale')).toBe(true)
    expect(isFilterId('none')).toBe(true)
  })

  it('rejects unknown ids', () => {
    expect(isFilterId('blur')).toBe(false)
  })
})

describe('FILTER_PRESETS', () => {
  it('starts with the no-op original', () => {
    expect(FILTER_PRESETS[0].id).toBe('none')
  })

  it('has unique ids', () => {
    const ids = FILTER_PRESETS.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('filterPixels', () => {
  it('leaves the original untouched', () => {
    const data = px(10, 20, 30, 255)
    filterPixels(data, 'none')
    expect([...data]).toEqual([10, 20, 30, 255])
  })

  it('preserves alpha', () => {
    const data = px(10, 20, 30, 128)
    filterPixels(data, 'invert')
    expect(data[3]).toBe(128)
  })

  it('converts to grayscale using luma', () => {
    const data = px(255, 0, 0, 255)
    filterPixels(data, 'grayscale')
    expect(data[0]).toBe(data[1])
    expect(data[1]).toBe(data[2])
    expect(data[0]).toBeCloseTo(76, 0)
  })

  it('thresholds black & white at the midpoint', () => {
    const dark = px(10, 10, 10, 255)
    const light = px(240, 240, 240, 255)
    filterPixels(dark, 'blackwhite')
    filterPixels(light, 'blackwhite')
    expect([dark[0], dark[1], dark[2]]).toEqual([0, 0, 0])
    expect([light[0], light[1], light[2]]).toEqual([255, 255, 255])
  })

  it('inverts channels', () => {
    const data = px(0, 128, 255, 255)
    filterPixels(data, 'invert')
    expect([data[0], data[1], data[2]]).toEqual([255, 127, 0])
  })

  it('clamps brightened values at 255', () => {
    const data = px(250, 250, 250, 255)
    filterPixels(data, 'brighten')
    expect([data[0], data[1], data[2]]).toEqual([255, 255, 255])
  })

  it('warms by lifting red and lowering blue', () => {
    const data = px(128, 128, 128, 255)
    filterPixels(data, 'warm')
    expect(data[0]).toBeGreaterThan(128)
    expect(data[2]).toBeLessThan(128)
  })

  it('cools by lifting blue and lowering red', () => {
    const data = px(128, 128, 128, 255)
    filterPixels(data, 'cool')
    expect(data[2]).toBeGreaterThan(128)
    expect(data[0]).toBeLessThan(128)
  })

  it('applies the sepia matrix', () => {
    const data = px(0, 0, 0, 255)
    filterPixels(data, 'sepia')
    expect([data[0], data[1], data[2]]).toEqual([0, 0, 0])
    const white = px(255, 255, 255, 255)
    filterPixels(white, 'sepia')
    expect(white[0]).toBeGreaterThan(white[2])
  })
})
