'use client'

import useSWR from 'swr'
import { reportsService } from '@/lib/api'
import { UnifiedAdminDashboard } from '@/components/dashboard/UnifiedAdminDashboard'
import { Loader2 } from 'lucide-react'

export default function AdminDashboard() {
  const { data, error, mutate, isValidating } = useSWR(
    'unified-dashboard',
    () => reportsService.getUnifiedDashboard(),
    { refreshInterval: 8000, revalidateOnFocus: true },
  )

  const handleRefresh = async () => {
    await mutate()
  }

  if (error) {
    const message = error instanceof Error ? error.message : 'Failed to load dashboard'
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] rounded-2xl bg-white border border-red-100 p-10 text-center max-w-lg mx-auto">
        <p className="text-red-600 font-bold">Failed to load dashboard</p>
        <p className="text-sm text-slate-500 mt-2">{message}</p>
        <button
          onClick={handleRefresh}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-bold hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    )
  }

  if (!data || !data.summary || !data.kpis) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
        <p className="text-sm font-semibold text-slate-500">Loading dashboard…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen -m-6 p-5 sm:p-6 bg-admin-bg">
      <UnifiedAdminDashboard data={data} isRefreshing={isValidating} onRefresh={handleRefresh} />
    </div>
  )
}
