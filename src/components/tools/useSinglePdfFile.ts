import { useCallback, useState } from 'react'
import { validatePdfFile, friendlyMessage } from '@/lib/pdf/errors'

export interface SinglePdfFile {
  file: File | null
  pageCount: number
  loading: boolean
  error: string | null
  select: (incoming: File[]) => Promise<void>
  clear: () => void
}

/** Validate a single PDF and read its page count without loading a full engine. */
export function useSinglePdfFile(): SinglePdfFile {
  const [file, setFile] = useState<File | null>(null)
  const [pageCount, setPageCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const select = useCallback(async (incoming: File[]) => {
    const next = incoming[0]
    setError(null)
    setFile(null)
    setPageCount(0)
    if (!next) return
    setLoading(true)
    try {
      await validatePdfFile(next)
      const { getPageCount } = await import('@/lib/pdf/operations')
      const count = await getPageCount(new Uint8Array(await next.arrayBuffer()))
      setFile(next)
      setPageCount(count)
    } catch (err) {
      setError(friendlyMessage(err))
    } finally {
      setLoading(false)
    }
  }, [])

  const clear = useCallback(() => {
    setFile(null)
    setPageCount(0)
    setError(null)
  }, [])

  return { file, pageCount, loading, error, select, clear }
}
