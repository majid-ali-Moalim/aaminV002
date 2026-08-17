import type { LucideIcon } from 'lucide-react'
import {
  LayoutGrid,
  Activity,
  Building2,
} from 'lucide-react'

export type MissionPhaseStatus =
  | 'EN_ROUTE'
  | 'TRANSPORTING'
  | 'ARRIVED_HOSPITAL'
  | 'PATIENT_STABILIZED'
  | 'COMPLETED'

/** @deprecated Use SimpleMissionPhaseFilter on the active missions page */
export type MissionPhaseFilter = 'ALL' | MissionPhaseStatus

/** Simplified filters for the active missions grid */
export type SimpleMissionPhaseFilter = 'ALL' | 'IN_PROGRESS' | 'AT_HOSPITAL' | 'ASSIGNED'

export const SIMPLE_MISSION_PHASE_FILTERS: {
  value: SimpleMissionPhaseFilter
  label: string
  icon: LucideIcon
}[] = [
  { value: 'ALL', label: 'All active', icon: LayoutGrid },
  { value: 'ASSIGNED', label: 'Assigned', icon: Activity },
  { value: 'IN_PROGRESS', label: 'In progress', icon: Activity },
  { value: 'AT_HOSPITAL', label: 'At hospital', icon: Building2 },
]

/** Plain-language status for dispatch/admin active list */
export function simpleActiveCaseStatus(status: string): string {
  switch (status) {
    case 'ASSIGNED':
      return 'Assigned'
    case 'ARRIVED_HOSPITAL':
      return 'At hospital'
    case 'COMPLETED':
      return 'Complete'
    case 'CANCELLED':
      return 'Cancelled'
    case 'PENDING':
    case 'REVIEWING':
      return 'Pending'
    default:
      if (
        ['DISPATCHED', 'EN_ROUTE', 'ARRIVED_SCENE', 'PATIENT_STABILIZED', 'TRANSPORTING'].includes(
          status,
        )
      ) {
        return 'In progress'
      }
      return status.replace(/_/g, ' ')
  }
}

export function matchesSimpleMissionPhaseFilter(
  status: string,
  filter: SimpleMissionPhaseFilter,
): boolean {
  if (filter === 'ALL') return ACTIVE_MISSION_STATUSES.includes(status)
  if (filter === 'ASSIGNED') return status === 'ASSIGNED'
  if (filter === 'AT_HOSPITAL') return status === 'ARRIVED_HOSPITAL'
  if (filter === 'IN_PROGRESS') {
    return ['DISPATCHED', 'EN_ROUTE', 'ARRIVED_SCENE', 'PATIENT_STABILIZED', 'TRANSPORTING'].includes(
      status,
    )
  }
  return false
}

/** Statuses considered in-progress on the active missions grid */
export const ACTIVE_MISSION_STATUSES = [
  'ASSIGNED',
  'DISPATCHED',
  'EN_ROUTE',
  'ARRIVED_SCENE',
  'PATIENT_STABILIZED',
  'TRANSPORTING',
  'ARRIVED_HOSPITAL',
]

/** Crew is on an in-progress mission (matches backend OCCUPIED_CASE_STATUSES). */
export const OCCUPIED_MISSION_STATUSES = ACTIVE_MISSION_STATUSES

export function isOccupiedMissionStatus(status: string): boolean {
  return (OCCUPIED_MISSION_STATUSES as readonly string[]).includes(status)
}

export const MISSION_PHASE_FILTERS: {
  value: MissionPhaseFilter
  label: string
  icon: LucideIcon
}[] = [
  { value: 'ALL', label: 'All Active', icon: LayoutGrid },
  { value: 'EN_ROUTE', label: 'In progress', icon: Activity },
  { value: 'TRANSPORTING', label: 'In progress', icon: Activity },
  { value: 'ARRIVED_HOSPITAL', label: 'At hospital', icon: Building2 },
  { value: 'PATIENT_STABILIZED', label: 'In progress', icon: Activity },
  { value: 'COMPLETED', label: 'Complete', icon: Building2 },
]

export function statusMatchesMissionPhase(status: string, phase: MissionPhaseStatus) {
  if (phase === 'EN_ROUTE') {
    return ['ASSIGNED', 'DISPATCHED', 'EN_ROUTE'].includes(status)
  }
  if (phase === 'PATIENT_STABILIZED') {
    return status === 'PATIENT_STABILIZED'
  }
  return status === phase
}

export function matchesMissionPhaseFilter(status: string, filter: MissionPhaseFilter) {
  if (filter === 'ALL') {
    return ACTIVE_MISSION_STATUSES.includes(status)
  }
  return statusMatchesMissionPhase(status, filter)
}
