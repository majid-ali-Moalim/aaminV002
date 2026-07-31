'use client'

import { useMemo, useState } from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import toast from 'react-hot-toast'
import {
  Building2,
  Search,
  Loader2,
  Eye,
  Pencil,
  Power,
  Trash2,
  Plus,
  MapPin,
  Phone,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { stationsApi } from '@/lib/stationsApi'
import { systemSetupService } from '@/lib/api'

type StationRow = {
  id: string
  name: string
  code?: string | null
  region?: { name: string }
  homeDistrict?: { name: string }
  coverageDistricts?: { id: string; name: string }[]
  phone?: string | null
  isActive: boolean
  manager?: { name: string; phone?: string | null } | null
  counts: {
    ambulances: number
    drivers: number
    nurses: number
    dispatchers: number
    activeCases: number
  }
}

export default function StationsListView() {
  const [search, setSearch] = useState('')
  const { data, isLoading, mutate } = useSWR<StationRow[]>('stations-all', () => stationsApi.getAll())

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return data ?? []
    return (data ?? []).filter((s) =>
      [s.name, s.code, s.region?.name, s.homeDistrict?.name].some((x) =>
        String(x ?? '').toLowerCase().includes(q),
      ),
    )
  }, [data, search])

  const toggleActive = async (station: StationRow) => {
    try {
      await systemSetupService.updateStation(station.id, { isActive: !station.isActive })
      toast.success(station.isActive ? 'Station deactivated' : 'Station activated')
      void mutate()
    } catch {
      toast.error('Failed to update station')
    }
  }

  const deleteStation = async (station: StationRow) => {
    if (!confirm(`Deactivate station "${station.name}"?`)) return
    try {
      await systemSetupService.deleteStation(station.id)
      toast.success('Station removed')
      void mutate()
    } catch {
      toast.error('Failed to delete station')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">All Stations</h1>
          <p className="text-sm text-slate-500">Registered ambulance operations centers</p>
        </div>
        <Link href="/admin/stations/add">
          <Button className="bg-teal-600 hover:bg-teal-700">
            <Plus className="w-4 h-4 mr-2" />
            Add Station
          </Button>
        </Link>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search stations..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((station) => (
            <div
              key={station.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-bold text-slate-900">{station.name}</h3>
                  {station.code && (
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">
                      {station.code}
                    </p>
                  )}
                </div>
                <span
                  className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-lg ${
                    station.isActive
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {station.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div className="mt-3 space-y-1 text-xs text-slate-600">
                <p className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  {station.region?.name} · {station.homeDistrict?.name}
                </p>
                {station.phone && (
                  <p className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    {station.phone}
                  </p>
                )}
                {station.manager && (
                  <p className="text-slate-500">Manager: {station.manager.name}</p>
                )}
              </div>

              {station.coverageDistricts && station.coverageDistricts.length > 0 && (
                <p className="mt-2 text-[10px] text-slate-500">
                  Coverage: {station.coverageDistricts.map((d) => d.name).join(', ')}
                </p>
              )}

              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                {[
                  ['Ambulances', station.counts.ambulances],
                  ['Drivers', station.counts.drivers],
                  ['Nurses', station.counts.nurses],
                  ['Dispatchers', station.counts.dispatchers],
                  ['Active', station.counts.activeCases],
                ].map(([label, val]) => (
                  <div key={String(label)} className="rounded-lg bg-slate-50 py-2">
                    <p className="text-sm font-black text-slate-800">{val}</p>
                    <p className="text-[9px] font-bold uppercase text-slate-400">{label}</p>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Link href={`/admin/stations/${station.id}`}>
                  <Button size="sm" variant="outline">
                    <Eye className="w-3.5 h-3.5 mr-1" /> View
                  </Button>
                </Link>
                <Link href={`/admin/stations/add?edit=${station.id}`}>
                  <Button size="sm" variant="outline">
                    <Pencil className="w-3.5 h-3.5 mr-1" /> Edit
                  </Button>
                </Link>
                <Button size="sm" variant="outline" onClick={() => void toggleActive(station)}>
                  <Power className="w-3.5 h-3.5 mr-1" />
                  {station.isActive ? 'Deactivate' : 'Activate'}
                </Button>
                <Button size="sm" variant="outline" onClick={() => void deleteStation(station)}>
                  <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && filtered.length === 0 && (
        <div className="text-center py-16 text-slate-400">
          <Building2 className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>No stations found</p>
        </div>
      )}
    </div>
  )
}
