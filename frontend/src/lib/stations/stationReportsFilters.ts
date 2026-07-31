import { subDays, startOfDay, endOfDay, isWithinInterval, parseISO } from 'date-fns'
import { STATION_TRANSFER_REASONS } from '@/lib/stationsApi'

export type DateRangePreset = 'all' | '7d' | '30d' | '90d' | 'custom'
export type TransferDirection = 'all' | 'out' | 'in'

export type StationReportFilters = {
  search: string
  stationId: string
  regionId: string
  statusFilter: 'all' | 'active' | 'inactive'
  dateRange: DateRangePreset
  startDate: string
  endDate: string
  transferDirection: TransferDirection
  transferReason: string
  caseStatus: string
  priority: string
}

export const DEFAULT_STATION_REPORT_FILTERS: StationReportFilters = {
  search: '',
  stationId: '',
  regionId: '',
  statusFilter: 'all',
  dateRange: 'all',
  startDate: '',
  endDate: '',
  transferDirection: 'all',
  transferReason: '',
  caseStatus: '',
  priority: '',
}

export type StationRow = {
  id: string
  name: string
  code?: string
  region?: { id?: string; name: string }
  homeDistrict?: { name: string }
  coverageDistricts?: { name: string }[]
  isActive: boolean
  counts?: {
    ambulances?: number
    drivers?: number
    nurses?: number
    dispatchers?: number
    activeCases?: number
  }
}

export type TransferRow = {
  id: string
  trackingCode?: string
  caseStatus?: string
  priority?: string
  fromStation?: { id: string; name: string; code?: string }
  toStation?: { id: string; name: string; code?: string }
  reason?: string
  transferredBy?: string
  transferredAt?: string
}

function resolveDateInterval(filters: StationReportFilters): { start: Date; end: Date } | null {
  if (filters.dateRange === 'all') return null
  const now = new Date()
  if (filters.dateRange === 'custom') {
    if (!filters.startDate && !filters.endDate) return null
    const start = filters.startDate ? startOfDay(parseISO(filters.startDate)) : subDays(now, 365)
    const end = filters.endDate ? endOfDay(parseISO(filters.endDate)) : endOfDay(now)
    return { start, end }
  }
  const days = filters.dateRange === '7d' ? 7 : filters.dateRange === '30d' ? 30 : 90
  return { start: startOfDay(subDays(now, days)), end: endOfDay(now) }
}

export function filterStations(stations: StationRow[], filters: StationReportFilters): StationRow[] {
  return stations.filter((s) => {
    const q = filters.search.toLowerCase()
    const matchesSearch =
      !q ||
      s.name.toLowerCase().includes(q) ||
      (s.code?.toLowerCase().includes(q) ?? false) ||
      (s.homeDistrict?.name?.toLowerCase().includes(q) ?? false)
    const matchesStation = !filters.stationId || s.id === filters.stationId
    const matchesRegion = !filters.regionId || s.region?.id === filters.regionId
    const matchesStatus =
      filters.statusFilter === 'all' ||
      (filters.statusFilter === 'active' && s.isActive) ||
      (filters.statusFilter === 'inactive' && !s.isActive)
    return matchesSearch && matchesStation && matchesRegion && matchesStatus
  })
}

export function filterTransfers(transfers: TransferRow[], filters: StationReportFilters): TransferRow[] {
  const interval = resolveDateInterval(filters)

  return transfers.filter((t) => {
    const q = filters.search.toLowerCase()
    const matchesSearch =
      !q ||
      (t.trackingCode?.toLowerCase().includes(q) ?? false) ||
      (t.fromStation?.name?.toLowerCase().includes(q) ?? false) ||
      (t.toStation?.name?.toLowerCase().includes(q) ?? false) ||
      (t.reason?.toLowerCase().includes(q) ?? false)

    let matchesStation = true
    if (filters.stationId) {
      if (filters.transferDirection === 'out') {
        matchesStation = t.fromStation?.id === filters.stationId
      } else if (filters.transferDirection === 'in') {
        matchesStation = t.toStation?.id === filters.stationId
      } else {
        matchesStation =
          t.fromStation?.id === filters.stationId || t.toStation?.id === filters.stationId
      }
    }

    const matchesReason =
      !filters.transferReason || (t.reason?.toLowerCase().includes(filters.transferReason.toLowerCase()) ?? false)
    const matchesCaseStatus = !filters.caseStatus || t.caseStatus === filters.caseStatus
    const matchesPriority = !filters.priority || t.priority === filters.priority

    let matchesDate = true
    if (interval && t.transferredAt) {
      matchesDate = isWithinInterval(new Date(t.transferredAt), interval)
    } else if (interval && !t.transferredAt) {
      matchesDate = false
    }

    return matchesSearch && matchesStation && matchesReason && matchesCaseStatus && matchesPriority && matchesDate
  })
}

