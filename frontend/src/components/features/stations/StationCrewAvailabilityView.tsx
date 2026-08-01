'use client'

import { useEffect, useMemo, useState } from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import { Loader2, RefreshCw, Truck, Users, Stethoscope, MapPin } from 'lucide-react'
import { stationsApi } from '@/lib/stationsApi'
import { dispatcherDashboardApi } from '@/lib/dispatcherApi'
import { statusBadgeClass } from '@/lib/dispatcher/resourceBoardUtils'

type StationOption = { id: string; name: string }

type Props = {
  variant: 'admin' | 'dispatcher'
  /** Optional override for dispatcher home station pre-selection */
  homeStationId?: string | null
  embedded?: boolean
}

function isAmbulanceAvailable(status?: string) {
  return String(status ?? '').toUpperCase() === 'AVAILABLE'
}

function isAdminStaffAvailable(row: { shiftStatus?: string; currentMission?: unknown }) {
  return String(row.shiftStatus ?? '').toUpperCase() === 'AVAILABLE' && !row.currentMission
}

function staffRoleLabel(row: Record<string, unknown>) {
  const role = row.role as string | undefined
  const employeeRole = row.employeeRole as { name?: string } | undefined
  return role ?? employeeRole?.name ?? 'Staff'
}

function SectionCard({
  title,
  icon: Icon,
  count,
  empty,
  children,
  accent,
}: {
  title: string
  icon: typeof Truck
  count: number
  empty: string
  children: React.ReactNode
  accent: 'teal' | 'red'
}) {
  const ring = accent === 'teal' ? 'border-teal-100' : 'border-red-100'
  const badge = accent === 'teal' ? 'bg-teal-600' : 'bg-red-600'
  return (
    <div className={`rounded-2xl border ${ring} bg-white shadow-sm overflow-hidden`}>
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className={`w-9 h-9 rounded-xl ${badge} text-white flex items-center justify-center`}>
            <Icon className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-black text-slate-900">{title}</h2>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Available now</p>
          </div>
        </div>
        <span className={`text-lg font-black ${accent === 'teal' ? 'text-teal-700' : 'text-red-700'}`}>{count}</span>
      </div>
      <div className="p-4">
        {count === 0 ? <p className="text-sm text-slate-400 text-center py-8">{empty}</p> : children}
      </div>
    </div>
  )
}

function AmbulanceCard({ row, variant }: { row: Record<string, unknown>; variant: 'admin' | 'dispatcher' }) {
  const mission = row.currentMission as { id?: string; trackingCode?: string } | null | undefined
  const driver = (row.employees as { firstName?: string; lastName?: string }[] | undefined)?.[0]
  const equipment = row.equipmentLevel as { name?: string } | undefined
  return (
    <div className="rounded-xl border border-slate-200 p-4 hover:border-slate-300 transition">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-black text-slate-900">{String(row.ambulanceNumber ?? '—')}</p>
          {row.plateNumber && <p className="text-xs text-slate-500">{String(row.plateNumber)}</p>}
        </div>
        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${statusBadgeClass(String(row.status ?? 'AVAILABLE'))}`}>
          {String(row.status ?? 'AVAILABLE').replace(/_/g, ' ')}
        </span>
      </div>
      {equipment?.name && <p className="text-xs text-slate-500 mt-2">{equipment.name}</p>}
      {driver && (
        <p className="text-xs text-slate-600 mt-1">
          Driver: {driver.firstName} {driver.lastName}
        </p>
      )}
      {variant === 'dispatcher' && mission?.trackingCode && mission.id && (
        <Link href={`/dispatcher/emergency-requests/${mission.id}`} className="text-xs font-bold text-red-600 mt-2 inline-block hover:underline">
          Case {mission.trackingCode}
        </Link>
      )}
    </div>
  )
}

function CrewMemberCard({ row, variant }: { row: Record<string, unknown>; variant: 'admin' | 'dispatcher' }) {
  const mission = row.currentMission as { id?: string; trackingCode?: string } | null | undefined
  const operational = row.operationalStatus as string | undefined
  const available =
    operational === 'available' ||
    (operational == null && isAdminStaffAvailable(row as { shiftStatus?: string; currentMission?: unknown }))

  return (
    <div className="rounded-xl border border-slate-200 p-4 hover:border-slate-300 transition">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-bold text-slate-900">
            {String(row.firstName ?? '')} {String(row.lastName ?? '')}
          </p>
          <p className="text-xs text-slate-500">{staffRoleLabel(row)}</p>
          {row.phone && <p className="text-[10px] text-slate-400 mt-0.5">{String(row.phone)}</p>}
        </div>
        <span
          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border shrink-0 ${
            available ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'
          }`}
        >
          {available ? 'Available' : 'Unavailable'}
        </span>
      </div>
      {row.defaultShift && <p className="text-xs text-slate-500 mt-2">Shift: {String(row.defaultShift)}</p>}
      {variant === 'dispatcher' && mission?.trackingCode && mission.id && (
        <Link href={`/dispatcher/emergency-requests/${mission.id}`} className="text-xs font-bold text-red-600 mt-2 inline-block hover:underline">
          Case {mission.trackingCode}
        </Link>
      )}
    </div>
  )
}

