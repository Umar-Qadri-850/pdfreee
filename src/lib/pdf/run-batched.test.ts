import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { runBatched } from './run-batched'

const tick = (ms = 0) => new Promise<void>((resolve) => setTimeout(resolve, ms))

const deferred = <T>() => {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

function controlled(ms: number, value: string) {
  return () => tick(ms).then(() => value)
}

describe('runBatched', () => {
  beforeEach(() => {
    vi.useRealTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('delivers a result for EVERY task, not just the last (regression for the multi-page preview hang)', async () => {
    const tasks = Array.from({ length: 4 }, (_, i) => controlled((4 - i) * 2, `page-${i + 1}`))
    const seen: string[] = []
    const errors: unknown[] = []
    await runBatched(tasks, { concurrency: 2, onResult: (v) => seen.push(v), onError: (e) => errors.push(e) })
    expect(seen.sort()).toEqual(['page-1', 'page-2', 'page-3', 'page-4'])
    expect(errors).toEqual([])
  })

  it('delivers results for 5- and 10-page batches', async () => {
    for (const count of [5, 10]) {
      const seen: number[] = []
      await runBatched(
        Array.from({ length: count }, (_, i) => () => Promise.resolve(i + 1)),
        { onResult: (v) => seen.push(v) },
      )
      expect(seen).toHaveLength(count)
    }
  })

  it('never runs more tasks than the concurrency limit, and gives each task its own canvas', async () => {
    let inFlight = 0
    let maxInFlight = 0
    const canvases: unknown[] = []
    const results: string[] = []
    await runBatched(
      Array.from({ length: 6 }, (_, i) => () => {
        const canvas = { token: `canvas-${i}` }
        canvases.push(canvas)
        inFlight += 1
        maxInFlight = Math.max(maxInFlight, inFlight)
        return tick(2).then(() => {
          inFlight -= 1
          return `done-${i}`
        })
      }),
      { concurrency: 2, onResult: (v) => results.push(v) },
    )
    expect(maxInFlight).toBeLessThanOrEqual(2)
    expect(new Set(canvases).size).toBe(6)
    expect(results).toHaveLength(6)
  })

  it('isolates a single failing task without stopping the rest', async () => {
    const results: string[] = []
    const errors: unknown[] = []
    await runBatched(
      [
        () => Promise.resolve('ok-1'),
        () => Promise.reject(new Error('page render failed')),
        () => Promise.resolve('ok-2'),
      ],
      { concurrency: 1, onResult: (v) => results.push(v), onError: (e) => errors.push(e) },
    )
    expect(results.sort()).toEqual(['ok-1', 'ok-2'])
    expect(errors).toHaveLength(1)
    expect((errors[0] as Error).message).toBe('page render failed')
  })

  it('resolves immediately for an empty batch', async () => {
    const onResult = vi.fn()
    await runBatched([], { onResult })
    expect(onResult).not.toHaveBeenCalled()
  })

  it('discards results once the generation is superseded and hands them to onDiscard', async () => {
    const delivered: string[] = []
    const discarded: string[] = []
    const d0 = deferred<string>()
    const d1 = deferred<string>()
    const run = runBatched([() => d0.promise, () => d1.promise], {
      concurrency: 2,
      shouldDiscard: () => true,
      onResult: (v) => delivered.push(v),
      onDiscard: (v) => discarded.push(v),
    })
    d0.resolve('stale-a')
    d1.resolve('stale-b')
    await run
    expect(delivered).toEqual([])
    expect(discarded.sort()).toEqual(['stale-a', 'stale-b'])
  })

  it('does not let a superseded (cancelled) batch block a subsequent run', async () => {
    const gate = deferred<string>()
    const first = runBatched([() => gate.promise], {
      concurrency: 1,
      shouldDiscard: () => true,
      onDiscard: () => {},
    })
    const secondResults: string[] = []
    const second = runBatched([() => Promise.resolve('next')], { onResult: (v) => secondResults.push(v) })
    await second
    expect(secondResults).toEqual(['next'])
    gate.resolve('late')
    await first
  })

  it('settles (resolves) when every task finishes, so callers can stop a spinner', async () => {
    let settled = false
    const run = () => tick(3).then(() => 'x')
    await runBatched([run, run, run], { concurrency: 1 })
    settled = true
    expect(settled).toBe(true)
  })
})