import type { DriverMission } from '@/lib/stores/driverStore'

export type WorkflowStepId =
  | 'ASSIGNED'
  | 'ACCEPTED'
  | 'EN_ROUTE_SCENE'
  | 'ARRIVED_SCENE'
  | 'PATIENT_ASSESSMENT'
  | 'PATIENT_LOADED'
  | 'EN_ROUTE_HOSPITAL'
  | 'ARRIVED_HOSPITAL'
  | 'PATIENT_HANDOVER'
  | 'MISSION_COMPLETED'

export type WorkflowActionId =
  | 'accept'
  | 'view_details'
  | 'start_navigation'
  | 'contact_dispatcher'
  | 'open_gps'
  | 'update_eta'
  | 'request_backup'
  | 'report_delay'
  | 'mark_arrival'
  | 'notify_dispatcher'
  | 'record_condition'
  | 'select_severity'
  | 'select_hospital'
  | 'confirm_onboard'
  | 'start_transport'
  | 'navigate_hospital'
  | 'share_location'
  | 'send_eta_hospital'
  | 'mark_hospital_arrival'
  | 'notify_hospital'
  | 'complete_handover'
  | 'capture_signature'
  | 'upload_notes'
  | 'submit_report'
  | 'record_fuel'
  | 'record_mileage'
  | 'mark_available'
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

export const MISSION_EXECUTION_STEPS: WorkflowStep[] = [
  {
    id: 'ASSIGNED',
    label: 'Assigned',
    shortLabel: 'Assigned',
    description: 'New emergency assignment — review details and accept.',
    backendStatus: 'ASSIGNED',
    primaryAdvance: 'accept',
    actions: [
      { id: 'accept', label: 'Accept Assignment', variant: 'primary' },
      { id: 'view_details', label: 'View Case Details', variant: 'secondary' },
    ],
  },
  {
    id: 'ACCEPTED',
    label: 'Accepted',
    shortLabel: 'Accepted',
    description: 'Assignment accepted — prepare for response.',
    backendStatus: 'DISPATCHED',
    primaryAdvance: 'start_navigation',
    actions: [
      { id: 'start_navigation', label: 'Start Navigation', variant: 'primary' },
      { id: 'contact_dispatcher', label: 'Contact Dispatcher', variant: 'secondary' },
      { id: 'view_details', label: 'View Case Details', variant: 'secondary' },
    ],
  },
  {
    id: 'EN_ROUTE_SCENE',
    label: 'En Route to Scene',
    shortLabel: 'En Route',
    description: 'Proceed to incident location using shared GPS coordinates.',
    backendStatus: 'DISPATCHED',
    primaryAdvance: 'mark_arrival',
    actions: [
      { id: 'open_gps', label: 'Open GPS Navigation', variant: 'primary' },
      { id: 'mark_arrival', label: 'Mark Arrival at Scene', variant: 'primary' },
      { id: 'update_eta', label: 'Update ETA', variant: 'secondary' },
      { id: 'request_backup', label: 'Request Backup', variant: 'secondary' },
      { id: 'report_delay', label: 'Report Delay', variant: 'danger' },
    ],
  },
  {
    id: 'ARRIVED_SCENE',
    label: 'Arrived at Scene',
    shortLabel: 'On Scene',
    description: 'Confirm arrival and notify dispatch.',
    backendStatus: 'ARRIVED_SCENE',
    primaryAdvance: 'advance',
    actions: [
      { id: 'advance', label: 'Begin Patient Assessment', variant: 'primary' },
      { id: 'notify_dispatcher', label: 'Notify Dispatcher', variant: 'secondary' },
    ],
  },
  {
    id: 'PATIENT_ASSESSMENT',
    label: 'Patient Assessment',
    shortLabel: 'Assessment',
    description: 'Document patient condition and select destination.',
    backendStatus: 'ARRIVED_SCENE',
    primaryAdvance: 'advance',
    actions: [
      { id: 'record_condition', label: 'Record Patient Condition', variant: 'primary' },
      { id: 'select_severity', label: 'Select Severity Level', variant: 'secondary' },
      { id: 'select_hospital', label: 'Select Destination Hospital', variant: 'secondary' },
    ],
  },
  {
    id: 'PATIENT_LOADED',
    label: 'Patient Loaded',
    shortLabel: 'Loaded',
    description: 'Confirm patient is onboard and ready for transport.',
    backendStatus: 'ARRIVED_SCENE',
    primaryAdvance: 'start_transport',
    actions: [
      { id: 'confirm_onboard', label: 'Confirm Patient On Board', variant: 'primary' },
      { id: 'start_transport', label: 'Start Transport', variant: 'primary' },
    ],
  },
  {
    id: 'EN_ROUTE_HOSPITAL',
    label: 'En Route to Hospital',
    shortLabel: 'Transport',
    description: 'Transport patient to receiving facility.',
    backendStatus: 'TRANSPORTING',
    primaryAdvance: 'mark_hospital_arrival',
    actions: [
      { id: 'navigate_hospital', label: 'Navigate to Hospital', variant: 'primary' },
      { id: 'mark_hospital_arrival', label: 'Mark Hospital Arrival', variant: 'primary' },
      { id: 'share_location', label: 'Share Live Location', variant: 'secondary' },
      { id: 'send_eta_hospital', label: 'Send ETA to Hospital', variant: 'secondary' },
    ],
  },
  {
    id: 'ARRIVED_HOSPITAL',
    label: 'Arrived at Hospital',
    shortLabel: 'At Hospital',
    description: 'Confirm hospital arrival and notify receiving staff.',
    backendStatus: 'ARRIVED_HOSPITAL',
    primaryAdvance: 'advance',
    actions: [
      { id: 'advance', label: 'Begin Patient Handover', variant: 'primary' },
      { id: 'notify_hospital', label: 'Notify Receiving Hospital', variant: 'secondary' },
    ],
  },
  {
    id: 'PATIENT_HANDOVER',
    label: 'Patient Handover',
    shortLabel: 'Handover',
    description: 'Complete clinical handover and documentation.',
    backendStatus: 'ARRIVED_HOSPITAL',
    primaryAdvance: 'complete_handover',
    actions: [
      { id: 'complete_handover', label: 'Complete Handover Form', variant: 'primary' },
      { id: 'capture_signature', label: 'Capture Digital Signature', variant: 'secondary' },
      { id: 'upload_notes', label: 'Upload Notes', variant: 'secondary' },
    ],
  },
  {
    id: 'MISSION_COMPLETED',
    label: 'Mission Completed',
    shortLabel: 'Complete',
    description: 'Finalize mission report and return to service.',
    backendStatus: 'COMPLETED',
    actions: [
      { id: 'submit_report', label: 'Submit Mission Report', variant: 'primary' },
      { id: 'record_fuel', label: 'Record Fuel Usage', variant: 'secondary' },
      { id: 'record_mileage', label: 'Record Mileage', variant: 'secondary' },
      { id: 'mark_available', label: 'Mark Ambulance Available', variant: 'primary' },
    ],
  },
]

