'use client'

import { useCallback, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { emergencyRequestsService } from '@/lib/api'
import { EmergencyRequest } from '@/types'

type Options = {
  onOpenCase: (request: EmergencyRequest) => void
  /** Redirect PENDING cases from active page to pending queue */
  redirectPendingTo?: string
}

/**
 * Reads ?id= from URL (notification deep links), opens the case, scrolls to it, clears query.
 */
export function useFocusedCaseFromUrl({ onOpenCase, redirectPendingTo }: Options) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const handledRef = useRef<string | null>(null)

  const clearCaseQuery = useCallback(() => {
    if (typeof window === 'undefined') return
    const url = new URL(window.location.href)
    url.searchParams.delete('id')
    router.replace(url.pathname + (url.search ? url.search : ''), { scroll: false })
  }, [router])

  useEffect(() => {
    const caseId = searchParams.get('id')
    if (!caseId || handledRef.current === caseId) return

    handledRef.current = caseId

    void (async () => {
      try {
        const data = await emergencyRequestsService.getById(caseId)
        if (!data) return

        if (redirectPendingTo && data.status === 'PENDING') {
          router.replace(`${redirectPendingTo}?id=${caseId}`)
          return
        }

        onOpenCase(data)

        requestAnimationFrame(() => {
          const el = document.getElementById(`case-row-${caseId}`)
          el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        })

        clearCaseQuery()
      } catch {
        /* case may not exist */
      }
    })()
  }, [searchParams, onOpenCase, redirectPendingTo, router, clearCaseQuery])

  return { focusedCaseId: searchParams.get('id') }
}
