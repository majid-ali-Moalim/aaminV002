'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  RefreshCw,
  Search,
  Truck,
  Users,
  Stethoscope,
  Activity,
  LayoutGrid,
  List,
  ArrowRightLeft,
  Clock,
  ChevronRight,
  MapPin,
} from 'lucide-react'
import { AmbulanceGrid, CrewGrid } from '@/components/dispatcher/DispatcherModuleShell'
import {
  RESOURCE_STATUS_TABS,
  CREW_RESOURCE_STATUS_TABS,
  buildStationSummaries,
  matchesStation,
  statusBadgeClass,
  type ResourceStatusTab,
  type StationOption,
} from '@/lib/dispatcher/resourceBoardUtils'

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

type ViewMode = 'grid' | 'table'

function StatTiles({ stats }: { stats: StatTile[] }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {stats.map((s) => (
        <div key={s.label} className={`rounded-2xl border p-4 transition-shadow hover:shadow-sm ${TONE_CLASS[s.tone]}`}>
          <p className="text-2xl sm:text-3xl font-black leading-none">{s.value}</p>
          <p className="text-[10px] font-black uppercase tracking-wide mt-2 opacity-80">{s.label}</p>
        </div>
      ))}
    </div>
  )
}

function QuickLinks() {
  return (
    <div className="flex flex-wrap gap-2">
      {[
        { href: '/dispatcher/emergency-requests/pending', label: 'Pending queue', icon: Clock },
        { href: '/dispatcher/resources/resource-status', label: 'Compare stations', icon: Activity },
        { href: '/dispatcher/emergency-requests/pending', label: 'Transfer case', icon: ArrowRightLeft },
      ].map((link) => {
        const Icon = link.icon
        return (
          <Link
            key={link.href + link.label}
            href={link.href}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:border-red-200 hover:text-red-700 transition"
          >
            <Icon className="w-3.5 h-3.5" />
            {link.label}
            <ChevronRight className="w-3 h-3 opacity-50" />
          </Link>
        )
      })}
    </div>
  )
}

function StationCapacityStrip({
  summaries,
  selectedId,
  onSelect,
}: {
  summaries: ReturnType<typeof buildStationSummaries>
  selectedId: string
  onSelect: (id: string) => void
}) {
  if (!summaries.length) return null
  return (
    <div className="space-y-2">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
        Station capacity overview
      </p>
      <div className="flex gap-3 overflow-x-auto pb-1 snap-x">
        <button
          type="button"
          onClick={() => onSelect('')}
          className={`snap-start shrink-0 min-w-[160px] rounded-2xl border p-4 text-left transition ${
            !selectedId
              ? 'border-red-400 bg-red-50 shadow-sm ring-2 ring-red-100'
              : 'border-slate-200 bg-white hover:border-red-200'
          }`}
        >
          <p className="text-xs font-black text-slate-800">All stations</p>
          <p className="text-[10px] text-slate-500 mt-1">Regional view</p>
        </button>
        {summaries.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => onSelect(s.id)}
            className={`snap-start shrink-0 min-w-[180px] rounded-2xl border p-4 text-left transition ${
              selectedId === s.id
                ? 'border-red-400 bg-red-50 shadow-sm ring-2 ring-red-100'
                : 'border-slate-200 bg-white hover:border-red-200'
            }`}
          >
            <p className="text-xs font-black text-slate-800 flex items-center gap-1">
              <MapPin className="w-3 h-3 text-red-500" />
              {s.name}
              {s.isHome && (
                <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-red-100 text-red-700">
                  You
                </span>
              )}
            </p>
            <p className="text-[10px] text-slate-600 mt-2">
              Amb {s.availableAmb} ready · Drv {s.availableDrivers} · Nrs {s.availableNurses}
            </p>
          </button>
        ))}
      </div>
    </div>
  )
}

