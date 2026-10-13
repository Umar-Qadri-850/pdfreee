import { describe, expect, it } from 'vitest'
import { createLatestOnly } from './async-latest'

const tick = (ms = 0) => new Promise<void>((resolve) => setTimeout(resolve, ms))

describe('createLatestOnly', () => {
  it('delivers only the result of the most recent task', async () => {
    const runner = createLatestOnly()
    const results: string[] = []
    const slow = () => new Promise<string>((resolve) => setTimeout(() => resolve('slow'), 10))
    const fast = () => new Promise<string>((resolve) => setTimeout(() => resolve('fast'), 1))

    runner.run(slow, (value) => results.push(value))
    runner.run(fast, (value) => results.push(value))
    await tick(20)

    expect(results).toEqual(['fast'])
  })

  it('discards results scheduled before the current task even if they finish later', async () => {
    const runner = createLatestOnly()
    const results: string[] = []
    let release!: () => void
    const pending = new Promise<string>((resolve) => {
      release = () => resolve('value')
    })

    runner.run(() => pending, (value) => results.push(value))
    runner.run(async () => 'newer', (value) => results.push(value))
    release()
    await tick(0)

    expect(results).toEqual(['newer'])
  })

  it('ignores in-flight results after cancel()', async () => {
    const runner = createLatestOnly()
    const results: string[] = []
    let release!: () => void
    const pending = new Promise<string>((resolve) => {
      release = () => resolve('value')
    })

    runner.run(() => pending, (value) => results.push(value))
    runner.cancel()
    release()
    await tick(0)

    expect(results).toEqual([])
  })

  it('routes errors for the latest task', async () => {
    const runner = createLatestOnly()
    const errors: unknown[] = []
    runner.run(
      () => Promise.reject(new Error('boom')),
      () => {},
      (error) => errors.push(error),
    )
    await tick(0)
    expect(errors).toHaveLength(1)
    expect((errors[0] as Error).message).toBe('boom')
  })
})