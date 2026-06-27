export type OperationalAmbulanceStatus = 'available' | 'unavailable'

export interface AmbulanceAvailabilityRow {
  id: string
  ambulanceNumber: string
  plateNumber: string
  fleetNumber?: string | null
  vehicleType: string
  dbStatus: string
  operationalStatus: OperationalAmbulanceStatus
  driver: { id: string; name: string } | null
  currentCase: {
    id: string
    trackingCode: string
    status: string
    patientName?: string | null
  } | null
  region: { id: string; name: string } | null
  district: { id: string; name: string } | null
  station: { id: string; name: string } | null
  readinessScore: number
  updatedAt: string
}

export interface AmbulanceAvailabilityOverview {
  summary: {
    total: number
    available: number
    unavailable: number
    activeToday: number
  }
  statusCounts: {
    available: number
    unavailable: number
  }
  ambulances: AmbulanceAvailabilityRow[]
  recentChanges: {
    id: string
    activity: string
    title: string
    actorName: string
    createdAt: string
    ambulanceId?: string | null
  }[]
  analytics: {
    dailyUsage: { date: string; label: string; count: number }[]
    casesPerAmbulance: { ambulanceNumber: string; count: number }[]
    statusDistribution: { name: string; value: number; color: string }[]
    activityTrend: { date: string; label: string; active: number }[]
  }
  filters: {
    regions: { id: string; name: string }[]
    districts: { id: string; name: string }[]
    ambulanceTypes: string[]
  }
  liveBoard: {
    available: AmbulanceAvailabilityRow[]
    unavailable: AmbulanceAvailabilityRow[]
    recentlyUpdated: AmbulanceAvailabilityRow[]
  }
}

export const OPERATIONAL_STATUS_CONFIG: Record<
  OperationalAmbulanceStatus,
  { label: string; emoji: string; badge: string; dot: string }
> = {
  available: {
    label: 'Available',
    emoji: '🟢',
    badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    dot: 'bg-emerald-500',
  },
  unavailable: {
    label: 'Unavailable',
    emoji: '🔴',
    badge: 'bg-red-100 text-red-800 border-red-200',
    dot: 'bg-red-500',
  },
}

export type StatusFilterTab = 'all' | OperationalAmbulanceStatus

export function formatTimeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins} min ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return hrs === 1 ? '1 hour ago' : `${hrs} hours ago`
  const days = Math.floor(hrs / 24)
  return days === 1 ? 'Yesterday' : `${days} days ago`
}