export function buildFilterDescription(filters: StationReportFilters, stations: StationRow[]): string {
  const parts: string[] = []
  if (filters.stationId) {
    parts.push(`Station: ${stations.find((s) => s.id === filters.stationId)?.name ?? filters.stationId}`)
  }
  if (filters.regionId) {
    parts.push(`Region: ${stations.find((s) => s.region?.id === filters.regionId)?.region?.name ?? filters.regionId}`)
  }
  if (filters.statusFilter !== 'all') parts.push(`Status: ${filters.statusFilter}`)
  if (filters.dateRange !== 'all') {
    if (filters.dateRange === 'custom') {
      parts.push(`Dates: ${filters.startDate || '…'} to ${filters.endDate || '…'}`)
    } else {
      parts.push(`Period: last ${filters.dateRange.replace('d', ' days')}`)
    }
  }
  if (filters.transferDirection !== 'all') {
    parts.push(`Transfer flow: ${filters.transferDirection === 'out' ? 'sent out' : 'received in'}`)
  }
  if (filters.transferReason) parts.push(`Reason contains: ${filters.transferReason}`)
  if (filters.caseStatus) parts.push(`Case status: ${filters.caseStatus}`)
  if (filters.priority) parts.push(`Priority: ${filters.priority}`)
  if (filters.search.trim()) parts.push(`Search: "${filters.search.trim()}"`)
  return parts.length ? parts.join(' · ') : 'All stations and transfers (no filters applied)'
}

export function isFiltersActive(filters: StationReportFilters): boolean {
  return (
    Boolean(filters.search.trim()) ||
    Boolean(filters.stationId) ||
    Boolean(filters.regionId) ||
    filters.statusFilter !== 'all' ||
    filters.dateRange !== 'all' ||
    filters.transferDirection !== 'all' ||
    Boolean(filters.transferReason) ||
    Boolean(filters.caseStatus) ||
    Boolean(filters.priority)
  )
}

export function computeStationTransferStats(
  transfers: TransferRow[],
  stationId: string,
): { transfersIn: number; transfersOut: number; total: number } {
  let transfersIn = 0
  let transfersOut = 0
  for (const t of transfers) {
    if (t.toStation?.id === stationId) transfersIn += 1
    if (t.fromStation?.id === stationId) transfersOut += 1
  }
  return { transfersIn, transfersOut, total: transfersIn + transfersOut }
}

export { STATION_TRANSFER_REASONS }

export const CASE_STATUS_OPTIONS = [
  'PENDING',
  'REVIEWING',
  'ASSIGNED',
  'DISPATCHED',
  'EN_ROUTE',
  'ARRIVED_SCENE',
  'TRANSPORTING',
  'COMPLETED',
  'CANCELLED',
] as const

export const PRIORITY_OPTIONS = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const

export function computeTransferAnalytics(
  transfers: TransferRow[],
  stations: StationRow[],
) {
  const byStation = new Map<string, { name: string; transfersIn: number; transfersOut: number }>()
  for (const s of stations) {
    byStation.set(s.id, { name: s.name, transfersIn: 0, transfersOut: 0 })
  }
  const byReason = new Map<string, number>()
  const byRoute = new Map<string, { from: string; to: string; count: number }>()

  for (const t of transfers) {
    const fromId = t.fromStation?.id
    const toId = t.toStation?.id
    if (fromId && byStation.has(fromId)) byStation.get(fromId)!.transfersOut += 1
    if (toId && byStation.has(toId)) byStation.get(toId)!.transfersIn += 1

    const reason = (t.reason?.trim() || 'Unspecified').slice(0, 120)
    byReason.set(reason, (byReason.get(reason) ?? 0) + 1)

    if (t.fromStation?.name && t.toStation?.name && fromId && toId) {
      const key = `${fromId}->${toId}`
      const existing = byRoute.get(key)
      if (existing) existing.count += 1
      else byRoute.set(key, { from: t.fromStation.name, to: t.toStation.name, count: 1 })
    }
  }

  return {
    byStation: [...byStation.entries()]
      .map(([id, row]) => ({
        stationId: id,
        stationName: row.name,
        transfersIn: row.transfersIn,
        transfersOut: row.transfersOut,
        total: row.transfersIn + row.transfersOut,
      }))
      .filter((r) => r.total > 0)
      .sort((a, b) => b.total - a.total),
    byReason: [...byReason.entries()]
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count),
    topRoutes: [...byRoute.values()].sort((a, b) => b.count - a.count).slice(0, 15),
    totalTransfers: transfers.length,
  }
}
