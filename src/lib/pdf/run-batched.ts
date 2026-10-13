/**
 * Run an array of async tasks with bounded concurrency.
 *
 * This is the scheduling primitive behind the "Edit PDF" live preview: every
 * task in a batch must deliver its own result (a naive "latest only" runner
 * would drop every result except the last), the number of concurrent tasks is
 * capped, a single task's failure must not stop the others, and a superseded
 * batch must be able to release its results (object URLs) instead of leaking
 * them.
 */

export interface RunBatchedOptions<T> {
  /** Maximum concurrent tasks (default 2). Must be >= 1. */
  concurrency?: number
  /** When returning true, results are discarded and no further tasks start. */
  shouldDiscard?: () => boolean
  /** Called with each delivered result and its index in the task list. */
  onResult?: (value: T, index: number) => void
  /** Called when a single task fails; the rest of the batch keeps going. */
  onError?: (error: unknown, index: number) => void
  /** Called with a result that was discarded so its resources can be released. */
  onDiscard?: (value: T, index: number) => void
}

/**
 * Run `tasks` in a small worker pool. Resolves once every started task has
 * finished (success, failure, or discard), so callers can rely on it to gate
 * "rendering…" states without leaving a promise permanently pending.
 */
export async function runBatched<T>(
  tasks: Array<() => Promise<T>>,
  options: RunBatchedOptions<T> = {},
): Promise<void> {
  const { concurrency = 2, shouldDiscard, onResult, onError, onDiscard } = options
  const limit = Math.max(1, Math.floor(concurrency))
  if (tasks.length === 0) return

  let nextIndex = 0
  const worker = async (): Promise<void> => {
    while (nextIndex < tasks.length) {
      const index = nextIndex
      nextIndex += 1
      const run = tasks[index]
      try {
        const value = await run()
        if (shouldDiscard?.()) {
          onDiscard?.(value, index)
          return
        }
        onResult?.(value, index)
      } catch (error) {
        onError?.(error, index)
      }
    }
  }

  const workers = Array.from({ length: Math.min(limit, tasks.length) }, () => worker())
  await Promise.all(workers)
}