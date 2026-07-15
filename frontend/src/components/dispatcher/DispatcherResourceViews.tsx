'use client'

import { useState } from 'react'
import Link from 'next/link'
import { RefreshCw, Search, Truck, Users, Stethoscope, Activity } from 'lucide-react'
import { AmbulanceGrid, CrewGrid } from '@/components/dispatcher/DispatcherModuleShell'

type StatTile = {
  label: string
  value: number | string
  tone: 'emerald' | 'amber' | 'blue' | 'violet' | 'slate' | 'red'
}

const TONE_CLASS: Record<StatTile['tone'], string> = {
  emerald: 'bg-emerald-50 border-emerald-100 text-emerald-700',
  amber: 'bg-amber-50 border-amber-100 text-amber-700',
  blue: 'bg-blue-50 border-blue-100 text-blue-700',
  violet: 'bg-violet-50 border-violet-100 text-violet-700',
  slate: 'bg-slate-50 border-slate-100 text-slate-700',
  red: 'bg-red-50 border-red-100 text-red-700',
}

function StatTiles({ stats }: { stats: StatTile[] }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {stats.map((s) => (
        <div key={s.label} className={`rounded-2xl border p-4 ${TONE_CLASS[s.tone]}`}>
          <p className="text-2xl sm:text-3xl font-black leading-none">{s.value}</p>
          <p className="text-[10px] font-black uppercase tracking-wide mt-2 opacity-80">{s.label}</p>
        </div>
      ))}
    </div>
  )
}

function ResourceHero({
  title,
  subtitle,
  icon: Icon,
  region,
  onRefresh,
  refreshing,
}: {
  title: string
  subtitle: string
  icon: typeof Truck
  region?: string
  onRefresh?: () => void
  refreshing?: boolean
}) {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-800 via-red-700 to-red-600 p-6 sm:p-8 text-white shadow-xl">
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center shrink-0">
            <Icon className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-red-200 mb-1">
              Dispatch Resources
            </p>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight">{title}</h1>
            <p className="text-red-100/90 text-sm mt-1 max-w-xl">
              {subtitle}
              {region ? ` · ${region}` : ''}
            </p>
          </div>
        </div>
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-sm font-bold hover:bg-white/20 transition"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        )}
      </div>
    </div>
  )
}

function FilterBar({
  query,
  onQueryChange,
  placeholder,
}: {
  query: string
  onQueryChange: (v: string) => void
  placeholder: string
}) {
  return (
    <div className="relative max-w-md">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
      <input
        type="search"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-10 pl-9 pr-4 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-800 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
      />
    </div>
  )
}

function Panel({
  title,
  count,
  children,
  empty,
}: {
  title: string
  count?: number
  children: React.ReactNode
  empty?: string
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
        <h2 className="text-xs font-black uppercase tracking-widest text-slate-700">{title}</h2>
        {count != null && (
          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-red-100 text-red-700">
            {count}
          </span>
        )}
      </div>
      <div className="p-5">{empty ? <p className="text-sm text-slate-400 text-center py-8">{empty}</p> : children}</div>
    </div>
  )
}

