'use client'

import { useEffect, useState } from 'react'
import { Truck, Loader2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { dispatcherDashboardApi } from '@/lib/dispatcherApi'
import { useDispatcherAccess } from '@/lib/hooks/useDispatcherAccess'

export default function DispatcherFleetPage() {
  const { canOperate } = useDispatcherAccess()
  const [fleet, setFleet] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    dispatcherDashboardApi.getFleet().then(setFleet).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Ambulance Fleet</h1>
          <p className="text-sm text-slate-500 mt-1">All units and availability status</p>
        </div>
        <Button variant="outline" onClick={load} className="rounded-xl border-red-100 text-red-700 font-bold">
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Sync
        </Button>
      </div>

      {!canOperate && (
        <div className="rounded-xl bg-amber-50 border border-amber-100 p-4 text-sm text-amber-800">
          Read-only view. Start your shift for full dispatch controls.
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 text-red-600 animate-spin" /></div>
      ) : (
        <div className="grid gap-3">
          {fleet.map((a) => (
            <div key={a.id} className="bg-white rounded-2xl border border-red-50 p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center">
                <Truck className="w-6 h-6 text-red-600" />
              </div>
              <div className="flex-1">
                <p className="font-black text-slate-900">{a.ambulanceNumber}</p>
                <p className="text-xs text-slate-500">{a.plateNumber} · {a.station?.name || 'Unassigned station'}</p>
                <p className="text-xs text-slate-400 mt-0.5">{a.equipmentLevel?.name || 'Standard'} · Fuel {a.fuelLevel ?? '—'}%</p>
              </div>
              <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-red-50 text-red-700 border border-red-100">
                {a.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
