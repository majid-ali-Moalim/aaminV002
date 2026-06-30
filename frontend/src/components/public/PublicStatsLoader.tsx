'use client'

import { PublicStatsGrid } from '@/components/public/PublicStatsGrid'
import { usePublicStats } from '@/lib/public/usePublicStats'

export function PublicStatsLoader({
  variant = 'home',
}: {
  variant?: 'home' | 'about'
}) {
  const stats = usePublicStats()
  return <PublicStatsGrid stats={stats} variant={variant} />
}
