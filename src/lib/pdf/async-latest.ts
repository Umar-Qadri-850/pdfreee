/**
 * Enforces that only the most recently scheduled async task may deliver its
 * result. Used by the live preview so that rapidly switching filters or pages
 * never lets an older render overwrite a newer one.
 */

export interface LatestRunner {
  /** Invalidate every in-flight task; future results are discarded. */
  cancel: () => void
  /**
   * Schedule a task. `onResult`/`onError` run only if no newer task or cancel
   * happened while the task was in flight.
   */
  run<T>(
    task: () => Promise<T>,
    onResult?: (value: T) => void,
    onError?: (error: unknown) => void,
  ): void
}

export function createLatestOnly(): LatestRunner {
  let token = 0
  return {
    cancel() {
      token += 1
    },
    run(task, onResult, onError) {
      const id = token + 1
      token = id
      void task().then(
        (value) => {
          if (id === token) onResult?.(value)
        },
        (error) => {
          if (id === token) onError?.(error)
        },
      )
    },
  }
}