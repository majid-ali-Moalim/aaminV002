'use client'

import AdminStubPage from '@/components/layout/AdminStubPage'
import { ClipboardList } from 'lucide-react'

export default function DispatcherCasesPage() {
  return (
    <AdminStubPage
      title="Assigned Cases"
      description="View emergency cases assigned to each dispatcher, case load, and handoff status across active missions."
      icon={ClipboardList}
    />
  )
}