export default function StationCrewAvailabilityView({ variant, homeStationId, embedded }: Props) {
  const accent = variant === 'admin' ? 'teal' : 'red'
  const [stationId, setStationId] = useState('')

  const { data: stationMeta, isLoading: stationsLoading } = useSWR(
    ['station-crew-stations', variant],
    async () => {
      if (variant === 'dispatcher') {
        const res = await dispatcherDashboardApi.getAmbulances('all')
        return {
          stations: (res.stations ?? []) as StationOption[],
          homeStationId: (res.homeStationId as string | null | undefined) ?? null,
        }
      }
      return {
        stations: (await stationsApi.getAll()) as StationOption[],
        homeStationId: null,
      }
    },
  )

  const stations = useMemo(() => {
    const list = Array.isArray(stationMeta?.stations) ? stationMeta.stations : []
    return list
      .map((s) => ({ id: String(s.id), name: String(s.name) }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [stationMeta?.stations])

  const resolvedHomeStationId = homeStationId ?? stationMeta?.homeStationId ?? null

  useEffect(() => {
    if (!stations.length || stationId) return
    const preferred =
      resolvedHomeStationId && stations.some((s) => s.id === resolvedHomeStationId)
        ? resolvedHomeStationId
        : stations[0].id
    setStationId(preferred)
  }, [stations, resolvedHomeStationId, stationId])

  const { data, isLoading, mutate, isValidating } = useSWR(
    stationId ? ['station-crew', variant, stationId] : null,
    async () => {
      if (variant === 'dispatcher') {
        const [ambulances, drivers, nurses] = await Promise.all([
          dispatcherDashboardApi.getAmbulances('available', stationId),
          dispatcherDashboardApi.getCrew('drivers-available', stationId),
          dispatcherDashboardApi.getCrew('nurses-available', stationId),
        ])
        return {
          ambulances: (ambulances.items ?? []) as Record<string, unknown>[],
          drivers: (drivers.items ?? []) as Record<string, unknown>[],
          nurses: (nurses.items ?? []) as Record<string, unknown>[],
          region: ambulances.region as string | undefined,
        }
      }

      const [ambulancesRaw, driversRaw, nursesRaw] = await Promise.all([
        stationsApi.getAmbulances(stationId),
        stationsApi.getStaff(stationId, 'drivers'),
        stationsApi.getStaff(stationId, 'nurses'),
      ])

      return {
        ambulances: (ambulancesRaw as Record<string, unknown>[]).filter((a) => isAmbulanceAvailable(String(a.status))),
        drivers: (driversRaw as Record<string, unknown>[]).filter((d) => isAdminStaffAvailable(d as { shiftStatus?: string; currentMission?: unknown })),
        nurses: (nursesRaw as Record<string, unknown>[]).filter((n) => isAdminStaffAvailable(n as { shiftStatus?: string; currentMission?: unknown })),
      }
    },
    { refreshInterval: 30_000 },
  )

  const selectedStation = stations.find((s) => s.id === stationId)
  const ambulances = data?.ambulances ?? []
  const drivers = data?.drivers ?? []
  const nurses = data?.nurses ?? []

  const selectClass =
    accent === 'teal'
      ? 'focus:border-teal-400 focus:ring-teal-100'
      : 'focus:border-red-400 focus:ring-red-100'

  return (
    <div className="space-y-6">
      {!embedded && (
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900">Station Crew & Resources</h1>
            <p className="text-sm text-slate-500 mt-1">
              {variant === 'admin'
                ? 'Select a station to view available ambulances, drivers, and nurses'
                : 'Available units at your selected station for dispatch decisions'}
            </p>
            {variant === 'dispatcher' && data?.region && (
              <p className="text-xs font-semibold text-slate-400 mt-1">Region: {data.region}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => void mutate()}
            disabled={isValidating}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border transition ${
              accent === 'teal'
                ? 'border-teal-200 text-teal-700 hover:bg-teal-50'
                : 'border-red-200 text-red-700 hover:bg-red-50'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isValidating ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">
          Select station
        </label>
        {stationsLoading ? (
          <div className="flex items-center gap-2 text-sm text-slate-400 py-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading stations…
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
            <div className="relative flex-1">
              <MapPin className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${accent === 'teal' ? 'text-teal-500' : 'text-red-500'}`} />
              <select
                value={stationId}
                onChange={(e) => setStationId(e.target.value)}
                className={`w-full h-11 pl-9 pr-4 rounded-xl border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-800 outline-none focus:ring-2 ${selectClass}`}
              >
                {stations.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                    {resolvedHomeStationId === s.id ? ' (your station)' : ''}
                  </option>
                ))}
              </select>
            </div>
            {selectedStation && (
              <p className="text-sm font-semibold text-slate-600">
                {ambulances.length} amb · {drivers.length} drivers · {nurses.length} nurses available
              </p>
            )}
          </div>
        )}
      </div>

      {isLoading && stationId ? (
        <div className="flex justify-center py-16">
          <Loader2 className={`w-8 h-8 animate-spin ${accent === 'teal' ? 'text-teal-600' : 'text-red-600'}`} />
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-3">
          <SectionCard
            title="Ambulances"
            icon={Truck}
            count={ambulances.length}
            empty="No available ambulances at this station"
            accent={accent}
          >
            <div className="space-y-3">
              {ambulances.map((row) => (
                <AmbulanceCard key={String(row.id)} row={row} variant={variant} />
              ))}
            </div>
          </SectionCard>

          <SectionCard
            title="Drivers"
            icon={Users}
            count={drivers.length}
            empty="No available drivers at this station"
            accent={accent}
          >
            <div className="space-y-3">
              {drivers.map((row) => (
                <CrewMemberCard key={String(row.id)} row={row} variant={variant} />
              ))}
            </div>
          </SectionCard>

          <SectionCard
            title="Nurses"
            icon={Stethoscope}
            count={nurses.length}
            empty="No available nurses at this station"
            accent={accent}
          >
            <div className="space-y-3">
              {nurses.map((row) => (
                <CrewMemberCard key={String(row.id)} row={row} variant={variant} />
              ))}
            </div>
          </SectionCard>
        </div>
      )}
    </div>
  )
}
