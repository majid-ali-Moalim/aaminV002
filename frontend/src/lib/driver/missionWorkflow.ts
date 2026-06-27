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

/** Compact 5-step timeline shown in the case workspace (transport only — clinical work is on the nurse side). */
export type DriverTimelineStep = {
  id: string
  label: string
  shortLabel: string
  description: string
  stepIds: WorkflowStepId[]
}

export const DRIVER_TIMELINE_STEPS: DriverTimelineStep[] = [
  {
    id: 'ACCEPT',
    label: 'Accept Assignment',
    shortLabel: 'Accept',
    description: 'Review dispatch details and confirm you are responding.',
    stepIds: ['ASSIGNED', 'ACCEPTED'],
  },
  {
    id: 'EN_ROUTE',
    label: 'En Route to Scene',
    shortLabel: 'En Route',
    description: 'Navigate to the incident location.',
    stepIds: ['EN_ROUTE_SCENE'],
  },
  {
    id: 'ON_SCENE',
    label: 'On Scene',
    shortLabel: 'On Scene',
    description: 'Confirm arrival — the nurse handles patient care on scene.',
    stepIds: ['ARRIVED_SCENE'],
  },
  {
    id: 'TRANSPORT',
    label: 'Transport to Hospital',
    shortLabel: 'Transport',
    description: 'Drive to the receiving facility and confirm hospital arrival.',
    stepIds: ['EN_ROUTE_HOSPITAL', 'ARRIVED_HOSPITAL'],
  },
]

export const MISSION_EXECUTION_STEPS: WorkflowStep[] = [
  {
    id: 'ASSIGNED',
    label: 'Assigned',
    shortLabel: 'Assigned',
    description: 'New emergency assignment — review details and accept.',
    backendStatus: 'ASSIGNED',
    primaryAdvance: 'accept',
    actions: [
      { id: 'view_details', label: 'Review Case Details', variant: 'primary' },
      { id: 'accept', label: 'Accept Assignment', variant: 'primary' },
    ],
  },
  {
    id: 'ACCEPTED',
    label: 'Accepted',
    shortLabel: 'Accepted',
    description: 'Assignment accepted — start en route to the scene.',
    backendStatus: 'DISPATCHED',
    primaryAdvance: 'start_navigation',
    actions: [
      { id: 'start_navigation', label: 'Start En Route to Scene', variant: 'primary' },
      { id: 'view_details', label: 'View Case Details', variant: 'secondary' },
    ],
  },
  {
    id: 'EN_ROUTE_SCENE',
    label: 'En Route to Scene',
    shortLabel: 'En Route',
    description: 'Proceed to the incident location.',
    backendStatus: 'DISPATCHED',
    primaryAdvance: 'mark_arrival',
    actions: [
      { id: 'mark_arrival', label: 'Mark Arrival at Scene', variant: 'primary' },
      { id: 'update_eta', label: 'Update ETA', variant: 'secondary' },
      { id: 'request_backup', label: 'Request Backup', variant: 'secondary' },
      { id: 'report_delay', label: 'Report Delay', variant: 'danger' },
    ],
  },
  {
    id: 'ARRIVED_SCENE',
    label: 'On Scene',
    shortLabel: 'On Scene',
    description: 'Crew is on scene. Start transport when the nurse confirms the patient is ready.',
    backendStatus: 'ARRIVED_SCENE',
    primaryAdvance: 'start_transport',
    actions: [
      { id: 'start_transport', label: 'Start Transport to Hospital', variant: 'primary' },
      { id: 'view_details', label: 'View Case Details', variant: 'secondary' },
    ],
  },
  {
    id: 'EN_ROUTE_HOSPITAL',
    label: 'En Route to Hospital',
    shortLabel: 'Transport',
    description: 'Transport the patient to the receiving facility.',
    backendStatus: 'TRANSPORTING',
    primaryAdvance: 'mark_hospital_arrival',
    actions: [
      { id: 'mark_hospital_arrival', label: 'Mark Hospital Arrival', variant: 'primary' },
      { id: 'update_eta', label: 'Update ETA', variant: 'secondary' },
    ],
  },
  {
    id: 'ARRIVED_HOSPITAL',
    label: 'At Hospital',
    shortLabel: 'At Hospital',
    description: 'Patient delivered — the nurse completes handover and closes the mission.',
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
  reviewedAt?: string
  enRouteStartedAt?: string
  eta?: string
  severity?: string
  hospital?: string
  fuel?: string
  mileage?: string
  signature?: string
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
    if (stored === 'ACCEPTED') return 'ACCEPTED'
    if (stored === 'EN_ROUTE_SCENE') return 'EN_ROUTE_SCENE'
    return 'EN_ROUTE_SCENE'
  }
  if (status === 'ASSIGNED') return 'ASSIGNED'
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
