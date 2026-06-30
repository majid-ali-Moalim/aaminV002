'use client'

import { useEffect, useState } from 'react'
import {
  EMPTY_PUBLIC_STATS,
  getPublicStatsUrl,
  type PublicStats,
} from '@/lib/public/stats'

let cachedStats: PublicStats | null = null
let inflight: Promise<PublicStats> | null = null

async function loadPublicStats(): Promise<PublicStats> {
  if (cachedStats) return cachedStats
  if (inflight) return inflight

  inflight = (async () => {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)
    try {
      const res = await fetch(getPublicStatsUrl(), { signal: controller.signal })
      if (!res.ok) return EMPTY_PUBLIC_STATS
      const data = (await res.json()) as PublicStats
      cachedStats = data
      return data
    } catch {
      return EMPTY_PUBLIC_STATS
    } finally {
      clearTimeout(timeout)
      inflight = null
    }
  })()

  return inflight
}

export function usePublicStats() {
  const [stats, setStats] = useState<PublicStats>(cachedStats ?? EMPTY_PUBLIC_STATS)

  useEffect(() => {
    let active = true
    loadPublicStats().then((data) => {
      if (active) setStats(data)
    })
    return () => {
      active = false
    }
  }, [])

  return stats
}
