export type OperationalNurseStatus = 'available' | 'unavailable'

export interface NurseAvailabilityRow {
  id: string
  employeeCode?: string | null
  firstName?: string | null
  lastName?: string | null
  fullName: string
  phone?: string | null
  specialization?: string | null
  shiftStatus: string
  employmentStatus: string
  medicalClearanceStatus?: string | null
  operationalStatus: OperationalNurseStatus
  unavailableReason?: string | null
  assignedAmbulance: {
    id: string
    ambulanceNumber: string
    plateNumber: string
  } | null
  station: { id: string; name: string } | null
  region: { id: string; name: string } | null
  district: { id: string; name: string } | null
  licenseStatus?: string | null
  licenseExpiryDate?: string | null
  currentCase: {
    id: string
    trackingCode: string
    status: string
    patientName?: string | null
  } | null
  updatedAt: string
}

export interface NurseAvailabilityOverview {
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
  nurses: NurseAvailabilityRow[]
  recentChanges: {
    id: string
    activity: string
    actorName: string
    createdAt: string
    nurseId?: string
  }[]
  analytics: {
    dailyUsage: { date: string; label: string; count: number }[]
    casesPerNurse: { nurseName: string; count: number }[]
    statusDistribution: { name: string; value: number; color: string }[]
    activityTrend: { date: string; label: string; active: number }[]
  }
  filters: {
    stations: { id: string; name: string }[]
    regions: { id: string; name: string }[]
    districts: { id: string; name: string }[]
    specializations: string[]
  }
  liveBoard: {
    available: NurseAvailabilityRow[]
    unavailable: NurseAvailabilityRow[]
    recentlyUpdated: NurseAvailabilityRow[]
  }
}

export const NURSE_STATUS_CONFIG: Record<
  OperationalNurseStatus,
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

export type NurseStatusFilterTab = 'all' | OperationalNurseStatus

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
