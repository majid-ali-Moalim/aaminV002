'use client'

import useSWR from 'swr'
import Link from 'next/link'
import { Loader2, MapPin, AlertCircle } from 'lucide-react'
import { stationsApi } from '@/lib/stationsApi'

export default function StationCoverageMapView({ embedded }: { embedded?: boolean } = {}) {
  const { data, isLoading } = useSWR('stations-coverage-map', () => stationsApi.getCoverageMap())

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {!embedded && (
        <div>
          <h1 className="text-2xl font-black text-slate-900">Coverage Map</h1>
          <p className="text-sm text-slate-500">Which station covers which districts</p>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-4">
        {(data?.stations ?? []).map((station: {
          id: string
          name: string
          code?: string
          homeDistrict?: { name: string }
          coverageDistricts?: { name: string }[]
        }) => (
          <div key={station.id} className="rounded-2xl border border-slate-200 bg-white p-5">
            <Link href={`/admin/stations/${station.id}`} className="font-bold text-teal-700 hover:underline">
              {station.name}
            </Link>
            {station.code && (
              <p className="text-[10px] font-bold uppercase text-slate-400 mt-0.5">{station.code}</p>
            )}
            <div className="mt-3 font-mono text-sm text-slate-700 space-y-1">
              <p className="font-semibold text-slate-900">├── {station.homeDistrict?.name} (home)</p>
              {(station.coverageDistricts ?? []).map((d: { name: string }) => (
                <p key={d.name}>├── {d.name}</p>
              ))}
            </div>
          </div>
        ))}
      </div>

      {(data?.uncoveredDistricts ?? []).length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <div className="flex items-center gap-2 text-amber-800 font-bold mb-3">
            <AlertCircle className="w-5 h-5" />
            Uncovered districts
          </div>
          <div className="flex flex-wrap gap-2">
            {data.uncoveredDistricts.map((d: { id: string; name: string; region?: string | null }) => (
              <span
                key={d.id}
                className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-white border border-amber-200 text-amber-900"
              >
                <MapPin className="w-3 h-3 inline mr-1" />
                {d.name}
                {d.region ? ` (${d.region})` : ''}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
