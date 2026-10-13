import { useEffect, useState } from 'react'
import { outputFileName, sanitizeOutputBase } from '@/lib/utils'

/**
 * Track a user-editable output file name.
 *
 * `defaultBase` is the derived suggestion (for example "report-merged"). It is
 * re-applied whenever it changes — typically when a new file is selected — so
 * the field always starts from a sensible value without fighting the user's
 * edits mid-task.
 */
export function useOutputFileName(defaultBase: string, extension: string) {
  const [base, setBase] = useState(defaultBase)

  useEffect(() => {
    setBase(defaultBase)
  }, [defaultBase])

  return {
    base,
    setBase,
    /** Sanitised base without any extension — useful for numbered/zipped outputs. */
    stem: sanitizeOutputBase(base),
    fileName: outputFileName(base, extension),
  }
}
