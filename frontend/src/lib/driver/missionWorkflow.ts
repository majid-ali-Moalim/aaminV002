import type { DriverMission } from '@/lib/stores/driverStore'

export type WorkflowStepId =
  | 'ASSIGNED'
  | 'ACCEPTED'
  | 'EN_ROUTE_SCENE'
  | 'ARRIVED_SCENE'
  | 'EN_ROUTE_HOSPITAL'
  | 'ARRIVED_HOSPITAL'
  | 'MISSION_COMPLETED'

export type WorkflowActionId =
  | 'accept'
  | 'view_details'
  | 'start_navigation'
  | 'update_eta'
  | 'request_backup'
  | 'report_delay'
  | 'mark_arrival'
  | 'start_transport'
  | 'mark_hospital_arrival'
  | 'submit_report'
  | 'record_fuel'
  | 'record_mileage'
  | 'advance'

export type WorkflowAction = {
  id: WorkflowActionId
  label: string
  variant?: 'primary' | 'secondary' | 'danger'
  icon?: string
}

export type WorkflowStep = {
  id: WorkflowStepId
  label: string
  shortLabel: string
  description: string
  actions: WorkflowAction[]
  primaryAdvance?: WorkflowActionId
  backendStatus?: string
}

/** Compact 5-step driver transport timeline (ends at hospital — nurse closes case). */
export type DriverTimelineStep = {
  id: string
  label: string
  shortLabel: string
  description: string
  stepIds: WorkflowStepId[]
}

export const DRIVER_TIMELINE_STEPS: DriverTimelineStep[] = [
  {
    id: 'START',
    label: 'Start Case',
    shortLabel: 'Start',
    description: 'Accept the assignment and begin the run.',
    stepIds: ['ASSIGNED'],
  },
  {
    id: 'EN_ROUTE',
    label: 'Going to Scene',
    shortLabel: 'En Route',
    description: 'Navigate to the incident location.',
    stepIds: ['ACCEPTED', 'EN_ROUTE_SCENE'],
  },
  {
    id: 'ON_SCENE',
    label: 'Arrived at Scene',
    shortLabel: 'On Scene',
    description: 'Confirm arrival — nurse handles loading and medical notes.',
    stepIds: ['ARRIVED_SCENE'],
  },
  {
    id: 'TRANSPORT',
    label: 'Going to Hospital',
    shortLabel: 'Transport',
    description: 'Transport after nurse loads the patient.',
    stepIds: ['EN_ROUTE_HOSPITAL'],
  },
  {
    id: 'HOSPITAL',
    label: 'Arrived at Hospital',
    shortLabel: 'Hospital',
    description: 'Patient delivered — nurse completes handover and closes the case.',
    stepIds: ['ARRIVED_HOSPITAL'],
  },
]

export const MISSION_EXECUTION_STEPS: WorkflowStep[] = [
  {
    id: 'ASSIGNED',
    label: 'Assigned',
    shortLabel: 'Assigned',
    description: 'Dispatch assigned this case — review details and start en route when ready.',
    backendStatus: 'ASSIGNED',
    primaryAdvance: 'start_navigation',
    actions: [
      { id: 'start_navigation', label: 'Start Case', variant: 'primary' },
      { id: 'view_details', label: 'View Case Details', variant: 'secondary' },
    ],
  },
  {
    id: 'ACCEPTED',
    label: 'Going to Scene',
    shortLabel: 'En Route',
    description: 'Proceed to the incident location.',
    backendStatus: 'DISPATCHED',
    primaryAdvance: 'start_navigation',
    actions: [
      { id: 'start_navigation', label: 'Going to Scene', variant: 'primary' },
      { id: 'view_details', label: 'View Case Details', variant: 'secondary' },
    ],
  },
  {
    id: 'EN_ROUTE_SCENE',
    label: 'Going to Scene',
    shortLabel: 'En Route',
    description: 'Proceed to the incident location.',
    backendStatus: 'DISPATCHED',
    primaryAdvance: 'mark_arrival',
    actions: [
      { id: 'mark_arrival', label: 'Arrived at Scene', variant: 'primary' },
    ],
  },
  {
    id: 'ARRIVED_SCENE',
    label: 'Arrived at Scene',
    shortLabel: 'On Scene',
    description: 'Crew is on scene. Transport unlocks after the nurse saves medical notes.',
    backendStatus: 'ARRIVED_SCENE',
    primaryAdvance: 'start_transport',
    actions: [
      { id: 'start_transport', label: 'Going to Hospital', variant: 'primary' },
      { id: 'view_details', label: 'View Case Details', variant: 'secondary' },
    ],
  },
  {
    id: 'EN_ROUTE_HOSPITAL',
    label: 'Going to Hospital',
    shortLabel: 'Transport',
    description: 'Transport the patient to the receiving facility.',
    backendStatus: 'TRANSPORTING',
    primaryAdvance: 'mark_hospital_arrival',
    actions: [
      { id: 'mark_hospital_arrival', label: 'Arrived at Hospital', variant: 'primary' },
    ],
  },
  {
    id: 'ARRIVED_HOSPITAL',
    label: 'Arrived at Hospital',
    shortLabel: 'At Hospital',
    description: 'Timeline complete — the nurse completes handover and closes the case.',
    backendStatus: 'ARRIVED_HOSPITAL',
    actions: [
      { id: 'view_details', label: 'View Case Summary', variant: 'secondary' },
      { id: 'submit_report', label: 'Submit Run Report', variant: 'secondary' },
    ],
  },
  {
    id: 'MISSION_COMPLETED',
    label: 'Mission Completed',
    shortLabel: 'Complete',
    description: 'Case closed by nurse — read-only summary.',
    backendStatus: 'COMPLETED',
    actions: [{ id: 'view_details', label: 'View Case Summary', variant: 'secondary' }],
  },
]

