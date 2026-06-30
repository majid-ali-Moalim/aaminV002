'use client'

import { useCallback, useEffect, useState } from 'react'
import { nursesService } from '@/lib/api'
import { useNurseEmployee } from '@/lib/nurse/useNurseEmployee'

export function useNurseCases(pollMs = 15000) {
  const { nurseId } = useNurseEmployee()
  const [cases, setCases] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(
    async (showLoader = false) => {
      if (!nurseId) {
        setLoading(false)
        return
      }
      try {
        if (showLoader) setLoading(true)
        const data = await nursesService.getMyCases(nurseId)
        setCases(Array.isArray(data) ? data : [])
      } finally {
        setLoading(false)
      }
    },
    [nurseId],
  )

  useEffect(() => {
    load(true)
    const t = setInterval(() => load(false), pollMs)
    return () => clearInterval(t)
  }, [load, pollMs])

  const activeCases = cases.filter((c) => !['COMPLETED', 'CANCELLED'].includes(c.status))
  const primaryCase = activeCases.sort(
    (a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime(),
  )[0]

  return { nurseId, cases, activeCases, primaryCase, loading, reload: load }
}
