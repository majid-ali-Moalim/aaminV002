'use client'

import useSWR from 'swr'
import { Loader2, BarChart2 } from 'lucide-react'
import { stationsApi } from '@/lib/stationsApi'

export default function StationPerformanceView({ embedded }: { embedded?: boolean } = {}) {
  const { data, isLoading } = useSWR('stations-performance', () => stationsApi.getPerformance())

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    )
  }

  const cases = data?.cases ?? {}
  const transfers = data?.transfers ?? {}

  return (
    <div className="space-y-6">
      {!embedded && (
        <div>
          <h1 className="text-2xl font-black text-slate-900">Station Performance</h1>
          <p className="text-sm text-slate-500">Network-wide KPIs across all stations</p>
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Cases', value: cases.total ?? 0 },
          { label: 'Completed', value: cases.completed ?? 0 },
          { label: 'Cancelled', value: cases.cancelled ?? 0 },
          { label: 'Completion Rate', value: `${cases.completionRate ?? 0}%` },
          { label: 'Transfers In', value: transfers.in ?? 0 },
          { label: 'Transfers Out', value: transfers.out ?? 0 },
        ].map((kpi) => (
          <div key={kpi.label} className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center gap-2 text-slate-400 mb-2">
              <BarChart2 className="w-4 h-4" />
              <p className="text-[10px] font-bold uppercase tracking-wider">{kpi.label}</p>
            </div>
            <p className="text-3xl font-black text-slate-900">{kpi.value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
