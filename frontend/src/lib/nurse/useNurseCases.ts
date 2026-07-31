'use client'

import { useCallback, useEffect, useState } from 'react'
import { isOccupiedMissionStatus } from '@/components/features/emergency/missionStatusOptions'
import { nursesService } from '@/lib/api'
import { useNurseEmployee } from '@/lib/nurse/useNurseEmployee'
import { onMissionAssigned } from '@/lib/mission/missionAssignedEvents'

export function useNurseCases(pollMs = 5000) {
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
      } catch (err) {
        console.error('Failed to load nurse cases:', err)
        setCases([])
      } finally {
        setLoading(false)
      }
    },
    [nurseId],
  )

  useEffect(() => {
    load(true)
    const t = setInterval(() => load(false), pollMs)
    const unsub = onMissionAssigned(() => {
      void load(false)
    })
    return () => {
      clearInterval(t)
      unsub()
    }
  }, [load, pollMs])

  const activeCases = cases.filter((c) => isOccupiedMissionStatus(c.status))
  const primaryCase = activeCases.sort(
    (a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime(),
  )[0]

  return { nurseId, cases, activeCases, primaryCase, loading, reload: load }
}
