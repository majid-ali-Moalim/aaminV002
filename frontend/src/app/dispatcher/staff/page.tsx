'use client'

import { useEffect, useState } from 'react'
import { Users, Loader2 } from 'lucide-react'
import { dispatcherDashboardApi } from '@/lib/dispatcherApi'

export default function DispatcherStaffPage() {
  const [staff, setStaff] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    dispatcherDashboardApi.getStaff().then(setStaff).finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="flex justify-center py-24"><Loader2 className="w-10 h-10 text-red-600 animate-spin" /></div>
  }

  const groups = [
    { key: 'drivers', label: 'Drivers', items: staff?.drivers ?? [] },
    { key: 'nurses', label: 'Nurses', items: staff?.nurses ?? [] },
    { key: 'dispatchers', label: 'Dispatchers', items: staff?.dispatchers ?? [] },
  ]

  return (
    <div className="space-y-8 pb-20">
      <div>
        <h1 className="text-2xl font-black text-slate-900">Field Staff</h1>
        <p className="text-sm text-slate-500 mt-1">Drivers, nurses, and dispatch team availability</p>
      </div>

      {groups.map((g) => (
        <section key={g.key}>
          <h2 className="text-xs font-black uppercase tracking-widest text-red-600 mb-3 flex items-center gap-2">
            <Users className="w-4 h-4" />
            {g.label} ({g.items.length})
          </h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {g.items.map((e: any) => (
              <div key={e.id} className="bg-white rounded-xl border border-slate-100 p-4">
                <p className="font-bold text-slate-900">{e.firstName} {e.lastName}</p>
                <p className="text-xs text-slate-500">{e.employeeCode} · {e.station?.name || '—'}</p>
                <span className="inline-block mt-2 text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-red-50 text-red-700">
                  {e.shiftStatus}
                </span>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
