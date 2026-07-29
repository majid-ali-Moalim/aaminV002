export type StationOption = { id: string; name: string }

export type ResourceStatusTab = 'available' | 'busy' | 'offline' | 'all'

export const RESOURCE_STATUS_TABS: { id: ResourceStatusTab; label: string }[] = [
  { id: 'available', label: 'Available' },
  { id: 'busy', label: 'On Mission' },
  { id: 'offline', label: 'Offline / Maintenance' },
  { id: 'all', label: 'All' },
]

export function getItemStationId(item: Record<string, unknown>) {
  const station = item.station as { id?: string } | undefined
  return (item.stationId as string | undefined) ?? station?.id ?? ''
}

export function matchesStation(item: Record<string, unknown>, stationId: string) {
  if (!stationId) return true
  return getItemStationId(item) === stationId
}

export function statusTone(status: string) {
  const s = status.toUpperCase()
  if (s === 'AVAILABLE' || s === 'ON_DUTY') return 'emerald'
  if (s === 'MAINTENANCE' || s === 'UNAVAILABLE' || s === 'OFF_DUTY') return 'slate'
  return 'amber'
}

export function statusBadgeClass(status: string) {
  const tone = statusTone(status)
  if (tone === 'emerald') return 'bg-emerald-100 text-emerald-800 border-emerald-200'
  if (tone === 'slate') return 'bg-slate-100 text-slate-700 border-slate-200'
  return 'bg-amber-100 text-amber-800 border-amber-200'
}

export type StationCapacitySummary = {
  id: string
  name: string
  availableAmb: number
  busyAmb: number
  availableDrivers: number
  onMissionDrivers: number
  availableNurses: number
  onMissionNurses: number
  isHome: boolean
}

export function buildStationSummaries(
  stations: StationOption[],
  ambulances: Record<string, unknown>[],
  drivers: Record<string, unknown>[],
  nurses: Record<string, unknown>[],
  homeStationId?: string | null,
): StationCapacitySummary[] {
  return stations.map((station) => {
    const amb = ambulances.filter((a) => getItemStationId(a) === station.id)
    const drv = drivers.filter((d) => getItemStationId(d) === station.id)
    const nrs = nurses.filter((n) => getItemStationId(n) === station.id)

    return {
      id: station.id,
      name: station.name,
      availableAmb: amb.filter((a) => String(a.status) === 'AVAILABLE').length,
      busyAmb: amb.filter((a) => String(a.status) === 'ON_DUTY').length,
      availableDrivers: drv.filter(
        (d) => ['AVAILABLE', 'ON_DUTY'].includes(String(d.shiftStatus)) && !d.currentMission,
      ).length,
      onMissionDrivers: drv.filter((d) => Boolean(d.currentMission)).length,
      availableNurses: nrs.filter(
        (n) => ['AVAILABLE', 'ON_DUTY'].includes(String(n.shiftStatus)) && !n.currentMission,
      ).length,
      onMissionNurses: nrs.filter((n) => Boolean(n.currentMission)).length,
      isHome: homeStationId === station.id,
    }
  })
}
