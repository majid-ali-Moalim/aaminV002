'use client'

import { useMemo, useState } from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import { format } from 'date-fns'
import {
  AlertCircle,
  Building2,
  ChevronDown,
  ChevronRight,
  Loader2,
  MapPin,
  RefreshCw,
  Search,
  Truck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { systemSetupService } from '@/lib/api'
import {
  type CoverageOverview,
  type CoverageStatus,
  COVERAGE_STATUS_CONFIG,
} from '@/lib/system-setup/coverage'

export default function AreaStationCoverageView() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | CoverageStatus>('all')
  const [expandedRegions, setExpandedRegions] = useState<Set<string>>(new Set())
  const [expandedDistricts, setExpandedDistricts] = useState<Set<string>>(new Set())

  const { data, isLoading, isValidating, mutate, error } = useSWR<CoverageOverview>(
    'area-station-coverage',
    () => systemSetupService.getCoverage(),
    { refreshInterval: 30000, revalidateOnFocus: true },
  )

  const toggleRegion = (id: string) => {
    setExpandedRegions((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleDistrict = (id: string) => {
    setExpandedDistricts((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const filteredTree = useMemo(() => {
    if (!data?.regions) return []
    const q = search.trim().toLowerCase()

    return data.regions
      .map((region) => {
        const districts = region.districts
          .map((district) => {
            const stations = district.stations.filter((st) => {
              if (statusFilter !== 'all' && st.coverageStatus !== statusFilter) return false
              if (!q) return true
              const hay = [
                st.name,
                district.name,
                region.name,
                st.address ?? '',
              ].join(' ').toLowerCase()
              return hay.includes(q)
            })
            return { ...district, stations }
          })
          .filter((d) => d.stations.length > 0 || (!q && statusFilter === 'all'))

        if (!districts.length && q) {
          const regionMatch = region.name.toLowerCase().includes(q)
          if (!regionMatch) return null
        }

        return { ...region, districts }
      })
      .filter(Boolean) as CoverageOverview['regions']
  }, [data?.regions, search, statusFilter])

  const summary = data?.summary

  if (isLoading && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-slate-500">
        <Loader2 className="w-10 h-10 animate-spin text-red-500 mb-4" />
        <p className="text-sm font-semibold">Loading coverage map…</p>
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-800">Failed to load coverage data</p>
            <Button variant="outline" onClick={() => mutate()} className="mt-4 rounded-xl">Retry</Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-[1800px] mx-auto space-y-6 pb-12">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-800 via-slate-900 to-red-900 p-8 text-white shadow-xl">
        <div className="absolute top-0 right-0 p-8 opacity-10"><MapPin className="w-32 h-32" /></div>
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-300 mb-2">System Setup</p>
            <h1 className="text-3xl font-black tracking-tight">Area / Station Coverage</h1>
            <p className="text-slate-300/90 mt-2 max-w-xl text-sm">
              Geographic view of ambulance, driver, and nurse deployment across regions, districts, and stations.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button variant="outline" onClick={() => mutate()} className="rounded-xl border-white/30 bg-white/10 text-white hover:bg-white/20">
              <RefreshCw className={`w-4 h-4 mr-2 ${isValidating ? 'animate-spin' : ''}`} /> Refresh
            </Button>
            <Link href="/admin/system-setup/stations">
              <Button className="rounded-xl bg-white text-slate-900 hover:bg-slate-100 font-bold">
                Manage Stations <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          <SummaryCard label="Regions" value={summary.regions} icon={MapPin} />
          <SummaryCard label="Districts" value={summary.districts} icon={Building2} />
          <SummaryCard label="Stations" value={summary.stations} icon={Building2} />
          <SummaryCard label="Ambulances" value={summary.ambulances} icon={Truck} />
          <SummaryCard label="Available Units" value={summary.availableAmbulances} icon={Truck} accent="emerald" />
          <SummaryCard label="Coverage Gaps" value={summary.coverageGaps} icon={AlertCircle} accent="red" />
        </div>
      )}

      <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
        <div className="p-5 border-b flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Coverage Hierarchy</h2>
            <p className="text-sm text-slate-500 mt-0.5">Expand regions and districts to inspect station-level resources</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search region, district, station…"
                className="pl-9 pr-3 py-2 text-sm border rounded-xl w-64 focus:outline-none focus:ring-2 focus:ring-red-500/30"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
              className="text-sm border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500/30"
            >
              <option value="all">All coverage statuses</option>
              <option value="covered">Covered</option>
              <option value="limited">Limited</option>
              <option value="gap">Gap</option>
              <option value="none">No Resources</option>
            </select>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {filteredTree.length === 0 ? (
            <div className="py-16 text-center text-slate-400">No coverage data matches your filters.</div>
          ) : (
            filteredTree.map((region) => {
              const regionOpen = expandedRegions.has(region.id)
              return (
                <div key={region.id}>
                  <button
                    type="button"
                    onClick={() => toggleRegion(region.id)}
                    className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 text-left"
                  >
                    <div className="flex items-center gap-3">
                      {regionOpen ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                      <MapPin className="w-4 h-4 text-red-500" />
                      <span className="font-bold text-slate-900">{region.name}</span>
                      <span className="text-xs text-slate-500">
                        {region.totals.districts} districts · {region.totals.stations} stations · {region.totals.availableAmbulances}/{region.totals.ambulances} ambulances available
                      </span>
                    </div>
                    {region.totals.gaps > 0 && (
                      <span className="text-xs font-bold px-2 py-1 rounded-full bg-orange-100 text-orange-700">
                        {region.totals.gaps} gap{region.totals.gaps !== 1 ? 's' : ''}
                      </span>
                    )}
                  </button>

                  {regionOpen && (
                    <div className="bg-slate-50/50 border-t">
                      {region.districts.map((district) => {
                        const districtOpen = expandedDistricts.has(district.id)
                        return (
                          <div key={district.id} className="border-b border-slate-100 last:border-b-0">
                            <button
                              type="button"
                              onClick={() => toggleDistrict(district.id)}
                              className="w-full flex items-center justify-between pl-12 pr-5 py-3 hover:bg-slate-100/80 text-left"
                            >
                              <div className="flex items-center gap-2">
                                {districtOpen ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
                                <span className="font-semibold text-slate-800">{district.name}</span>
                                <span className="text-xs text-slate-500">
                                  {district.totals.stations} stations · {district.totals.availableAmbulances} avail. ambulances
                                </span>
                              </div>
                              {district.totals.gaps > 0 && (
                                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
                                  {district.totals.gaps} gap{district.totals.gaps !== 1 ? 's' : ''}
                                </span>
                              )}
                            </button>

                            {districtOpen && (
                              <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="text-left text-xs uppercase tracking-wider text-slate-500 bg-white">
                                      <th className="pl-16 pr-4 py-2 font-semibold">Station</th>
                                      <th className="px-4 py-2 font-semibold text-center">Ambulances</th>
                                      <th className="px-4 py-2 font-semibold text-center">Drivers</th>
                                      <th className="px-4 py-2 font-semibold text-center">Nurses</th>
                                      <th className="px-4 py-2 font-semibold">Status</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 bg-white">
                                    {district.stations.map((station) => {
                                      const cfg = COVERAGE_STATUS_CONFIG[station.coverageStatus]
                                      return (
                                        <tr key={station.id} className="hover:bg-slate-50/80">
                                          <td className="pl-16 pr-4 py-3">
                                            <p className="font-semibold text-slate-900">{station.name}</p>
                                            {station.address && (
                                              <p className="text-xs text-slate-500 mt-0.5 truncate max-w-xs">{station.address}</p>
                                            )}
                                          </td>
                                          <td className="px-4 py-3 text-center">
                                            <ResourceCell available={station.ambulances.available} total={station.ambulances.total} />
                                          </td>
                                          <td className="px-4 py-3 text-center">
                                            <ResourceCell available={station.drivers.available} total={station.drivers.total} />
                                          </td>
                                          <td className="px-4 py-3 text-center">
                                            <ResourceCell available={station.nurses.available} total={station.nurses.total} />
                                          </td>
                                          <td className="px-4 py-3">
                                            <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold ${cfg.bg} ${cfg.color}`}>
                                              {cfg.label}
                                            </span>
                                          </td>
                                        </tr>
                                      )
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>

        {data?.updatedAt && (
          <div className="px-5 py-3 border-t bg-slate-50 text-xs text-slate-500">
            Last updated {format(new Date(data.updatedAt), 'MMM d, yyyy HH:mm:ss')}
          </div>
        )}
      </div>
    </div>
  )
}

function SummaryCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string
  value: number
  icon: typeof MapPin
  accent?: 'emerald' | 'red'
}) {
  const iconColor = accent === 'emerald' ? 'text-emerald-600 bg-emerald-50' : accent === 'red' ? 'text-red-600 bg-red-50' : 'text-slate-600 bg-slate-50'

  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
        <div className={`p-1.5 rounded-lg ${iconColor}`}>
          <Icon className="w-3.5 h-3.5" />
        </div>
      </div>
      <p className="text-2xl font-black text-slate-900">{value}</p>
    </div>
  )
}

function ResourceCell({ available, total }: { available: number; total: number }) {
  return (
    <span>
      <span className="font-semibold text-emerald-700">{available}</span>
      <span className="text-slate-400"> / {total}</span>
    </span>
  )
}
