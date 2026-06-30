'use client'

import { usePublicStats } from '@/lib/public/usePublicStats'
import { formatPublicCount } from '@/lib/public/stats'

export function HeroFleetSummary() {
  const stats = usePublicStats()
  return (
    <>
      {formatPublicCount(stats.drivers)} drivers · {formatPublicCount(stats.nurses)} nurses
    </>
  )
}

export function HeroAmbulanceSummary() {
  const stats = usePublicStats()
  return <>{formatPublicCount(stats.ambulances)} active ambulances</>
}
