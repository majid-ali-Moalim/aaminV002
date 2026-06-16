export type CoverageStatus = 'covered' | 'limited' | 'gap' | 'none'

export interface ResourcePair {
  total: number
  available: number
}

export interface StationCoverage {
  id: string
  name: string
  address: string | null
  phone: string | null
  ambulances: ResourcePair
  drivers: ResourcePair
  nurses: ResourcePair
  coverageStatus: CoverageStatus
}

export interface DistrictCoverage {
  id: string
  name: string
  stations: StationCoverage[]
  totals: {
    stations: number
    ambulances: number
    availableAmbulances: number
    drivers: number
    nurses: number
    gaps: number
  }
}

export interface RegionCoverage {
  id: string
  name: string
  districts: DistrictCoverage[]
  totals: {
    districts: number
    stations: number
    ambulances: number
    availableAmbulances: number
    gaps: number
  }
}

export interface CoverageOverview {
  summary: {
    regions: number
    districts: number
    stations: number
    ambulances: number
    availableAmbulances: number
    coverageGaps: number
  }
  regions: RegionCoverage[]
  updatedAt: string
}

export const COVERAGE_STATUS_CONFIG: Record<
  CoverageStatus,
  { label: string; color: string; bg: string }
> = {
  covered: { label: 'Covered', color: 'text-emerald-700', bg: 'bg-emerald-100' },
  limited: { label: 'Limited', color: 'text-amber-700', bg: 'bg-amber-100' },
  gap: { label: 'Gap', color: 'text-orange-700', bg: 'bg-orange-100' },
  none: { label: 'No Resources', color: 'text-red-700', bg: 'bg-red-100' },
}
