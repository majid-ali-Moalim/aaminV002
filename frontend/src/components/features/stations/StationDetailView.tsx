'use client'

import useSWR from 'swr'
import Link from 'next/link'
import { Loader2, Building2, Truck, Users, Activity } from 'lucide-react'
import { stationsApi } from '@/lib/stationsApi'
import StatusBadge from '@/components/features/emergency/StatusBadge'

export default function StationDetailView({ stationId }: { stationId: string }) {
  const { data, isLoading, error } = useSWR(['station-detail', stationId], () =>
    stationsApi.getById(stationId),
  )

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    )
  }

  if (error || !data) {
    return <p className="text-red-500">Station not found</p>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <div className="p-3 rounded-2xl bg-teal-50 text-teal-700">
          <Building2 className="w-8 h-8" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-slate-900">{data.name}</h1>
          <p className="text-sm text-slate-500">
            {data.region?.name} · {data.district?.name}
            {data.code ? ` · ${data.code}` : ''}
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-[10px] font-bold uppercase text-slate-400">Contact</p>
          <p className="text-sm font-semibold mt-2">{data.phone ?? '—'}</p>
          <p className="text-sm text-slate-600 mt-1">{data.address ?? '—'}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-[10px] font-bold uppercase text-slate-400">Coverage districts</p>
          <p className="text-sm mt-2">
            {(data.coverageDistricts ?? []).map((d: { name: string }) => d.name).join(', ') || 'Home district only'}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-[10px] font-bold uppercase text-slate-400">Performance</p>
          <p className="text-sm mt-2">Active: {data.performance?.activeCases ?? 0}</p>
          <p className="text-sm">Completed: {data.performance?.completedCases ?? 0}</p>
        </div>
      </div>

      <section>
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
          <Truck className="w-4 h-4" /> Fleet
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {(data.ambulances ?? []).map((a: { id: string; ambulanceNumber: string; status: string; plateNumber?: string }) => (
            <div key={a.id} className="rounded-xl border border-slate-200 p-3 bg-white">
              <p className="font-bold">{a.ambulanceNumber}</p>
              <p className="text-xs text-slate-400">{a.plateNumber}</p>
              <span className="text-[10px] font-bold uppercase mt-1 inline-block px-2 py-0.5 rounded bg-slate-100">
                {a.status}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
          <Users className="w-4 h-4" /> Staff
        </h2>
        <div className="grid md:grid-cols-3 gap-4">
          {(['dispatchers', 'drivers', 'nurses'] as const).map((role) => (
            <div key={role} className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-bold uppercase text-slate-400 mb-2">{role}</p>
              <ul className="space-y-1 text-sm">
                {(data.staff?.[role] ?? []).slice(0, 6).map((e: { id: string; firstName: string; lastName: string }) => (
                  <li key={e.id}>{e.firstName} {e.lastName}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
          <Activity className="w-4 h-4" /> Open cases
        </h2>
        <div className="space-y-2">
          {(data.emergencyRequests ?? []).map((c: { id: string; trackingCode: string; status: string }) => (
            <Link
              key={c.id}
              href={`/admin/emergency-requests/active?id=${c.id}`}
              className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 hover:border-teal-300"
            >
              <span className="font-bold">{c.trackingCode}</span>
              <StatusBadge status={c.status} />
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
