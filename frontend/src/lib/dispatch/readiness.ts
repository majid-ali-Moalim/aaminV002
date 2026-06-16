export type ReadinessLevel = 'ready' | 'limited' | 'critical'
export type StationReadinessStatus = 'ready' | 'limited' | 'critical'

export interface ResourceCounts {
  total: number
  available: number
  unavailable: number
}

export interface StationReadinessRow {
  id: string
  name: string
  region: string | null
  district: string | null
  ambulances: { total: number; available: number }
  drivers: { total: number; available: number }
  nurses: { total: number; available: number }
  readinessScore: number
  status: StationReadinessStatus
}

export interface DispatchReadinessOverview {
  summary: {
    readinessScore: number
    readinessLevel: ReadinessLevel
    pendingCases: number
    criticalCases: number
    activeCases: number
  }
  resources: {
    ambulances: ResourceCounts
    drivers: ResourceCounts
    nurses: ResourceCounts
  }
  stationReadiness: StationReadinessRow[]
  updatedAt: string
}

export const READINESS_LEVEL_CONFIG: Record<
  ReadinessLevel,
  { label: string; color: string; bg: string; ring: string }
> = {
  ready: { label: 'Ready', color: 'text-emerald-700', bg: 'bg-emerald-50', ring: 'ring-emerald-200' },
  limited: { label: 'Limited', color: 'text-amber-700', bg: 'bg-amber-50', ring: 'ring-amber-200' },
  critical: { label: 'Critical', color: 'text-red-700', bg: 'bg-red-50', ring: 'ring-red-200' },
}

export const STATION_STATUS_CONFIG: Record<
  StationReadinessStatus,
  { label: string; color: string; bg: string }
> = {
  ready: { label: 'Ready', color: 'text-emerald-700', bg: 'bg-emerald-100' },
  limited: { label: 'Limited', color: 'text-amber-700', bg: 'bg-amber-100' },
  critical: { label: 'Critical', color: 'text-red-700', bg: 'bg-red-100' },
}