const LEGACY_STEP_MAP: Record<string, WorkflowStepId> = {
  PATIENT_ASSESSMENT: 'ARRIVED_SCENE',
  PATIENT_LOADED: 'ARRIVED_SCENE',
  PATIENT_HANDOVER: 'ARRIVED_HOSPITAL',
}

const PHASE_STORAGE_KEY = (missionId: string) => `eads-driver-workflow:${missionId}`
const META_STORAGE_KEY = (missionId: string) => `eads-driver-workflow-meta:${missionId}`

export type WorkflowStageMeta = {
  timestamps: Partial<Record<WorkflowStepId, string>>
  gps: Partial<Record<WorkflowStepId, { lat: number; lng: number }>>
  notes: Partial<Record<WorkflowStepId, string>>
  completedMilestones?: Partial<
    Record<
      'start_case' | 'going_to_patient' | 'arrived_at_patient' | 'going_to_hospital' | 'arrived_at_hospital',
      boolean
    >
  >
  reviewedAt?: string
  enRouteStartedAt?: string
  eta?: string
  severity?: string
  hospital?: string
  fuel?: string
  mileage?: string
  signature?: string
  runReportSubmitted?: boolean
}

export function markCaseReviewed(missionId: string) {
  patchWorkflowMeta(missionId, { reviewedAt: new Date().toISOString() })
}

export function getStoredPhase(missionId: string): WorkflowStepId | null {
  if (typeof window === 'undefined') return null
  const raw = sessionStorage.getItem(PHASE_STORAGE_KEY(missionId)) as WorkflowStepId | null
  if (!raw) return null
  return LEGACY_STEP_MAP[raw] ?? raw
}

export function setStoredPhase(missionId: string, phase: WorkflowStepId) {
  if (typeof window === 'undefined') return
  sessionStorage.setItem(PHASE_STORAGE_KEY(missionId), phase)
}

export function clearStoredPhase(missionId: string) {
  if (typeof window === 'undefined') return
  sessionStorage.removeItem(PHASE_STORAGE_KEY(missionId))
  sessionStorage.removeItem(META_STORAGE_KEY(missionId))
}

export function getWorkflowMeta(missionId: string): WorkflowStageMeta {
  if (typeof window === 'undefined') return { timestamps: {}, gps: {}, notes: {} }
  try {
    const raw = sessionStorage.getItem(META_STORAGE_KEY(missionId))
    if (!raw) return { timestamps: {}, gps: {}, notes: {} }
    return JSON.parse(raw) as WorkflowStageMeta
  } catch {
    return { timestamps: {}, gps: {}, notes: {} }
  }
}

export function patchWorkflowMeta(missionId: string, patch: Partial<WorkflowStageMeta>) {
  if (typeof window === 'undefined') return
  const current = getWorkflowMeta(missionId)
  sessionStorage.setItem(META_STORAGE_KEY(missionId), JSON.stringify({ ...current, ...patch }))
}

export function markDriverMilestoneComplete(
  missionId: string,
  milestone:
    | 'start_case'
    | 'going_to_patient'
    | 'arrived_at_patient'
    | 'going_to_hospital'
    | 'arrived_at_hospital',
) {
  const meta = getWorkflowMeta(missionId)
  patchWorkflowMeta(missionId, {
    completedMilestones: { ...meta.completedMilestones, [milestone]: true },
  })
}

