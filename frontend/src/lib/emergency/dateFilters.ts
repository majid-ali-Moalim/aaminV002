import {
  endOfDay,
  endOfMonth,
  endOfWeek,
  endOfYear,
  endOfYesterday,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
  startOfYesterday,
  subDays,
} from 'date-fns'
import type { EmergencyRequest } from '@/types'

export type DateFilterPreset = 'today' | 'yesterday' | 'week' | 'month' | 'year' | 'custom'

export type DateRange = {
  from: Date
  to: Date
  label: string
}

export const DATE_FILTER_PRESETS: { id: DateFilterPreset; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: 'week', label: 'This Week' },
  { id: 'month', label: 'This Month' },
  { id: 'year', label: 'This Year' },
  { id: 'custom', label: 'Custom' },
]

export function getDateRange(
  preset: DateFilterPreset,
  customFrom?: string,
  customTo?: string,
): DateRange {
  const now = new Date()

  switch (preset) {
    case 'today':
      return { from: startOfDay(now), to: endOfDay(now), label: 'Today' }
    case 'yesterday':
      return { from: startOfYesterday(), to: endOfYesterday(), label: 'Yesterday' }
    case 'week':
      return {
        from: startOfWeek(now, { weekStartsOn: 1 }),
        to: endOfWeek(now, { weekStartsOn: 1 }),
        label: 'This Week',
      }
    case 'month':
      return { from: startOfMonth(now), to: endOfMonth(now), label: 'This Month' }
    case 'year':
      return { from: startOfYear(now), to: endOfYear(now), label: 'This Year' }
    case 'custom': {
      const from = customFrom ? startOfDay(new Date(customFrom)) : startOfDay(subDays(now, 7))
      const to = customTo ? endOfDay(new Date(customTo)) : endOfDay(now)
      return { from, to, label: 'Custom Range' }
    }
    default:
      return { from: startOfDay(now), to: endOfDay(now), label: 'Today' }
  }
}

export function isWithinDateRange(isoDate: string, range: DateRange): boolean {
  const t = new Date(isoDate).getTime()
  return t >= range.from.getTime() && t <= range.to.getTime()
}

export function filterRequestsByDateRange(
  requests: EmergencyRequest[],
  range: DateRange,
): EmergencyRequest[] {
  return requests.filter((r) => isWithinDateRange(r.createdAt, range))
}

/** Closed cases belong in patient case records — not the live dispatch board */
export const CLOSED_EMERGENCY_STATUSES = ['COMPLETED', 'CANCELLED', 'FAILED'] as const

/** Archived patient cases — completed or cancelled only */
export const ARCHIVED_PATIENT_CASE_STATUSES = ['COMPLETED', 'CANCELLED'] as const

export function isArchivedPatientCase(request: EmergencyRequest): boolean {
  return ARCHIVED_PATIENT_CASE_STATUSES.includes(
    request.status as (typeof ARCHIVED_PATIENT_CASE_STATUSES)[number],
  )
}

export function filterArchivedPatientCases(requests: EmergencyRequest[]): EmergencyRequest[] {
  return requests.filter(isArchivedPatientCase)
}

export function isOperationalEmergencyCase(request: EmergencyRequest): boolean {
  return !CLOSED_EMERGENCY_STATUSES.includes(
    request.status as (typeof CLOSED_EMERGENCY_STATUSES)[number],
  )
}

/** Live dispatch board — assigned resources or in-progress; excludes unassigned pending */
export function isLiveDispatchCase(request: EmergencyRequest): boolean {
  if (['COMPLETED', 'CANCELLED', 'FAILED'].includes(request.status)) return false
  if (request.status === 'PENDING') {
    return Boolean(
      request.ambulanceId ||
        request.driverId ||
        request.nurseId ||
        request.ambulance ||
        request.driver ||
        request.nurse,
    )
  }
  return true
}

export function filterOperationalCases(requests: EmergencyRequest[]): EmergencyRequest[] {
  return requests.filter(isOperationalEmergencyCase)
}

export function filterLiveDispatchCases(requests: EmergencyRequest[]): EmergencyRequest[] {
  return requests.filter(isLiveDispatchCase)
}

export function isActiveOngoingCase(request: EmergencyRequest): boolean {
  const ongoingStatuses = [
    'ASSIGNED',
    'DISPATCHED',
    'EN_ROUTE',
    'ARRIVED_SCENE',
    'PATIENT_STABILIZED',
    'TRANSPORTING',
    'ARRIVED_HOSPITAL',
    'ON_SCENE',
    'ON_THE_WAY',
  ]
  return ongoingStatuses.includes(request.status)
}

