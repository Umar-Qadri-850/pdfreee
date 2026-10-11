import { useCallback, useRef, useState } from 'react'

export type TaskStatus = 'idle' | 'running' | 'done' | 'error'

export interface TaskController {
  status: TaskStatus
  progress: number
  message: string
  error: string | null
  run: (task: (ctx: TaskContext) => Promise<void>) => Promise<void>
  cancel: () => void
  reset: () => void
  setError: (message: string | null) => void
  setDone: (message?: string) => void
}

export interface TaskContext {
  signal: AbortSignal
  onProgress: (fraction: number, message?: string) => void
  throwIfAborted: () => void
}

/** Shared state machine for long-running, cancellable file operations. */
export function useAsyncTask(): TaskController {
  const [status, setStatus] = useState<TaskStatus>('idle')
  const [progress, setProgress] = useState(0)
  const [message, setMessage] = useState('')
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const reset = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    setStatus('idle')
    setProgress(0)
    setMessage('')
    setError(null)
  }, [])

  const cancel = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    setStatus('idle')
    setProgress(0)
    setMessage('Cancelled.')
  }, [])

  const run = useCallback(async (task: (ctx: TaskContext) => Promise<void>) => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setStatus('running')
    setProgress(0)
    setMessage('')
    setError(null)

    const throwIfAborted = () => {
      if (controller.signal.aborted) throw new DOMException('Aborted', 'AbortError')
    }

    try {
      await task({
        signal: controller.signal,
        onProgress: (fraction, msg) => {
          setProgress(Math.max(0, Math.min(1, fraction)))
          if (msg) setMessage(msg)
        },
        throwIfAborted,
      })
      if (!controller.signal.aborted) {
        setStatus('done')
        setProgress(1)
      }
    } catch (err) {
      if (controller.signal.aborted || (err instanceof DOMException && err.name === 'AbortError')) {
        setStatus('idle')
        setProgress(0)
        setMessage('Cancelled.')
        return
      }
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      if (abortRef.current === controller) abortRef.current = null
    }
  }, [])

  return {
    status,
    progress,
    message,
    error,
    run,
    cancel,
    reset,
    setError,
    setDone: (msg) => {
      setStatus('done')
      setProgress(1)
      if (msg) setMessage(msg)
    },
  }
}