export function stampWorkflowStage(
  missionId: string,
  stepId: WorkflowStepId,
  gps?: { lat: number; lng: number } | null,
) {
  const meta = getWorkflowMeta(missionId)
  meta.timestamps[stepId] = new Date().toISOString()
  if (gps) meta.gps[stepId] = gps
  patchWorkflowMeta(missionId, meta)
}

export function resolveWorkflowStep(mission: DriverMission | null): WorkflowStepId {
  if (!mission) return 'ASSIGNED'
  const stored = getStoredPhase(mission.id)
  const status = mission.status

  if (status === 'COMPLETED' || status === 'CANCELLED') return 'MISSION_COMPLETED'
  if (status === 'ARRIVED_HOSPITAL') {
    if (stored === 'MISSION_COMPLETED') return 'MISSION_COMPLETED'
    return 'ARRIVED_HOSPITAL'
  }
  if (status === 'TRANSPORTING') return 'EN_ROUTE_HOSPITAL'
  if (status === 'ARRIVED_SCENE' || status === 'PATIENT_STABILIZED') {
    if (stored === 'EN_ROUTE_HOSPITAL') return 'EN_ROUTE_HOSPITAL'
    return 'ARRIVED_SCENE'
  }
  if (status === 'DISPATCHED' || status === 'EN_ROUTE') {
    if (stored === 'EN_ROUTE_SCENE') return 'EN_ROUTE_SCENE'
    return 'EN_ROUTE_SCENE'
  }
  if (status === 'ASSIGNED') {
    if (stored === 'EN_ROUTE_SCENE' || stored === 'ACCEPTED') return 'EN_ROUTE_SCENE'
    return 'ASSIGNED'
  }
  return stored || 'ASSIGNED'
}

export function stepFromBackendStatus(status: string): WorkflowStepId {
  if (status === 'COMPLETED' || status === 'CANCELLED') return 'MISSION_COMPLETED'
  if (status === 'ARRIVED_HOSPITAL') return 'ARRIVED_HOSPITAL'
  if (status === 'TRANSPORTING') return 'EN_ROUTE_HOSPITAL'
  if (status === 'ARRIVED_SCENE' || status === 'PATIENT_STABILIZED') return 'ARRIVED_SCENE'
  if (status === 'DISPATCHED' || status === 'EN_ROUTE') return 'EN_ROUTE_SCENE'
  return 'ASSIGNED'
}

export function getDriverTimelineIndex(stepId: WorkflowStepId): number {
  if (stepId === 'MISSION_COMPLETED') return DRIVER_TIMELINE_STEPS.length - 1
  if (stepId === 'ARRIVED_HOSPITAL') return DRIVER_TIMELINE_STEPS.length - 1
  const idx = DRIVER_TIMELINE_STEPS.findIndex((t) => t.stepIds.includes(stepId))
  return idx >= 0 ? idx : 0
}

export function getStepIndex(stepId: WorkflowStepId): number {
  return MISSION_EXECUTION_STEPS.findIndex((s) => s.id === stepId)
}

export function getCurrentStep(mission: DriverMission | null): WorkflowStep {
  const id = resolveWorkflowStep(mission)
  return MISSION_EXECUTION_STEPS.find((s) => s.id === id) ?? MISSION_EXECUTION_STEPS[0]
}

export function getStepTimestamp(mission: DriverMission, stepId: WorkflowStepId): string | null {
  const meta = getWorkflowMeta(mission.id)
  if (meta.timestamps[stepId]) return meta.timestamps[stepId]!

  const fieldMap: Partial<Record<WorkflowStepId, keyof DriverMission>> = {
    ASSIGNED: 'assignedAt',
    ACCEPTED: 'dispatchedAt',
    EN_ROUTE_SCENE: 'dispatchedAt',
    ARRIVED_SCENE: 'arrivedAtSceneAt',
    EN_ROUTE_HOSPITAL: 'departedSceneAt',
    ARRIVED_HOSPITAL: 'arrivedDestinationAt',
    MISSION_COMPLETED: 'completedAt',
  }
  const field = fieldMap[stepId]
  if (field && mission[field]) return String(mission[field])
  return null
}

export function normalizeMissionStatus(status: string): string {
  if (status === 'ON_SCENE') return 'ARRIVED_SCENE'
  return status
}