export function computeEmergencyStats(requests: EmergencyRequest[]) {
  return {
    total: requests.length,
    active: requests.filter(isActiveOngoingCase).length,
    pending: requests.filter((r) => r.status === 'PENDING' || r.status === 'REVIEWING').length,
    critical: requests.filter((r) => r.priority === 'CRITICAL').length,
  }
}

/** Emergency pending cases: delayed after 1 hour without assignment */
export const EMERGENCY_DELAY_MINUTES = 60

/** Non-emergency pending cases: delayed after 3 hours without assignment */
export const NON_EMERGENCY_DELAY_MINUTES = 180

/** @deprecated Prefer getDelayThresholdMinutes(request) */
export const ESCALATION_DELAY_MINUTES = EMERGENCY_DELAY_MINUTES

export function getWaitMinutes(createdAt: string): number {
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000)
}

/** Standard latency display: minutes below 1 hour, then hours (+ optional minutes). */
export function formatLatency(waitMinutes: number): string {
  if (waitMinutes < 60) return `${waitMinutes}m`
  const hours = Math.floor(waitMinutes / 60)
  const minutes = waitMinutes % 60
  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`
}

export function isNonEmergencyCase(request: EmergencyRequest): boolean {
  const text = `${request.notes ?? ''} ${request.patientCondition ?? ''}`.toLowerCase()
  if (text.includes('non-emergency') || text.includes('non emergency')) return true
  if (text.includes('non-emergency transport')) return true
  if (request.priority === 'LOW' && !text.includes('emergency type:')) return true
  return false
}

export function getDelayThresholdMinutes(request: EmergencyRequest): number {
  return isNonEmergencyCase(request) ? NON_EMERGENCY_DELAY_MINUTES : EMERGENCY_DELAY_MINUTES
}

export function isUnassignedPendingCase(request: EmergencyRequest): boolean {
  if (request.status !== 'PENDING' && request.status !== 'REVIEWING') return false
  return (
    !request.ambulanceId &&
    !request.driverId &&
    !request.nurseId &&
    !request.ambulance &&
    !request.driver &&
    !request.nurse
  )
}

export function isDelayedPendingCase(request: EmergencyRequest): boolean {
  if (!isUnassignedPendingCase(request)) return false
  return getWaitMinutes(request.createdAt) >= getDelayThresholdMinutes(request)
}

export function isEscalatedPendingCase(request: EmergencyRequest): boolean {
  return isDelayedPendingCase(request)
}

export function isTodayCriticalCase(request: EmergencyRequest): boolean {
  const today = getDateRange('today')
  return (
    request.priority === 'CRITICAL' &&
    isWithinDateRange(request.createdAt, today) &&
    !['COMPLETED', 'CANCELLED', 'FAILED'].includes(request.status)
  )
}

/**
 * Critical (Priority 1) cases created on a specific calendar day (yyyy-MM-dd).
 * For today, closed cases are hidden to preserve the live board; for past days
 * all critical cases from that date are included so history stays visible.
 */
export function isCriticalCaseOnDate(request: EmergencyRequest, dateStr: string): boolean {
  if (request.priority !== 'CRITICAL') return false
  const day = new Date(dateStr)
  const from = startOfDay(day).getTime()
  const to = endOfDay(day).getTime()
  const created = new Date(request.createdAt).getTime()
  if (created < from || created > to) return false

  const isToday = startOfDay(new Date()).getTime() === startOfDay(day).getTime()
  if (isToday) {
    return !['COMPLETED', 'CANCELLED', 'FAILED'].includes(request.status)
  }
  return true
}

/** Rolling window presets for the critical cases board. */
export type CriticalRangePreset = 'day' | 'week' | 'month' | 'year'

export const CRITICAL_RANGE_PRESETS: { id: CriticalRangePreset; label: string }[] = [
  { id: 'day', label: 'Last Day' },
  { id: 'week', label: 'Last Week' },
  { id: 'month', label: 'Last Month' },
  { id: 'year', label: 'Last Year' },
]

export function getCriticalRange(preset: CriticalRangePreset): DateRange {
  const now = new Date()
  const to = endOfDay(now)
  switch (preset) {
    case 'week':
      return { from: startOfDay(subDays(now, 6)), to, label: 'Last Week' }
    case 'month':
      return { from: startOfDay(subDays(now, 29)), to, label: 'Last Month' }
    case 'year':
      return { from: startOfDay(subDays(now, 364)), to, label: 'Last Year' }
    case 'day':
    default:
      return { from: startOfDay(now), to, label: 'Last Day' }
  }
}

/** Critical (Priority 1) case created within the given range (any status). */
export function isCriticalCaseInRange(request: EmergencyRequest, range: DateRange): boolean {
  if (request.priority !== 'CRITICAL') return false
  return isWithinDateRange(request.createdAt, range)
}
