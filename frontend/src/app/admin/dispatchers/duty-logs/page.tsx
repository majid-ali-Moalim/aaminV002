'use client'

import AdminStubPage from '@/components/layout/AdminStubPage'
import { FileText } from 'lucide-react'

export default function DispatcherDutyLogsPage() {
  return (
    <AdminStubPage
      title="Dispatcher Duty Logs"
      description="Audit dispatcher login sessions, shift start/end times, and console activity for compliance and staffing reports."
      icon={FileText}
    />
  )
}