const PHASE_STORAGE_KEY = (missionId: string) => `eads-driver-workflow:${missionId}`
const META_STORAGE_KEY = (missionId: string) => `eads-driver-workflow-meta:${missionId}`

export type WorkflowStageMeta = {
  timestamps: Partial<Record<WorkflowStepId, string>>
  gps: Partial<Record<WorkflowStepId, { lat: number; lng: number }>>
  notes: Partial<Record<WorkflowStepId, string>>
  eta?: string
  severity?: string
  hospital?: string
  fuel?: string
  mileage?: string
  signature?: string
}

export function getStoredPhase(missionId: string): WorkflowStepId | null {
  if (typeof window === 'undefined') return null
  return sessionStorage.getItem(PHASE_STORAGE_KEY(missionId)) as WorkflowStepId | null
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

  if (status === 'COMPLETED') return 'MISSION_COMPLETED'
  if (status === 'ARRIVED_HOSPITAL') {
    if (stored === 'PATIENT_HANDOVER') return 'PATIENT_HANDOVER'
    return 'ARRIVED_HOSPITAL'
  }
  if (status === 'TRANSPORTING') return 'EN_ROUTE_HOSPITAL'
  if (status === 'ARRIVED_SCENE') {
    if (stored === 'PATIENT_LOADED') return 'PATIENT_LOADED'
    if (stored === 'PATIENT_ASSESSMENT') return 'PATIENT_ASSESSMENT'
    return 'ARRIVED_SCENE'
  }
  if (status === 'DISPATCHED') {
    if (stored === 'ACCEPTED') return 'ACCEPTED'
    return 'EN_ROUTE_SCENE'
  }
  if (status === 'ASSIGNED') return 'ASSIGNED'
  return 'ASSIGNED'
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
