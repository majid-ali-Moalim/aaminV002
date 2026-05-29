'use client'

import AdminStubPage from '@/components/layout/AdminStubPage'
import { Activity } from 'lucide-react'

export default function DispatcherActivityPage() {
  return (
    <AdminStubPage
      title="Dispatch Activity"
      description="Real-time feed of dispatcher actions — assignments, status updates, escalations, and hospital coordination events."
      icon={Activity}
    />
  )
}
