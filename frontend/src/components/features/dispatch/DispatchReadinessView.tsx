'use client'

import { useMemo, useState } from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import { format } from 'date-fns'
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ChevronRight,
  Loader2,
  RefreshCw,
  Search,
  Stethoscope,
  Truck,
  Users,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Button } from '@/components/ui/button'
import { reportsService } from '@/lib/api'
import {
  type DispatchReadinessOverview,
  READINESS_LEVEL_CONFIG,
  STATION_STATUS_CONFIG,
} from '@/lib/dispatch/readiness'

const RESOURCE_LINKS = {
  ambulances: '/admin/ambulances/availability',
  drivers: '/admin/drivers/availability',
  nurses: '/admin/nurses/availability',
} as const

export default function DispatchReadinessView() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'ready' | 'limited' | 'critical'>('all')

  const { data, isLoading, isValidating, mutate, error } = useSWR<DispatchReadinessOverview>(
    'dispatch-readiness',
    () => reportsService.getDispatchReadiness(),
    { refreshInterval: 15000, revalidateOnFocus: true },
  )

  const filteredStations = useMemo(() => {
    if (!data?.stationReadiness) return []
    const q = search.trim().toLowerCase()
    return data.stationReadiness.filter((row) => {
      if (statusFilter !== 'all' && row.status !== statusFilter) return false
      if (!q) return true
      const hay = [row.name, row.region ?? '', row.district ?? ''].join(' ').toLowerCase()
      return hay.includes(q)
    })
  }, [data?.stationReadiness, search, statusFilter])

  const summary = data?.summary
  const resources = data?.resources
  const levelCfg = summary ? READINESS_LEVEL_CONFIG[summary.readinessLevel] : null

  const resourceChart = resources
    ? [
        { name: 'Ambulances', available: resources.ambulances.available, unavailable: resources.ambulances.unavailable },
        { name: 'Drivers', available: resources.drivers.available, unavailable: resources.drivers.unavailable },
        { name: 'Nurses', available: resources.nurses.available, unavailable: resources.nurses.unavailable },
      ]
    : []

  const pieData = resources
    ? [
        { name: 'Available', value: resources.ambulances.available + resources.drivers.available + resources.nurses.available, color: '#10b981' },
        { name: 'Unavailable', value: resources.ambulances.unavailable + resources.drivers.unavailable + resources.nurses.unavailable, color: '#ef4444' },
      ]
    : []

  if (isLoading && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-slate-500">
        <Loader2 className="w-10 h-10 animate-spin text-red-500 mb-4" />
        <p className="text-sm font-semibold">Loading dispatch readiness…</p>
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-800">Failed to load readiness data</p>
            <p className="text-sm text-red-600 mt-1">Check that the backend is running and try again.</p>
            <Button variant="outline" onClick={() => mutate()} className="mt-4 rounded-xl">
              Retry
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-[1800px] mx-auto space-y-6 pb-12">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-red-600 via-red-700 to-slate-900 p-8 text-white shadow-xl">
        <div className="absolute top-0 right-0 p-8 opacity-10"><Activity className="w-32 h-32" /></div>
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-red-200 mb-2">Dispatch Operations</p>
            <h1 className="text-3xl font-black tracking-tight">Readiness Status</h1>
            <p className="text-red-100/80 mt-2 max-w-xl text-sm">
              Unified view of ambulance, driver, and nurse availability against pending and active emergency cases.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button variant="outline" onClick={() => mutate()} className="rounded-xl border-white/30 bg-white/10 text-white hover:bg-white/20">
              <RefreshCw className={`w-4 h-4 mr-2 ${isValidating ? 'animate-spin' : ''}`} /> Refresh
            </Button>
            <Link href="/admin/emergency-requests/pending">
              <Button className="rounded-xl bg-white text-red-700 hover:bg-red-50 font-bold">
                Pending Queue <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {summary && levelCfg && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
          <div className={`xl:col-span-2 rounded-2xl border p-6 shadow-sm ring-1 ${levelCfg.bg} ${levelCfg.ring}`}>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Overall Readiness</p>
            <div className="flex items-end gap-3">
              <span className={`text-5xl font-black ${levelCfg.color}`}>{summary.readinessScore}%</span>
              <span className={`text-sm font-bold px-2.5 py-1 rounded-full ${levelCfg.bg} ${levelCfg.color} ring-1 ${levelCfg.ring}`}>
                {levelCfg.label}
              </span>
            </div>
            <p className="text-sm text-slate-600 mt-2">
              Based on available ambulances, drivers, and nurses across all stations.
            </p>
          </div>
          <KpiCard label="Pending Cases" value={summary.pendingCases} icon={AlertTriangle} accent="amber" />
          <KpiCard label="Critical Open" value={summary.criticalCases} icon={AlertCircle} accent="red" />
          <KpiCard label="Active Cases" value={summary.activeCases} icon={Activity} accent="slate" />
        </div>
      )}

      {resources && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ResourceCard
            title="Ambulances"
            icon={Truck}
            counts={resources.ambulances}
            href={RESOURCE_LINKS.ambulances}
          />
          <ResourceCard
            title="Drivers"
            icon={Users}
            counts={resources.drivers}
            href={RESOURCE_LINKS.drivers}
          />
          <ResourceCard
            title="Nurses"
            icon={Stethoscope}
            counts={resources.nurses}
            href={RESOURCE_LINKS.nurses}
          />
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="text-sm font-bold text-slate-800 mb-4">Resource Availability by Type</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={resourceChart} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="available" name="Available" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="unavailable" name="Unavailable" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="text-sm font-bold text-slate-800 mb-4">Fleet & Crew Snapshot</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3}>
                  {pieData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
        <div className="p-5 border-b flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Station Readiness</h2>
            <p className="text-sm text-slate-500 mt-0.5">Per-station breakdown of dispatch-ready resources</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search station, region…"
                className="pl-9 pr-3 py-2 text-sm border rounded-xl w-56 focus:outline-none focus:ring-2 focus:ring-red-500/30"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
              className="text-sm border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500/30"
            >
              <option value="all">All statuses</option>
              <option value="ready">Ready</option>
              <option value="limited">Limited</option>
              <option value="critical">Critical</option>
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
                <th className="px-5 py-3 font-semibold">Station</th>
                <th className="px-5 py-3 font-semibold">Region / District</th>
                <th className="px-5 py-3 font-semibold text-center">Ambulances</th>
                <th className="px-5 py-3 font-semibold text-center">Drivers</th>
                <th className="px-5 py-3 font-semibold text-center">Nurses</th>
                <th className="px-5 py-3 font-semibold text-center">Score</th>
                <th className="px-5 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-400">No stations match your filters.</td>
                </tr>
              ) : (
                filteredStations.map((row) => {
                  const cfg = STATION_STATUS_CONFIG[row.status]
                  return (
                    <tr key={row.id} className="hover:bg-slate-50/80">
                      <td className="px-5 py-3.5 font-semibold text-slate-900">{row.name}</td>
                      <td className="px-5 py-3.5 text-slate-600">
                        {[row.region, row.district].filter(Boolean).join(' · ') || '—'}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span className="font-semibold text-emerald-700">{row.ambulances.available}</span>
                        <span className="text-slate-400"> / {row.ambulances.total}</span>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span className="font-semibold text-emerald-700">{row.drivers.available}</span>
                        <span className="text-slate-400"> / {row.drivers.total}</span>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span className="font-semibold text-emerald-700">{row.nurses.available}</span>
                        <span className="text-slate-400"> / {row.nurses.total}</span>
                      </td>
                      <td className="px-5 py-3.5 text-center font-bold text-slate-800">{row.readinessScore}%</td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold ${cfg.bg} ${cfg.color}`}>
                          {cfg.label}
                        </span>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
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

function KpiCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string
  value: number
  icon: typeof Activity
  accent: 'amber' | 'red' | 'slate'
}) {
  const colors = {
    amber: 'text-amber-600 bg-amber-50',
    red: 'text-red-600 bg-red-50',
    slate: 'text-slate-600 bg-slate-50',
  }[accent]

  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p>
        <div className={`p-2 rounded-xl ${colors}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <p className="text-3xl font-black text-slate-900">{value}</p>
    </div>
  )
}

function ResourceCard({
  title,
  icon: Icon,
  counts,
  href,
}: {
  title: string
  icon: typeof Truck
  counts: { total: number; available: number; unavailable: number }
  href: string
}) {
  const pct = counts.total ? Math.round((counts.available / counts.total) * 100) : 0

  return (
    <Link href={href} className="block rounded-2xl border bg-white p-5 shadow-sm hover:shadow-md hover:border-red-200 transition-all group">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-red-50 text-red-600">
            <Icon className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-slate-900">{title}</h3>
        </div>
        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-red-500 transition-colors" />
      </div>
      <div className="flex items-end justify-between">
        <div>
          <p className="text-2xl font-black text-emerald-700">{counts.available}</p>
          <p className="text-xs text-slate-500">available of {counts.total}</p>
        </div>
        <p className="text-lg font-bold text-slate-700">{pct}%</p>
      </div>
      <div className="mt-3 h-2 rounded-full bg-slate-100 overflow-hidden">
        <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
    </Link>
  )
}
