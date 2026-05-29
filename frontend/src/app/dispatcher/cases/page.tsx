'use client'

import { useEffect, useState } from 'react'
import { ClipboardList, Loader2 } from 'lucide-react'
import { dispatcherDashboardApi } from '@/lib/dispatcherApi'
import StatusBadge from '@/components/features/emergency/StatusBadge'
import { format } from 'date-fns'

export default function DispatcherCasesPage() {
  const [cases, setCases] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    dispatcherDashboardApi.getMyCases().then(setCases).finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="flex justify-center py-24"><Loader2 className="w-10 h-10 text-red-600 animate-spin" /></div>
  }

  return (
    <div className="space-y-6 pb-20">
      <div>
        <h1 className="text-2xl font-black text-slate-900">My Cases</h1>
        <p className="text-sm text-slate-500 mt-1">Emergency requests you have dispatched</p>
      </div>

      {cases.length === 0 ? (
        <div className="text-center py-16 rounded-2xl border border-dashed border-red-200 bg-red-50/30">
          <ClipboardList className="w-10 h-10 text-red-300 mx-auto mb-3" />
          <p className="text-slate-600 font-medium">No cases assigned to you yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {cases.map((c) => (
            <div key={c.id} className="bg-white rounded-2xl border border-red-50 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-black">{c.trackingCode}</p>
                  <p className="text-sm text-slate-600">{c.patient?.fullName}</p>
                  <p className="text-xs text-slate-500 mt-1">{c.pickupLocation}</p>
                  <p className="text-[10px] text-slate-400 mt-2">
                    {format(new Date(c.createdAt), 'MMM d, yyyy HH:mm')}
                  </p>
                </div>
                <StatusBadge status={c.status} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