export function AmbulanceAvailabilityView({
  data,
  region,
  onRefresh,
  refreshing,
}: {
  data: {
    available?: { items?: unknown[] }
    busy?: { items?: unknown[] }
    maintenance?: { items?: unknown[] }
    all?: { items?: unknown[] }
    items?: unknown[]
  }
  region?: string
  onRefresh?: () => void
  refreshing?: boolean
}) {
  const [query, setQuery] = useState('')
  const avail = (data.available?.items ?? data.items ?? []) as Record<string, unknown>[]
  const busy = (data.busy?.items ?? []) as Record<string, unknown>[]
  const maint = (data.maintenance?.items ?? []) as Record<string, unknown>[]
  const total = (data.all?.items ?? []).length

  const filterList = (list: Record<string, unknown>[]) => {
    const q = query.trim().toLowerCase()
    if (!q) return list
    return list.filter((a) =>
      `${a.ambulanceNumber ?? ''} ${a.plateNumber ?? ''} ${a.location ?? ''}`.toLowerCase().includes(q),
    )
  }

  return (
    <div className="space-y-5">
      <ResourceHero
        title="Ambulance Availability"
        subtitle="Regional fleet readiness — available units ready for dispatch"
        icon={Truck}
        region={region}
        onRefresh={onRefresh}
        refreshing={refreshing}
      />
      <StatTiles
        stats={[
          { label: 'Available', value: avail.length, tone: 'emerald' },
          { label: 'On Duty', value: busy.length, tone: 'amber' },
          { label: 'Maintenance', value: maint.length, tone: 'red' },
          { label: 'Total Fleet', value: total, tone: 'slate' },
        ]}
      />
      <FilterBar query={query} onQueryChange={setQuery} placeholder="Search ambulance number or plate…" />
      <Panel title="Ready to Dispatch" count={filterList(avail).length} empty={!filterList(avail).length ? 'No ambulances available in your region' : undefined}>
        <AmbulanceGrid items={filterList(avail)} />
      </Panel>
      {busy.length > 0 && (
        <Panel title="On Active Mission" count={filterList(busy).length}>
          <AmbulanceGrid items={filterList(busy)} />
        </Panel>
      )}
      {maint.length > 0 && (
        <Panel title="Maintenance / Offline" count={filterList(maint).length}>
          <AmbulanceGrid items={filterList(maint)} />
        </Panel>
      )}
    </div>
  )
}

export function DriverAvailabilityView({
  items,
  onMissionItems,
  stats,
  region,
  onRefresh,
  refreshing,
}: {
  items: Record<string, unknown>[]
  onMissionItems: Record<string, unknown>[]
  stats: { total?: number; available?: number; onMission?: number; offDuty?: number }
  region?: string
  onRefresh?: () => void
  refreshing?: boolean
}) {
  const [query, setQuery] = useState('')

  const filterCrew = (list: Record<string, unknown>[]) => {
    const q = query.trim().toLowerCase()
    if (!q) return list
    return list.filter((e) =>
      `${e.firstName ?? ''} ${e.lastName ?? ''} ${e.employeeCode ?? ''}`.toLowerCase().includes(q),
    )
  }

  return (
    <div className="space-y-5">
      <ResourceHero
        title="Driver Availability"
        subtitle="On-shift drivers in your region — assign to active missions"
        icon={Users}
        region={region}
        onRefresh={onRefresh}
        refreshing={refreshing}
      />
      <StatTiles
        stats={[
          { label: 'Available', value: stats.available ?? items.length, tone: 'emerald' },
          { label: 'On Mission', value: stats.onMission ?? onMissionItems.length, tone: 'blue' },
          { label: 'Off Duty', value: stats.offDuty ?? 0, tone: 'slate' },
          { label: 'Total Drivers', value: stats.total ?? items.length, tone: 'violet' },
        ]}
      />
      <FilterBar query={query} onQueryChange={setQuery} placeholder="Search driver name or ID…" />
      <Panel title="Available Drivers" count={filterCrew(items).length} empty={!filterCrew(items).length ? 'No drivers available' : undefined}>
        <CrewGrid items={filterCrew(items)} />
      </Panel>
      {onMissionItems.length > 0 && (
        <Panel title="Drivers On Mission" count={filterCrew(onMissionItems).length}>
          <CrewGrid items={filterCrew(onMissionItems)} />
        </Panel>
      )}
    </div>
  )
}

