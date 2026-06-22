import { EmergencyRequest, Ambulance, Employee } from '@/types'

export interface DashboardKpiItem {
  key: string
  label: string
  value: number | null
  format: 'number' | 'minutes'
  live?: boolean
}

export interface UnifiedDashboardSummary {
  totalEmergencyCases: number
  activeCases: number
  pendingCases: number
  criticalCases: number
  availableAmbulances: number
  ambulancesOnCase: number
  availableCrew: number
  availableDrivers: number
  availableNurses: number
  hospitalsAvailable: number
  completedCases: number
  cancelledCases: number
  averageResponseTimeMinutes: number | null
  delayedCases: number
  /** @deprecated use pendingCases */
  pendingQueue: number
  highPriority: number
  /** @deprecated use completedCases */
  completedCasesToday: number
  /** @deprecated use completedCases */
  completedToday: number
  /** @deprecated use cancelledCases */
  cancelledToday: number
  openCases: number
}

export interface DashboardHospitalSnapshot {
  id: string
  name: string
  availabilityStatus: string
  capacityStatus: string
  beds: number
  occupiedBeds: number
  acceptEmergencyCases: boolean
  erReady: boolean
}

export interface UnifiedDashboardData {
  lastUpdated: string
  summary: UnifiedDashboardSummary
  kpis: DashboardKpiItem[]
  performance: {
    successRate: number
    systemEfficiency: number
    ambulanceUtilization: number
    staffUtilization: number
  }
  resources: {
    totalAmbulances: number
    availableAmbulances: number
    onDutyAmbulances: number
    maintenanceAmbulances: number
    activeEmployees: number
    totalEmployees: number
  }
  charts: {
    hourly: { time: string; cases: number }[]
    weekly: { day: string; requests: number; completed: number }[]
    monthly: { month: string; successRate: number }[]
    priorityDistribution: { name: string; value: number; color: string }[]
    ambulanceStatus: { name: string; count: number; color: string }[]
    todayBreakdown: { name: string; count: number; fill: string }[]
  }
  recentActivity: any[]
  criticalAlertText: string
  criticalAlerts?: any[]
  hospitals?: DashboardHospitalSnapshot[]
  operational: {
    requests: EmergencyRequest[]
    ambulances: Ambulance[]
    employees: Employee[]
  }
}

export function isUnifiedDashboardData(value: unknown): value is UnifiedDashboardData {
  if (!value || typeof value !== 'object') return false
  const d = value as Record<string, unknown>
  return (
    typeof d.lastUpdated === 'string' &&
    d.summary != null &&
    typeof d.summary === 'object' &&
    Array.isArray(d.kpis) &&
    d.resources != null &&
    typeof d.resources === 'object' &&
    d.charts != null &&
    typeof d.charts === 'object' &&
    d.operational != null &&
    typeof d.operational === 'object'
  )
}

export function normalizeUnifiedDashboard(raw: unknown): UnifiedDashboardData {
  if (isUnifiedDashboardData(raw)) return raw
  throw new Error(
    'Invalid dashboard response from server. Restart the backend (npm run start:dev) so /api/reports/dashboard/unified is available.',
  )
}

export function formatKpiValue(kpi: DashboardKpiItem): string {
  if (kpi.format === 'minutes') {
    return kpi.value == null ? '—' : `${kpi.value} min`
  }
  return String(kpi.value ?? 0)
}
