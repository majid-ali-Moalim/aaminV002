'use client'

import type { LucideIcon } from 'lucide-react'
import type { EmergencyRequest } from '@/types'
import EmergencyFilteredPage from '@/components/features/emergency/EmergencyFilteredPage'

type StatusEmergencyPageProps = {
  title: string
  description: string
  icon: LucideIcon
  filter: (request: EmergencyRequest) => boolean
  emptyTitle?: string
  emptyDescription?: string
  refreshMs?: number
}

export default function StatusEmergencyPage(props: StatusEmergencyPageProps) {
  return <EmergencyFilteredPage {...props} />
}
