import { useCallback, useState } from 'react'
import { describePages, parsePageRanges, uniqueSorted } from '@/lib/pdf/range'

export interface PdfSelection {
  selected: Set<number>
  rangeText: string
  rangeError: string | null
  toggle: (page: number) => void
  setFromText: (text: string) => void
  clear: () => void
  setSelection: (pages: number[]) => void
}

/** Keeps a clickable thumbnail selection and a text range field in sync. */
export function usePdfSelection(pageCount: number): PdfSelection {
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [rangeText, setRangeText] = useState('')
  const [rangeError, setRangeError] = useState<string | null>(null)

  const setSelection = useCallback((pages: number[]) => {
    const unique = uniqueSorted(pages)
    setSelected(new Set(unique))
    setRangeText(describePages(unique))
    setRangeError(null)
  }, [])

  const toggle = useCallback(
    (page: number) => {
      setSelected((prev) => {
        const next = new Set(prev)
        if (next.has(page)) next.delete(page)
        else next.add(page)
        setRangeText(describePages([...next]))
        setRangeError(null)
        return next
      })
    },
    [],
  )

  const setFromText = useCallback(
    (text: string) => {
      setRangeText(text)
      if (!text.trim()) {
        setSelected(new Set())
        setRangeError(null)
        return
      }
      const parsed = parsePageRanges(text, pageCount)
      if (parsed.error) {
        setRangeError(parsed.error)
        return
      }
      setRangeError(null)
      setSelected(new Set(uniqueSorted(parsed.pages)))
    },
    [pageCount],
  )

  const clear = useCallback(() => {
    setSelected(new Set())
    setRangeText('')
    setRangeError(null)
  }, [])

  return { selected, rangeText, rangeError, toggle, setFromText, clear, setSelection }
}
