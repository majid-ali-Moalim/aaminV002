import type { LucideIcon } from 'lucide-react'
import {
  LayoutGrid,
  Navigation2,
  Truck,
  Building2,
  HeartHandshake,
  CheckCircle2,
} from 'lucide-react'

export type MissionPhaseStatus =
  | 'EN_ROUTE'
  | 'TRANSPORTING'
  | 'ARRIVED_HOSPITAL'
  | 'PATIENT_STABILIZED'
  | 'COMPLETED'

export type MissionPhaseFilter = 'ALL' | MissionPhaseStatus

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

export const MISSION_PHASE_FILTERS: {
  value: MissionPhaseFilter
  label: string
  icon: LucideIcon
}[] = [
  { value: 'ALL', label: 'All Active', icon: LayoutGrid },
  { value: 'EN_ROUTE', label: 'En Route to Scene', icon: Navigation2 },
  { value: 'TRANSPORTING', label: 'Transporting to Hospital', icon: Truck },
  { value: 'ARRIVED_HOSPITAL', label: 'Arrived at Hospital', icon: Building2 },
  { value: 'PATIENT_STABILIZED', label: 'Patient Handover', icon: HeartHandshake },
  { value: 'COMPLETED', label: 'Mission Complete', icon: CheckCircle2 },
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