function ResourceToolbar({
  query,
  onQueryChange,
  placeholder,
  stations,
  stationId,
  onStationChange,
  homeStationId,
  statusTab,
  onStatusTabChange,
  viewMode,
  onViewModeChange,
  lastUpdated,
  statusTabs,
}: {
  query: string
  onQueryChange: (v: string) => void
  placeholder: string
  stations: StationOption[]
  stationId: string
  onStationChange: (v: string) => void
  homeStationId?: string | null
  statusTab: ResourceStatusTab
  onStatusTabChange: (v: ResourceStatusTab) => void
  viewMode: ViewMode
  onViewModeChange: (v: ViewMode) => void
  lastUpdated?: string
  statusTabs?: typeof RESOURCE_STATUS_TABS
}) {
  const tabs = statusTabs ?? RESOURCE_STATUS_TABS
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-4 shadow-sm">
      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder={placeholder}
            className="w-full h-11 pl-9 pr-4 rounded-xl border border-slate-200 bg-slate-50 text-sm font-medium text-slate-800 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
          />
        </div>
        {stations.length > 0 && (
          <select
            value={stationId}
            onChange={(e) => onStationChange(e.target.value)}
            className="h-11 min-w-[220px] rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
          >
            <option value="">All stations in region</option>
            {stations.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
                {homeStationId === s.id ? ' (your station)' : ''}
              </option>
            ))}
          </select>
        )}
        <div className="flex rounded-xl border border-slate-200 p-1 bg-slate-50 shrink-0">
          <button
            type="button"
            onClick={() => onViewModeChange('grid')}
            className={`p-2 rounded-lg ${viewMode === 'grid' ? 'bg-white shadow text-red-600' : 'text-slate-500'}`}
            aria-label="Grid view"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange('table')}
            className={`p-2 rounded-lg ${viewMode === 'table' ? 'bg-white shadow text-red-600' : 'text-slate-500'}`}
            aria-label="Table view"
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onStatusTabChange(tab.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition ${
              statusTab === tab.id
                ? 'bg-red-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
        {lastUpdated && (
          <span className="text-[10px] text-slate-400 ml-auto font-medium">
            Updated {lastUpdated}
          </span>
        )}
      </div>
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
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-red-700 p-6 sm:p-8 text-white shadow-xl">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.08),transparent_50%)]" />
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center shrink-0 ring-1 ring-white/20">
            <Icon className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-red-200 mb-1">
              Resource Operations Center
            </p>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight">{title}</h1>
            <p className="text-red-100/90 text-sm mt-1 max-w-2xl leading-relaxed">
              {subtitle}
              {region ? ` · ${region}` : ''}
            </p>
          </div>
        </div>
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-sm font-bold hover:bg-white/20 transition shrink-0"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh data
          </button>
        )}
      </div>
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
      <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between">
        <h2 className="text-xs font-black uppercase tracking-widest text-slate-700">{title}</h2>
        {count != null && (
          <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-red-100 text-red-700">
            {count}
          </span>
        )}
      </div>
      <div className="p-5">{empty ? <p className="text-sm text-slate-400 text-center py-10">{empty}</p> : children}</div>
    </div>
  )
}

