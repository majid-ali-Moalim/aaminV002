'use client'

import { useState } from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { stationsApi } from '@/lib/stationsApi'
import PriorityBadge from '@/components/features/emergency/PriorityBadge'
import StatusBadge from '@/components/features/emergency/StatusBadge'

const STATUS_TABS = [
  { id: '', label: 'All Open' },
  { id: 'PENDING', label: 'Pending' },
  { id: 'ASSIGNED', label: 'Assigned' },
  { id: 'DISPATCHED', label: 'Dispatched' },
  { id: 'EN_ROUTE', label: 'En Route' },
  { id: 'ARRIVED_SCENE', label: 'At Scene' },
  { id: 'TRANSPORTING', label: 'Transporting' },
  { id: 'ARRIVED_HOSPITAL', label: 'Hospital' },
  { id: 'COMPLETED', label: 'Completed' },
]

export default function StationCasesView({ embedded }: { embedded?: boolean } = {}) {
  const [status, setStatus] = useState('')
  const { data, isLoading } = useSWR(['stations-cases', status], () =>
    stationsApi.getCases(status ? { status } : {}),
  )

  return (
    <div className="space-y-6">
      {!embedded && (
        <div>
          <h1 className="text-2xl font-black text-slate-900">Active Cases</h1>
          <p className="text-sm text-slate-500">Emergency requests by station</p>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.map((t) => (
          <button
            key={t.id || 'all'}
            type="button"
            onClick={() => setStatus(t.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
              status === t.id ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600'
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
        <div className="space-y-3">
          {(data ?? []).map((c: {
            id: string
            trackingCode: string
            status: string
            priority: string
            pickupLocation?: string
            station?: { name: string }
            patient?: { fullName: string }
            driver?: { firstName: string; lastName: string }
            nurse?: { firstName: string; lastName: string }
            ambulance?: { ambulanceNumber: string }
          }) => (
            <Link
              key={c.id}
              href={`/admin/emergency-requests/active?id=${c.id}`}
              className="block rounded-xl border border-slate-200 bg-white p-4 hover:border-teal-300 transition-colors"
            >
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="font-bold text-slate-900">{c.trackingCode}</span>
                <StatusBadge status={c.status} />
                <PriorityBadge priority={c.priority} />
              </div>
              <p className="text-sm text-slate-600">{c.patient?.fullName ?? 'Unknown patient'}</p>
              <p className="text-xs text-slate-400 mt-1">
                {c.station?.name} · {c.pickupLocation}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {c.ambulance?.ambulanceNumber ?? 'No ambulance'} ·{' '}
                {c.driver ? `${c.driver.firstName} ${c.driver.lastName}` : 'No driver'} ·{' '}
                {c.nurse ? `${c.nurse.firstName} ${c.nurse.lastName}` : 'No nurse'}
              </p>
            </Link>
          ))}
          {(data ?? []).length === 0 && (
            <p className="text-center py-12 text-slate-400 text-sm">No cases match this filter</p>
          )}
        </div>
      )}
    </div>
  )
}
