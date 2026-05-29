'use client'

import AdminStubPage from '@/components/layout/AdminStubPage'
import { BarChart2 } from 'lucide-react'

export default function DispatcherPerformancePage() {
  return (
    <AdminStubPage
      title="Dispatcher Performance"
      description="Response-time metrics, case throughput, assignment accuracy, and KPI trends for command center staff."
      icon={BarChart2}
    />
  )
}
