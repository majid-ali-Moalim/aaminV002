'use client'

import { useState } from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import { Loader2, Truck } from 'lucide-react'
import { stationsApi } from '@/lib/stationsApi'

export default function StationStaffView({ embedded }: { embedded?: boolean } = {}) {
  const [tab, setTab] = useState<'dispatchers' | 'drivers' | 'nurses'>('drivers')
  const { data, isLoading } = useSWR(['stations-staff', tab], () => stationsApi.getStaff(undefined, tab))

  const tabs = [
    { id: 'dispatchers' as const, label: 'Dispatchers' },
    { id: 'drivers' as const, label: 'Drivers' },
    { id: 'nurses' as const, label: 'Nurses' },
  ]

  return (
    <div className="space-y-6">
      {!embedded && (
        <div>
          <h1 className="text-2xl font-black text-slate-900">Station Staff</h1>
          <p className="text-sm text-slate-500">Employees across all stations</p>
        </div>
      )}

      <div className="flex gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-xl text-sm font-bold ${
              tab === t.id ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="text-left px-4 py-3">Employee</th>
                <th className="text-left px-4 py-3">Station</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Shift</th>
                <th className="text-left px-4 py-3">Current Mission</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(data ?? []).map((row: {
                id: string
                firstName: string
                lastName: string
                phone?: string
                shiftStatus?: string
                defaultShift?: string
                station?: { name: string }
                currentMission?: { trackingCode: string; status: string } | null
              }) => (
                <tr key={row.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-semibold text-slate-800">
                    {row.firstName} {row.lastName}
                    {row.phone && <p className="text-xs text-slate-400 font-normal">{row.phone}</p>}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{row.station?.name ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-100">{row.shiftStatus}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{row.defaultShift ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {row.currentMission ? (
                      <span>{row.currentMission.trackingCode} ({row.currentMission.status})</span>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(data ?? []).length === 0 && (
            <p className="p-8 text-center text-slate-400 text-sm">No staff found</p>
          )}
        </div>
      )}
    </div>
  )
}
