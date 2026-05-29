'use client'

import AdminStubPage from '@/components/layout/AdminStubPage'
import { Calendar } from 'lucide-react'

export default function DispatcherShiftsPage() {
  return (
    <AdminStubPage
      title="Dispatcher Shifts & Availability"
      description="Plan dispatch center rosters, track on-duty dispatchers, and manage shift handovers across stations."
      icon={Calendar}
    />
  )
}
