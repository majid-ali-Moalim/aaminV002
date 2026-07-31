'use client'

import useSWR from 'swr'
import Link from 'next/link'
import {
  Building2,
  Truck,
  Users,
  Activity,
  Clock,
  Loader2,
  RefreshCw,
  Radio,
  HeartPulse,
  AlertTriangle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { stationsApi } from '@/lib/stationsApi'

function StatCard({
  label,
  value,
  icon: Icon,
  accent = 'text-slate-600',
}: {
  label: string
  value: number | string
  icon: React.ElementType
  accent?: string
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
          <p className="text-2xl font-black text-slate-900 mt-1">{value}</p>
        </div>
        <div className={`p-2 rounded-xl bg-slate-50 ${accent}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  )
}

export default function StationDashboardView() {
  const { data, isLoading, mutate, isValidating } = useSWR('stations-dashboard', () =>
    stationsApi.getDashboard(),
  )

  if (isLoading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[320px] text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    )
  }

  const cards = data?.cards ?? {}
  const charts = data?.charts ?? {}

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-teal-600">Operations Center</p>
          <h1 className="text-2xl font-black text-slate-900">Stations Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">
            Local ambulance operations — dispatchers, fleet, crew, and cases by station.
          </p>
        </div>
        <Button variant="outline" onClick={() => void mutate()} disabled={isValidating}>
          <RefreshCw className={`w-4 h-4 mr-2 ${isValidating ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
        <StatCard label="Total Stations" value={cards.totalStations ?? 0} icon={Building2} accent="text-teal-600" />
        <StatCard label="Active Stations" value={cards.activeStations ?? 0} icon={Building2} accent="text-emerald-600" />
        <StatCard label="Total Ambulances" value={cards.totalAmbulances ?? 0} icon={Truck} accent="text-red-600" />
        <StatCard label="Available Ambulances" value={cards.availableAmbulances ?? 0} icon={Truck} accent="text-emerald-600" />
        <StatCard label="Busy Ambulances" value={cards.busyAmbulances ?? 0} icon={Truck} accent="text-amber-600" />
        <StatCard label="Dispatchers" value={cards.dispatchers ?? 0} icon={Radio} accent="text-indigo-600" />
        <StatCard label="Drivers" value={cards.drivers ?? 0} icon={Users} accent="text-blue-600" />
        <StatCard label="Nurses" value={cards.nurses ?? 0} icon={HeartPulse} accent="text-violet-600" />
        <StatCard label="Active Cases" value={cards.activeCases ?? 0} icon={Activity} accent="text-orange-600" />
        <StatCard label="Pending Cases" value={cards.pendingCases ?? 0} icon={Clock} accent="text-amber-600" />
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Cases Today</p>
          <p className="text-3xl font-black text-slate-900 mt-2">{charts.casesToday ?? 0}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Transfers Today</p>
          <p className="text-3xl font-black text-slate-900 mt-2">{charts.transfersToday ?? 0}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Ambulance Utilization</p>
          <p className="text-3xl font-black text-slate-900 mt-2">{charts.ambulanceUtilization ?? 0}%</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 flex flex-col justify-center">
          <Link href="/admin/stations/manage" className="text-sm font-bold text-teal-700 hover:underline">
            Manage stations →
          </Link>
          <Link href="/admin/stations/reports?tab=coverage" className="text-sm font-bold text-teal-700 hover:underline mt-2">
            Coverage map →
          </Link>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          <h2 className="text-sm font-bold text-slate-800">Station Workload (open cases)</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {(charts.stationWorkload ?? []).length === 0 ? (
            <p className="p-6 text-sm text-slate-400">No active workload data.</p>
          ) : (
            charts.stationWorkload.map((row: { id: string; name: string; activeCases: number }) => (
              <Link
                key={row.id}
                href={`/admin/stations/${row.id}`}
                className="flex items-center justify-between px-5 py-3 hover:bg-slate-50"
              >
                <span className="font-semibold text-slate-800">{row.name}</span>
                <span className="text-xs font-bold px-2 py-1 rounded-lg bg-orange-50 text-orange-700">
                  {row.activeCases} active
                </span>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