export function NurseAvailabilityView({
  items,
  onMissionItems,
  stats,
  region,
  onRefresh,
  refreshing,
}: {
  items: Record<string, unknown>[]
  onMissionItems: Record<string, unknown>[]
  stats: { total?: number; available?: number; onMission?: number; offDuty?: number }
  region?: string
  onRefresh?: () => void
  refreshing?: boolean
}) {
  const [query, setQuery] = useState('')

  const filterCrew = (list: Record<string, unknown>[]) => {
    const q = query.trim().toLowerCase()
    if (!q) return list
    return list.filter((e) =>
      `${e.firstName ?? ''} ${e.lastName ?? ''} ${e.employeeCode ?? ''}`.toLowerCase().includes(q),
    )
  }

  return (
    <div className="space-y-5">
      <ResourceHero
        title="Nurse Availability"
        subtitle="Clinical crew readiness for emergency and transport missions"
        icon={Stethoscope}
        region={region}
        onRefresh={onRefresh}
        refreshing={refreshing}
      />
      <StatTiles
        stats={[
          { label: 'Available', value: stats.available ?? items.length, tone: 'emerald' },
          { label: 'On Mission', value: stats.onMission ?? onMissionItems.length, tone: 'blue' },
          { label: 'Off Duty', value: stats.offDuty ?? 0, tone: 'slate' },
          { label: 'Total Nurses', value: stats.total ?? items.length, tone: 'violet' },
        ]}
      />
      <FilterBar query={query} onQueryChange={setQuery} placeholder="Search nurse name or ID…" />
      <Panel title="Available Nurses" count={filterCrew(items).length} empty={!filterCrew(items).length ? 'No nurses available' : undefined}>
        <CrewGrid items={filterCrew(items)} />
      </Panel>
      {onMissionItems.length > 0 && (
        <Panel title="Nurses On Mission" count={filterCrew(onMissionItems).length}>
          <CrewGrid items={filterCrew(onMissionItems)} />
        </Panel>
      )}
    </div>
  )
}

export function ResourceStatusView({
  ambulances,
  drivers,
  nurses,
  region,
  onRefresh,
  refreshing,
}: {
  ambulances: Record<string, unknown>[]
  drivers: Record<string, unknown>[]
  nurses: Record<string, unknown>[]
  region?: string
  onRefresh?: () => void
  refreshing?: boolean
}) {
  const availableAmb = ambulances.filter((a) => a.status === 'AVAILABLE').length
  const busyAmb = ambulances.filter((a) => a.status === 'ON_DUTY').length
  const availDrivers = drivers.filter((d) => ['AVAILABLE', 'ON_DUTY'].includes(String(d.shiftStatus))).length
  const availNurses = nurses.filter((n) => ['AVAILABLE', 'ON_DUTY'].includes(String(n.shiftStatus))).length

  return (
    <div className="space-y-5">
      <ResourceHero
        title="Resource Status"
        subtitle="Unified operational snapshot — fleet and crew across your region"
        icon={Activity}
        region={region}
        onRefresh={onRefresh}
        refreshing={refreshing}
      />
      <StatTiles
        stats={[
          { label: 'Ambulances Ready', value: availableAmb, tone: 'emerald' },
          { label: 'Ambulances On Duty', value: busyAmb, tone: 'amber' },
          { label: 'Drivers Ready', value: availDrivers, tone: 'blue' },
          { label: 'Nurses Ready', value: availNurses, tone: 'violet' },
        ]}
      />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { href: '/dispatcher/resources/ambulance-availability', label: 'Ambulance Board', icon: Truck },
          { href: '/dispatcher/resources/driver-availability', label: 'Driver Board', icon: Users },
          { href: '/dispatcher/resources/nurse-availability', label: 'Nurse Board', icon: Stethoscope },
        ].map((link) => {
          const Icon = link.icon
          return (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center gap-3 p-4 rounded-2xl border border-slate-200 bg-white hover:border-red-200 hover:shadow-sm transition"
            >
              <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-sm font-bold text-slate-800">{link.label}</span>
            </Link>
          )
        })}
      </div>
      <Panel title="Fleet Status" count={ambulances.length} empty={!ambulances.length ? 'No ambulances in region' : undefined}>
        <AmbulanceGrid items={ambulances} />
      </Panel>
      <div className="grid md:grid-cols-2 gap-5">
        <Panel title="Drivers" count={drivers.length} empty={!drivers.length ? 'No drivers' : undefined}>
          <CrewGrid items={drivers.slice(0, 12)} />
        </Panel>
        <Panel title="Nurses" count={nurses.length} empty={!nurses.length ? 'No nurses' : undefined}>
          <CrewGrid items={nurses.slice(0, 12)} />
        </Panel>
      </div>
    </div>
  )
}