function AmbulanceTable({ items }: { items: Record<string, unknown>[] }) {
  if (!items.length) return null
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-100">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[10px] font-black uppercase tracking-wider text-slate-400 bg-slate-50 border-b border-slate-100">
            <th className="px-4 py-3">Unit</th>
            <th className="px-4 py-3">Plate</th>
            <th className="px-4 py-3">Station</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Mission</th>
          </tr>
        </thead>
        <tbody>
          {items.map((a) => (
            <tr key={String(a.id)} className="border-b border-slate-50 last:border-0 hover:bg-red-50/30">
              <td className="px-4 py-3 font-bold text-slate-900">{String(a.ambulanceNumber ?? '—')}</td>
              <td className="px-4 py-3 text-slate-600">{String(a.plateNumber ?? '—')}</td>
              <td className="px-4 py-3 text-slate-600">{(a.station as { name?: string })?.name ?? '—'}</td>
              <td className="px-4 py-3">
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${statusBadgeClass(String(a.status ?? ''))}`}>
                  {String(a.status ?? '—').replace(/_/g, ' ')}
                </span>
              </td>
              <td className="px-4 py-3 text-xs text-red-600 font-semibold">
                {(a.currentMission as { trackingCode?: string })?.trackingCode ?? '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function CrewTable({ items }: { items: Record<string, unknown>[] }) {
  if (!items.length) return null
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-100">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[10px] font-black uppercase tracking-wider text-slate-400 bg-slate-50 border-b border-slate-100">
            <th className="px-4 py-3">Name</th>
            <th className="px-4 py-3">Code</th>
            <th className="px-4 py-3">Station</th>
            <th className="px-4 py-3">Availability</th>
            <th className="px-4 py-3">Employment</th>
            <th className="px-4 py-3">Mission</th>
          </tr>
        </thead>
        <tbody>
          {items.map((e) => (
            <tr key={String(e.id)} className="border-b border-slate-50 last:border-0 hover:bg-red-50/30">
              <td className="px-4 py-3 font-bold text-slate-900">
                {`${e.firstName ?? ''} ${e.lastName ?? ''}`.trim() || '—'}
              </td>
              <td className="px-4 py-3 text-slate-600">{String(e.employeeCode ?? '—')}</td>
              <td className="px-4 py-3 text-slate-600">{(e.station as { name?: string })?.name ?? '—'}</td>
              <td className="px-4 py-3">
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                  e.operationalStatus === 'available'
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                    : 'bg-red-100 text-red-800 border-red-200'
                }`}>
                  {e.operationalStatus === 'available' ? 'Available' : 'Unavailable'}
                </span>
                {e.unavailableReason ? (
                  <p className="text-[10px] text-slate-500 mt-1 max-w-[180px]">{String(e.unavailableReason)}</p>
                ) : null}
              </td>
              <td className="px-4 py-3">
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border bg-slate-100 text-slate-700 border-slate-200">
                  {String((e as { employmentStatus?: string }).employmentStatus ?? e.status ?? '—')}
                </span>
              </td>
              <td className="px-4 py-3 text-xs text-red-600 font-semibold">
                {(e.currentMission as { trackingCode?: string })?.trackingCode
                  ?? (e.currentCase as { trackingCode?: string })?.trackingCode
                  ?? '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function useResourceFilters(
  lists: { available: Record<string, unknown>[]; busy: Record<string, unknown>[]; offline: Record<string, unknown>[]; all: Record<string, unknown>[] },
  searchFields: (item: Record<string, unknown>) => string,
) {
  const [query, setQuery] = useState('')
  const [stationId, setStationId] = useState('')
  const [statusTab, setStatusTab] = useState<ResourceStatusTab>('available')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')

  const baseList = useMemo(() => {
    switch (statusTab) {
      case 'busy':
        return lists.busy
      case 'offline':
        return lists.offline
      case 'all':
        return lists.all
      default:
        return lists.available
    }
  }, [statusTab, lists])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return baseList.filter((item) => {
      if (stationId && !matchesStation(item, stationId)) return false
      if (!q) return true
      return searchFields(item).toLowerCase().includes(q)
    })
  }, [baseList, query, stationId, searchFields])

  return {
    query,
    setQuery,
    stationId,
    setStationId,
    statusTab,
    setStatusTab,
    viewMode,
    setViewMode,
    filtered,
  }
}

export function AmbulanceAvailabilityView({
  data,
  region,
  stations = [],
  homeStationId,
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
  stations?: StationOption[]
  homeStationId?: string | null
  onRefresh?: () => void
  refreshing?: boolean
}) {
  const avail = (data.available?.items ?? data.items ?? []) as Record<string, unknown>[]
  const busy = (data.busy?.items ?? []) as Record<string, unknown>[]
  const maint = (data.maintenance?.items ?? []) as Record<string, unknown>[]
  const all = (data.all?.items ?? []) as Record<string, unknown>[]

  const offline = [...maint, ...all.filter((a) => !['AVAILABLE', 'ON_DUTY'].includes(String(a.status)))]
  const lists = { available: avail, busy, offline, all }

  const filters = useResourceFilters(lists, (a) =>
    `${a.ambulanceNumber ?? ''} ${a.plateNumber ?? ''} ${(a.station as { name?: string })?.name ?? ''}`,
  )

  const summaries = buildStationSummaries(stations, all, [], [], homeStationId)

  return (
    <div className="space-y-5">
      <ResourceHero
        title="Ambulance Availability"
        subtitle="Professional fleet board — filter by station, compare readiness, and decide where to route overflow cases"
        icon={Truck}
        region={region}
        onRefresh={onRefresh}
        refreshing={refreshing}
      />
      <QuickLinks />
      <StatTiles
        stats={[
          { label: 'Available', value: avail.length, tone: 'emerald' },
          { label: 'On Mission', value: busy.length, tone: 'amber' },
          { label: 'Maintenance', value: maint.length, tone: 'red' },
          { label: 'Total Fleet', value: all.length, tone: 'slate' },
        ]}
      />
      <StationCapacityStrip
        summaries={summaries}
        selectedId={filters.stationId}
        onSelect={filters.setStationId}
      />
      <ResourceToolbar
        query={filters.query}
        onQueryChange={filters.setQuery}
        placeholder="Search unit, plate, or station…"
        stations={stations}
        stationId={filters.stationId}
        onStationChange={filters.setStationId}
        homeStationId={homeStationId}
        statusTab={filters.statusTab}
        onStatusTabChange={filters.setStatusTab}
        viewMode={filters.viewMode}
        onViewModeChange={filters.setViewMode}
        lastUpdated={new Date().toLocaleTimeString()}
      />
      <Panel
        title="Ambulance units"
        count={filters.filtered.length}
        empty={!filters.filtered.length ? 'No ambulances match your filters' : undefined}
      >
        {filters.viewMode === 'table' ? (
          <AmbulanceTable items={filters.filtered} />
        ) : (
          <AmbulanceGrid items={filters.filtered} />
        )}
      </Panel>
    </div>
  )
}

export function DriverAvailabilityView({
  items,
  onMissionItems,
  stats,
  region,
  stations = [],
  homeStationId,
  onRefresh,
  refreshing,
}: {
  items: Record<string, unknown>[]
  onMissionItems: Record<string, unknown>[]
  stats: { total?: number; available?: number; onMission?: number; offDuty?: number; absent?: number }
  region?: string
  stations?: StationOption[]
  homeStationId?: string | null
  onRefresh?: () => void
  refreshing?: boolean
}) {
  const all = useMemo(() => {
    const map = new Map<string, Record<string, unknown>>()
    ;[...items, ...onMissionItems].forEach((e) => map.set(String(e.id), e))
    return [...map.values()]
  }, [items, onMissionItems])

  const absent = useMemo(
    () => all.filter((e) => e.attendanceStatus === 'absent'),
    [all],
  )
  const lists = { available: items, busy: onMissionItems, offline: absent, all }

  const filters = useResourceFilters(lists, (e) =>
    `${e.firstName ?? ''} ${e.lastName ?? ''} ${e.employeeCode ?? ''} ${(e.station as { name?: string })?.name ?? ''}`,
  )

  const summaries = buildStationSummaries(stations, [], all, [], homeStationId)

  return (
    <div className="space-y-5">
      <ResourceHero
        title="Driver Availability"
        subtitle="Available means marked present today and not on an open case. Unavailable means absent or on case."
        icon={Users}
        region={region}
        onRefresh={onRefresh}
        refreshing={refreshing}
      />
      <QuickLinks />
      <StatTiles
        stats={[
          { label: 'Available', value: stats.available ?? items.length, tone: 'emerald' },
          { label: 'On Case', value: stats.onMission ?? onMissionItems.length, tone: 'blue' },
          { label: 'Absent', value: stats.absent ?? stats.offDuty ?? absent.length, tone: 'slate' },
          { label: 'Total Drivers', value: stats.total ?? all.length, tone: 'violet' },
        ]}
      />
      <StationCapacityStrip
        summaries={summaries}
        selectedId={filters.stationId}
        onSelect={filters.setStationId}
      />
      <ResourceToolbar
        query={filters.query}
        onQueryChange={filters.setQuery}
        placeholder="Search driver name, ID, or station…"
        stations={stations}
        stationId={filters.stationId}
        onStationChange={filters.setStationId}
        homeStationId={homeStationId}
        statusTab={filters.statusTab}
        onStatusTabChange={filters.setStatusTab}
        viewMode={filters.viewMode}
        onViewModeChange={filters.setViewMode}
        lastUpdated={new Date().toLocaleTimeString()}
        statusTabs={CREW_RESOURCE_STATUS_TABS}
      />
      <Panel
        title="Drivers"
        count={filters.filtered.length}
        empty={!filters.filtered.length ? 'No drivers match your filters' : undefined}
      >
        {filters.viewMode === 'table' ? (
          <CrewTable items={filters.filtered} />
        ) : (
          <CrewGrid items={filters.filtered} />
        )}
      </Panel>
    </div>
  )
}

export function NurseAvailabilityView({
  items,
  onMissionItems,
  stats,
  region,
  stations = [],
  homeStationId,
  onRefresh,
  refreshing,
}: {
  items: Record<string, unknown>[]
  onMissionItems: Record<string, unknown>[]
  stats: { total?: number; available?: number; onMission?: number; offDuty?: number; absent?: number }
  region?: string
  stations?: StationOption[]
  homeStationId?: string | null
  onRefresh?: () => void
  refreshing?: boolean
}) {
  const all = useMemo(() => {
    const map = new Map<string, Record<string, unknown>>()
    ;[...items, ...onMissionItems].forEach((e) => map.set(String(e.id), e))
    return [...map.values()]
  }, [items, onMissionItems])

  const absent = useMemo(
    () => all.filter((e) => e.attendanceStatus === 'absent'),
    [all],
  )
  const lists = { available: items, busy: onMissionItems, offline: absent, all }

  const filters = useResourceFilters(lists, (e) =>
    `${e.firstName ?? ''} ${e.lastName ?? ''} ${e.employeeCode ?? ''} ${(e.station as { name?: string })?.name ?? ''}`,
  )

  const summaries = buildStationSummaries(stations, [], [], all, homeStationId)

  return (
    <div className="space-y-5">
      <ResourceHero
        title="Nurse Availability"
        subtitle="Available means marked present today and not on an open case. Unavailable means absent or on case."
        icon={Stethoscope}
        region={region}
        onRefresh={onRefresh}
        refreshing={refreshing}
      />
      <QuickLinks />
      <StatTiles
        stats={[
          { label: 'Available', value: stats.available ?? items.length, tone: 'emerald' },
          { label: 'On Case', value: stats.onMission ?? onMissionItems.length, tone: 'blue' },
          { label: 'Absent', value: stats.absent ?? stats.offDuty ?? absent.length, tone: 'slate' },
          { label: 'Total Nurses', value: stats.total ?? all.length, tone: 'violet' },
        ]}
      />
      <StationCapacityStrip
        summaries={summaries}
        selectedId={filters.stationId}
        onSelect={filters.setStationId}
      />
      <ResourceToolbar
        query={filters.query}
        onQueryChange={filters.setQuery}
        placeholder="Search nurse name, ID, or station…"
        stations={stations}
        stationId={filters.stationId}
        onStationChange={filters.setStationId}
        homeStationId={homeStationId}
        statusTab={filters.statusTab}
        onStatusTabChange={filters.setStatusTab}
        viewMode={filters.viewMode}
        onViewModeChange={filters.setViewMode}
        lastUpdated={new Date().toLocaleTimeString()}
        statusTabs={CREW_RESOURCE_STATUS_TABS}
      />
      <Panel
        title="Nurses"
        count={filters.filtered.length}
        empty={!filters.filtered.length ? 'No nurses match your filters' : undefined}
      >
        {filters.viewMode === 'table' ? (
          <CrewTable items={filters.filtered} />
        ) : (
          <CrewGrid items={filters.filtered} />
        )}
      </Panel>
    </div>
  )
}

export function ResourceStatusView({
  ambulances,
  drivers,
  nurses,
  region,
  stations = [],
  homeStationId,
  onRefresh,
  refreshing,
}: {
  ambulances: Record<string, unknown>[]
  drivers: Record<string, unknown>[]
  nurses: Record<string, unknown>[]
  region?: string
  stations?: StationOption[]
  homeStationId?: string | null
  onRefresh?: () => void
  refreshing?: boolean
}) {
  const [stationId, setStationId] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')

  const filterByStation = (list: Record<string, unknown>[]) =>
    stationId ? list.filter((item) => matchesStation(item, stationId)) : list

  const filteredAmbulances = filterByStation(ambulances)
  const filteredDrivers = filterByStation(drivers)
  const filteredNurses = filterByStation(nurses)

  const summaries = buildStationSummaries(stations, ambulances, drivers, nurses, homeStationId)

  const availableAmb = filteredAmbulances.filter((a) => a.status === 'AVAILABLE').length
  const busyAmb = filteredAmbulances.filter((a) => a.status === 'ON_DUTY').length
  const availDrivers = filteredDrivers.filter((d) => d.operationalStatus === 'available').length
  const availNurses = filteredNurses.filter((n) => n.operationalStatus === 'available').length

  return (
    <div className="space-y-5">
      <ResourceHero
        title="Regional Resource Status"
        subtitle="Unified command view — compare every station before transferring a case from a saturated dispatch desk"
        icon={Activity}
        region={region}
        onRefresh={onRefresh}
        refreshing={refreshing}
      />
      <QuickLinks />
      <StatTiles
        stats={[
          { label: 'Ambulances Ready', value: availableAmb, tone: 'emerald' },
          { label: 'Ambulances On Duty', value: busyAmb, tone: 'amber' },
          { label: 'Drivers Ready', value: availDrivers, tone: 'blue' },
          { label: 'Nurses Ready', value: availNurses, tone: 'violet' },
        ]}
      />
      <StationCapacityStrip summaries={summaries} selectedId={stationId} onSelect={setStationId} />
      {stations.length > 0 && (
        <select
          value={stationId}
          onChange={(e) => setStationId(e.target.value)}
          className="h-11 w-full sm:w-auto min-w-[220px] rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800"
        >
          <option value="">All stations in region</option>
          {stations.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
              {homeStationId === s.id ? ' (your station)' : ''}
            </option>
          ))}
        </select>
      )}
      <div className="flex justify-end">
        <div className="flex rounded-xl border border-slate-200 p-1 bg-slate-50">
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-lg ${viewMode === 'grid' ? 'bg-white shadow text-red-600' : 'text-slate-500'}`}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setViewMode('table')}
            className={`p-2 rounded-lg ${viewMode === 'table' ? 'bg-white shadow text-red-600' : 'text-slate-500'}`}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>
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
              className="flex items-center gap-3 p-4 rounded-2xl border border-slate-200 bg-white hover:border-red-300 hover:shadow-md transition group"
            >
              <div className="w-11 h-11 rounded-xl bg-red-50 text-red-600 flex items-center justify-center group-hover:bg-red-100">
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-sm font-bold text-slate-800">{link.label}</span>
              <ChevronRight className="w-4 h-4 ml-auto text-slate-300 group-hover:text-red-500" />
            </Link>
          )
        })}
      </div>
      <Panel title="Fleet" count={filteredAmbulances.length} empty={!filteredAmbulances.length ? 'No ambulances for this filter' : undefined}>
        {viewMode === 'table' ? (
          <AmbulanceTable items={filteredAmbulances} />
        ) : (
          <AmbulanceGrid items={filteredAmbulances} />
        )}
      </Panel>
      <div className="grid md:grid-cols-2 gap-5">
        <Panel title="Drivers" count={filteredDrivers.length} empty={!filteredDrivers.length ? 'No drivers' : undefined}>
          {viewMode === 'table' ? (
            <CrewTable items={filteredDrivers} />
          ) : (
            <CrewGrid items={filteredDrivers.slice(0, 24)} />
          )}
        </Panel>
        <Panel title="Nurses" count={filteredNurses.length} empty={!filteredNurses.length ? 'No nurses' : undefined}>
          {viewMode === 'table' ? (
            <CrewTable items={filteredNurses} />
          ) : (
            <CrewGrid items={filteredNurses.slice(0, 24)} />
          )}
        </Panel>
      </div>
    </div>
  )
}
