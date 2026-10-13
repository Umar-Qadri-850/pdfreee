import { describe, expect, it } from 'vitest'
import type { Transform } from './placement'
import {
  clampCropRect,
  clampMargins,
  marginsToPreviewRect,
  previewRectToMargins,
} from './crop-selection'

const SCALE = 1.5
const PAGE_WIDTH = 595.28
const PAGE_HEIGHT = 841.89

/** Rotation-0 A4 portrait viewport at scale 1.5, preview pixels top-left origin. */
const PORTRAIT: Transform = [SCALE, 0, 0, -SCALE, 0, PAGE_HEIGHT * SCALE]
const PREVIEW_W = PAGE_WIDTH * SCALE
const PREVIEW_H = PAGE_HEIGHT * SCALE

/** A 90°-rotated page: preview axes are swapped relative to the media box. */
const ROTATED: Transform = [0, 1, 1, 0, 0, 0]
const ROTATED_W = PAGE_HEIGHT
const ROTATED_H = PAGE_WIDTH

describe('previewRectToMargins', () => {
  it('maps a centred half-page selection to 25% margins on every edge', () => {
    const margins = previewRectToMargins(
      PORTRAIT,
      { x: PREVIEW_W / 4, y: PREVIEW_H / 4, width: PREVIEW_W / 2, height: PREVIEW_H / 2 },
      PREVIEW_W,
      PREVIEW_H,
    )
    expect(margins.top).toBeCloseTo(0.25, 5)
    expect(margins.bottom).toBeCloseTo(0.25, 5)
    expect(margins.left).toBeCloseTo(0.25, 5)
    expect(margins.right).toBeCloseTo(0.25, 5)
  })

  it('maps a full-page selection to zero margins', () => {
    const margins = previewRectToMargins(
      PORTRAIT,
      { x: 0, y: 0, width: PREVIEW_W, height: PREVIEW_H },
      PREVIEW_W,
      PREVIEW_H,
    )
    expect(margins).toEqual({ top: 0, right: 0, bottom: 0, left: 0 })
  })

  it('is rotation-aware: a centred selection still yields 25% margins', () => {
    const margins = previewRectToMargins(
      ROTATED,
      { x: ROTATED_W / 4, y: ROTATED_H / 4, width: ROTATED_W / 2, height: ROTATED_H / 2 },
      ROTATED_W,
      ROTATED_H,
    )
    expect(margins.top).toBeCloseTo(0.25, 5)
    expect(margins.bottom).toBeCloseTo(0.25, 5)
    expect(margins.left).toBeCloseTo(0.25, 5)
    expect(margins.right).toBeCloseTo(0.25, 5)
  })

  it('clamps a selection dragged past the page edge', () => {
    const margins = previewRectToMargins(
      PORTRAIT,
      { x: -50, y: -50, width: PREVIEW_W + 100, height: PREVIEW_H + 100 },
      PREVIEW_W,
      PREVIEW_H,
    )
    expect(margins).toEqual({ top: 0, right: 0, bottom: 0, left: 0 })
  })
})

describe('marginsToPreviewRect', () => {
  it('round-trips with previewRectToMargins', () => {
    const rect = { x: 60, y: 90, width: 300, height: 500 }
    const margins = previewRectToMargins(PORTRAIT, rect, PREVIEW_W, PREVIEW_H)
    const back = marginsToPreviewRect(PORTRAIT, margins, PREVIEW_W, PREVIEW_H)
    expect(back.x).toBeCloseTo(rect.x, 4)
    expect(back.y).toBeCloseTo(rect.y, 4)
    expect(back.width).toBeCloseTo(rect.width, 4)
    expect(back.height).toBeCloseTo(rect.height, 4)
  })

  it('round-trips on a rotated page', () => {
    const rect = { x: 40, y: 70, width: 200, height: 350 }
    const margins = previewRectToMargins(ROTATED, rect, ROTATED_W, ROTATED_H)
    const back = marginsToPreviewRect(ROTATED, margins, ROTATED_W, ROTATED_H)
    expect(back.x).toBeCloseTo(rect.x, 4)
    expect(back.y).toBeCloseTo(rect.y, 4)
    expect(back.width).toBeCloseTo(rect.width, 4)
    expect(back.height).toBeCloseTo(rect.height, 4)
  })

  it('places a zero-margin crop over the whole preview', () => {
    const rect = marginsToPreviewRect(
      PORTRAIT,
      { top: 0, right: 0, bottom: 0, left: 0 },
      PREVIEW_W,
      PREVIEW_H,
    )
    expect(rect.x).toBeCloseTo(0, 4)
    expect(rect.y).toBeCloseTo(0, 4)
    expect(rect.width).toBeCloseTo(PREVIEW_W, 4)
    expect(rect.height).toBeCloseTo(PREVIEW_H, 4)
  })
})

describe('clampMargins', () => {
  it('keeps values within range', () => {
    expect(clampMargins({ top: -1, right: 2, bottom: 0.3, left: 0.1 })).toEqual({
      top: 0,
      right: 0.9,
      bottom: 0.3,
      left: 0.1,
    })
  })

  it('honours a custom maximum', () => {
    expect(clampMargins({ top: 0.6, right: 0, bottom: 0, left: 0 }, 0.45).top).toBe(0.45)
  })
})

describe('clampCropRect', () => {
  it('keeps the rectangle inside the page', () => {
    const rect = clampCropRect({ x: -20, y: -20, width: 200, height: 200 }, 400, 300)
    expect(rect.x).toBe(0)
    expect(rect.y).toBe(0)
    expect(rect.width).toBe(200)
    expect(rect.height).toBe(200)
  })

  it('enforces a minimum size', () => {
    const rect = clampCropRect({ x: 10, y: 10, width: 2, height: 2 }, 400, 300, 16)
    expect(rect.width).toBe(16)
    expect(rect.height).toBe(16)
  })

  it('caps a rectangle larger than the page', () => {
    const rect = clampCropRect({ x: 0, y: 0, width: 999, height: 999 }, 400, 300)
    expect(rect.width).toBe(400)
    expect(rect.height).toBe(300)
  })
})
