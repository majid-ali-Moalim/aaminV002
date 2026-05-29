'use client'

import { useEffect, useState } from 'react'
import { MapPin, Loader2, Truck } from 'lucide-react'
import { dispatcherDashboardApi } from '@/lib/dispatcherApi'
import { useDispatcherAccess } from '@/lib/hooks/useDispatcherAccess'

export default function DispatcherMapPage() {
  const { canOperate, loading: authLoading } = useDispatcherAccess()
  const [fleet, setFleet] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (authLoading) return
    dispatcherDashboardApi
      .getFleet()
      .then(setFleet)
      .finally(() => setLoading(false))
  }, [authLoading])

  if (authLoading || loading) {
    return <div className="flex justify-center py-24"><Loader2 className="w-10 h-10 text-red-600 animate-spin" /></div>
  }

  return (
    <div className="space-y-6 pb-20">
      <div>
        <h1 className="text-2xl font-black text-slate-900">Live Map</h1>
        <p className="text-sm text-slate-500 mt-1">Fleet positions and unit status overview</p>
      </div>

      <div className="rounded-2xl border border-red-100 bg-gradient-to-br from-red-50 to-white p-8 min-h-[280px] flex flex-col items-center justify-center text-center">
        <MapPin className="w-12 h-12 text-red-300 mb-3" />
        <p className="font-black text-slate-800">Map integration</p>
        <p className="text-sm text-slate-500 mt-1 max-w-md">
          {canOperate
            ? 'Live GPS tracking connects here. Below is your current fleet snapshot.'
            : 'Start your shift to view live operational map data.'}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {fleet.map((a) => (
          <div key={a.id} className="bg-white rounded-xl border border-slate-100 p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
              <Truck className="w-5 h-5 text-red-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm truncate">{a.ambulanceNumber}</p>
              <p className="text-xs text-slate-500 truncate">{a.location || a.station?.name || 'No location'}</p>
            </div>
            <span className="text-[10px] font-black uppercase text-red-600">{a.status}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
