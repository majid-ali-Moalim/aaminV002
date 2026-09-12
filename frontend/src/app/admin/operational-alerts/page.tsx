'use client'

import useSWR from 'swr'
import { Loader2, RefreshCw } from 'lucide-react'
import { reportsService } from '@/lib/api'
import OperationalAlertsPanel from '@/components/shared/OperationalAlertsPanel'

export default function AdminOperationalAlertsPage() {
  const { data, isLoading, mutate, isValidating } = useSWR(
    'admin-operational-alerts',
    () => reportsService.getOperationalAlerts(),
    { refreshInterval: 15000 },
  )

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-600 mb-1">
            Operational Alerts
          </p>
          <h1 className="text-2xl font-black text-slate-900">Important alerts only</h1>
          <p className="text-sm text-slate-500 mt-1">
            System-wide critical cases, delays, and driver field reports requiring attention.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void mutate()}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold uppercase text-slate-700 hover:bg-slate-50"
        >
          <RefreshCw className={`w-4 h-4 ${isValidating ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {isLoading && !data ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-red-600" />
        </div>
      ) : (
        <OperationalAlertsPanel
          criticalCases={data?.criticalCases ?? []}
          delayedCases={data?.delayedCases ?? []}
          driverIncidents={data?.driverIncidents ?? []}
          caseHref={(id) => `/admin/emergency-requests/${id}`}
        />
      )}
    </div>
  )
}
