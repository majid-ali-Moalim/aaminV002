/** Nurse mission workflow — clinical stages only (transport/en-route handled by driver) */

export type NurseWorkflowStepId =
  | 'MISSION_ASSIGNED'
  | 'PATIENT_ASSESSMENT'
  | 'VITAL_SIGNS'
  | 'MEDICAL_NOTES'
  | 'PATIENT_LOADED'
  | 'TREATMENT'
  | 'PATIENT_MONITORING'
  | 'HOSPITAL_HANDOVER'
  | 'COMPLETE_DOCUMENTATION'
  | 'MISSION_CLOSED'

export type NurseTaskId =
  | 'accept'
  | 'view_case'
  | 'review_emergency'
  | 'begin_care'
  | 'assessment'
  | 'vitals'
  | 'notes'
  | 'load_patient'
  | 'treatment'
  | 'monitoring'
  | 'handover'
  | 'documentation'
  | 'close_mission'
  | 'advance'

export type NurseWorkflowAction = {
  id: NurseTaskId
  label: string
  variant?: 'primary' | 'secondary' | 'danger'
}

export type NurseWorkflowStep = {
  id: NurseWorkflowStepId
  label: string
  shortLabel: string
  description: string
  actions: NurseWorkflowAction[]
  primaryTask?: NurseTaskId
  backendStatus?: string | string[]
}

/** Compact 5-step timeline shown in the mission workspace */
export type NurseTimelineStep = {
  id: string
  label: string
  shortLabel: string
  description: string
  stepIds: NurseWorkflowStepId[]
}

export const NURSE_TIMELINE_STEPS: NurseTimelineStep[] = [
  {
    id: 'ACCEPT',
    label: 'Accept Mission',
    shortLabel: 'Accept',
    description: 'Review assignment and confirm you are ready for patient care.',
    stepIds: ['MISSION_ASSIGNED'],
  },
  {
    id: 'PATIENT_CARE',
    label: 'Patient Care',
    shortLabel: 'Care',
    description: 'Assessment, vital signs, medical notes, and patient loading at the scene.',
    stepIds: ['PATIENT_ASSESSMENT', 'VITAL_SIGNS', 'MEDICAL_NOTES', 'PATIENT_LOADED'],
  },
  {
    id: 'TREATMENT',
    label: 'Treatment & Monitoring',
    shortLabel: 'Treatment',
    description: 'Interventions and ongoing monitoring while the driver transports.',
    stepIds: ['TREATMENT', 'PATIENT_MONITORING'],
  },
  {
    id: 'HANDOVER',
    label: 'Hospital Handover',
    shortLabel: 'Handover',
    description: 'Transfer patient information to receiving staff.',
    stepIds: ['HOSPITAL_HANDOVER', 'COMPLETE_DOCUMENTATION'],
  },
  {
    id: 'CLOSED',
    label: 'Mission Complete',
    shortLabel: 'Done',
    description: 'All clinical records saved and case closed.',
    stepIds: ['MISSION_CLOSED'],
  },
]

export const NURSE_WORKFLOW_STEPS: NurseWorkflowStep[] = [
  {
    id: 'MISSION_ASSIGNED',
    label: 'Mission Assigned',
    shortLabel: 'Assigned',
    description: 'Review the case and accept the mission. Start patient care when the crew is on scene.',
    backendStatus: 'ASSIGNED',
    primaryTask: 'accept',
    actions: [
      { id: 'view_case', label: 'Review Case Details', variant: 'primary' },
      { id: 'accept', label: 'Accept Mission', variant: 'primary' },
    ],
  },
  {
    id: 'PATIENT_ASSESSMENT',
    label: 'Patient Assessment',
    shortLabel: 'Assessment',
    description: 'Record chief complaint, symptoms, injuries, and assessment notes.',
    backendStatus: ['ARRIVED_SCENE', 'PATIENT_STABILIZED'],
    primaryTask: 'assessment',
    actions: [{ id: 'assessment', label: 'Record Assessment', variant: 'primary' }],
  },
  {
    id: 'VITAL_SIGNS',
    label: 'Vital Signs',
    shortLabel: 'Vitals',
    description: 'Blood pressure, pulse, temperature, SpO₂, and respiratory rate.',
    primaryTask: 'vitals',
    actions: [{ id: 'vitals', label: 'Record Vital Signs', variant: 'primary' }],
  },
  {
    id: 'MEDICAL_NOTES',
    label: 'Medical Notes',
    shortLabel: 'Notes',
    description: 'Observations, patient condition, and progress updates.',
    primaryTask: 'notes',
    actions: [{ id: 'notes', label: 'Add Medical Notes', variant: 'primary' }],
  },
  {
    id: 'PATIENT_LOADED',
    label: 'Patient Loaded',
    shortLabel: 'Loaded',
    description: 'Confirm the patient is loaded and ready for transport.',
    backendStatus: ['ARRIVED_SCENE', 'PATIENT_STABILIZED'],
    primaryTask: 'load_patient',
    actions: [{ id: 'load_patient', label: 'Confirm Patient Loaded', variant: 'primary' }],
  },
  {
    id: 'TREATMENT',
    label: 'Treatment & Monitoring',
    shortLabel: 'Treatment',
    description: 'Interventions, medication, medical notes, and monitoring during transport.',
    primaryTask: 'treatment',
    actions: [{ id: 'treatment', label: 'Record Treatment', variant: 'primary' }],
  },
  {
    id: 'PATIENT_MONITORING',
    label: 'Patient Monitoring',
    shortLabel: 'Monitoring',
    description: 'Update vitals and condition notes while en route to hospital.',
    backendStatus: 'TRANSPORTING',
    primaryTask: 'monitoring',
    actions: [{ id: 'monitoring', label: 'Update Monitoring', variant: 'primary' }],
  },
  {
    id: 'HOSPITAL_HANDOVER',
    label: 'Hospital Handover',
    shortLabel: 'Handover',
    description: 'Complete handover with receiving hospital staff.',
    backendStatus: 'ARRIVED_HOSPITAL',
    primaryTask: 'handover',
    actions: [{ id: 'handover', label: 'Complete Handover', variant: 'primary' }],
  },
  {
    id: 'COMPLETE_DOCUMENTATION',
    label: 'Complete Documentation',
    shortLabel: 'Documentation',
    description: 'Review all records and close the mission.',
    primaryTask: 'documentation',
    actions: [
      { id: 'documentation', label: 'Review All Records', variant: 'primary' },
      { id: 'close_mission', label: 'Mark Mission Complete', variant: 'primary' },
    ],
  },
  {
    id: 'MISSION_CLOSED',
    label: 'Mission Closed',
    shortLabel: 'Closed',
    description: 'Mission completed — all patient records saved.',
    backendStatus: 'COMPLETED',
    actions: [{ id: 'view_case', label: 'View Case Summary', variant: 'secondary' }],
  },
]

const LEGACY_STEP_MAP: Record<string, NurseWorkflowStepId> = {
  EN_ROUTE: 'MISSION_ASSIGNED',
  ARRIVE_SCENE: 'PATIENT_ASSESSMENT',
  TRANSPORT: 'PATIENT_MONITORING',
}

const PHASE_KEY = (id: string) => `eads-nurse-workflow:${id}`
const META_KEY = (id: string) => `eads-nurse-workflow-meta:${id}`

export type NurseWorkflowMeta = {
  timestamps: Partial<Record<NurseWorkflowStepId, string>>
  acceptedAt?: string
  reviewedAt?: string
  activityLog: Array<{ time: string; text: string }>
  completedTasks: Partial<Record<NurseWorkflowStepId, boolean>>
}

export function markNurseCaseReviewed(missionId: string) {
  patchNurseWorkflowMeta(missionId, { reviewedAt: new Date().toISOString() })
}

export function getStoredNursePhase(missionId: string): NurseWorkflowStepId | null {
  if (typeof window === 'undefined') return null
  const raw = sessionStorage.getItem(PHASE_KEY(missionId)) as NurseWorkflowStepId | null
  if (!raw) return null
  return LEGACY_STEP_MAP[raw] ?? raw
}

export function setStoredNursePhase(missionId: string, phase: NurseWorkflowStepId) {
  if (typeof window === 'undefined') return
  sessionStorage.setItem(PHASE_KEY(missionId), phase)
}

export function clearStoredNursePhase(missionId: string) {
  if (typeof window === 'undefined') return
  sessionStorage.removeItem(PHASE_KEY(missionId))
  sessionStorage.removeItem(META_KEY(missionId))
}

export function getNurseWorkflowMeta(missionId: string): NurseWorkflowMeta {
  if (typeof window === 'undefined') return { timestamps: {}, activityLog: [], completedTasks: {} }
  try {
    const raw = sessionStorage.getItem(META_KEY(missionId))
    if (!raw) return { timestamps: {}, activityLog: [], completedTasks: {} }
    return JSON.parse(raw) as NurseWorkflowMeta
  } catch {
    return { timestamps: {}, activityLog: [], completedTasks: {} }
  }
}

export function patchNurseWorkflowMeta(missionId: string, patch: Partial<NurseWorkflowMeta>) {
  if (typeof window === 'undefined') return
  const current = getNurseWorkflowMeta(missionId)
  sessionStorage.setItem(META_KEY(missionId), JSON.stringify({ ...current, ...patch }))
}

export function logNurseActivity(missionId: string, text: string) {
  const meta = getNurseWorkflowMeta(missionId)
  const entry = { time: new Date().toISOString(), text }
  patchNurseWorkflowMeta(missionId, { activityLog: [entry, ...meta.activityLog].slice(0, 50) })
}

export function stampNurseStage(missionId: string, stepId: NurseWorkflowStepId) {
  const meta = getNurseWorkflowMeta(missionId)
  meta.timestamps[stepId] = new Date().toISOString()
  patchNurseWorkflowMeta(missionId, meta)
}

export function markStepComplete(missionId: string, stepId: NurseWorkflowStepId) {
  const meta = getNurseWorkflowMeta(missionId)
  meta.completedTasks[stepId] = true
  patchNurseWorkflowMeta(missionId, meta)
}

const CLINICAL_STEPS: NurseWorkflowStepId[] = [
  'PATIENT_ASSESSMENT',
  'VITAL_SIGNS',
  'MEDICAL_NOTES',
  'PATIENT_LOADED',
  'TREATMENT',
  'PATIENT_MONITORING',
  'HOSPITAL_HANDOVER',
  'COMPLETE_DOCUMENTATION',
]

/** Driver must be on scene before nurse starts clinical care. */
const ON_SCENE_STATUSES = ['ARRIVED_SCENE', 'PATIENT_STABILIZED']

const PRE_SCENE_STATUSES = ['ASSIGNED', 'DISPATCHED', 'EN_ROUTE']

export function getMaxStepForMissionStatus(status: string): NurseWorkflowStepId {
  if (status === 'COMPLETED' || status === 'CANCELLED') return 'MISSION_CLOSED'
  if (status === 'ARRIVED_HOSPITAL') return 'COMPLETE_DOCUMENTATION'
  if (status === 'TRANSPORTING') return 'PATIENT_MONITORING'
  if (ON_SCENE_STATUSES.includes(status)) return 'PATIENT_LOADED'
  return 'MISSION_ASSIGNED'
}

export function clampNurseWorkflowStep(stepId: NurseWorkflowStepId, status: string): NurseWorkflowStepId {
  const maxStep = getMaxStepForMissionStatus(status)
  const stepIdx = getNurseStepIndex(stepId)
  const maxIdx = getNurseStepIndex(maxStep)
  if (stepIdx < 0 || maxIdx < 0) return maxStep
  return stepIdx <= maxIdx ? stepId : maxStep
}

export function canStartPatientCare(status: string): boolean {
  return ON_SCENE_STATUSES.includes(status)
}

export function canDoPatientCareTasks(status: string): boolean {
  return ON_SCENE_STATUSES.includes(status)
}

/** Treatment & monitoring — only while the driver is transporting the patient. */
export function canDoTreatmentMonitoring(status: string): boolean {
  return status === 'TRANSPORTING'
}

/** Hospital handover — only after the driver confirms arrival at the hospital. */
export function canDoHandover(status: string): boolean {
  return status === 'ARRIVED_HOSPITAL'
}

export function canCloseMission(status: string): boolean {
  return status === 'ARRIVED_HOSPITAL' || status === 'COMPLETED'
}

export function getNurseTransportPhaseMessage(status: string): string | null {
  if (status === 'ASSIGNED') {
    return 'Accept the mission. Clinical steps unlock as the driver progresses the case.'
  }
  if (PRE_SCENE_STATUSES.includes(status)) {
    return 'Waiting for the driver to arrive on scene. Patient care unlocks when the crew marks scene arrival.'
  }
  if (ON_SCENE_STATUSES.includes(status)) {
    return 'On scene — complete assessment and notes. Treatment unlocks when the driver starts transport.'
  }
  if (status === 'TRANSPORTING') {
    return 'Patient is en route to hospital. Handover unlocks when the driver marks hospital arrival.'
  }
  return null
}

export function getNurseTaskBlockReason(taskId: string, status: string): string | null {
  if (['assessment', 'vitals', 'notes', 'load_patient', 'begin_care'].includes(taskId) && !canDoPatientCareTasks(status)) {
    return 'Patient care requires the driver to be on scene (Arrived at Scene).'
  }
  if (['treatment', 'monitoring'].includes(taskId) && !canDoTreatmentMonitoring(status)) {
    return 'Treatment and monitoring require the driver to start transport to hospital.'
  }
  if (['handover', 'documentation', 'close_mission'].includes(taskId) && !canDoHandover(status) && status !== 'COMPLETED') {
    if (status === 'TRANSPORTING') {
      return 'Handover unlocks when the driver marks arrival at the hospital.'
    }
    return 'Hospital handover requires the driver to arrive at the receiving facility.'
  }
  return null
}

export function resolveNurseWorkflowStep(mission: { id: string; status: string } | null): NurseWorkflowStepId {
  if (!mission) return 'MISSION_ASSIGNED'
  const stored = getStoredNursePhase(mission.id)
  const meta = getNurseWorkflowMeta(mission.id)
  const status = mission.status

  if (status === 'COMPLETED' || status === 'CANCELLED') return 'MISSION_CLOSED'

  let resolved: NurseWorkflowStepId = 'MISSION_ASSIGNED'

  if (status === 'ARRIVED_HOSPITAL') {
    if (stored === 'COMPLETE_DOCUMENTATION') resolved = 'COMPLETE_DOCUMENTATION'
    else if (stored === 'HOSPITAL_HANDOVER') resolved = 'HOSPITAL_HANDOVER'
    else resolved = 'HOSPITAL_HANDOVER'
  } else if (status === 'TRANSPORTING') {
    if (stored && ['TREATMENT', 'PATIENT_MONITORING'].includes(stored)) resolved = stored
    else resolved = 'TREATMENT'
  } else if (ON_SCENE_STATUSES.includes(status)) {
    if (stored && ['PATIENT_ASSESSMENT', 'VITAL_SIGNS', 'MEDICAL_NOTES', 'PATIENT_LOADED'].includes(stored)) resolved = stored
    else if (meta.acceptedAt) resolved = 'PATIENT_ASSESSMENT'
    else resolved = 'MISSION_ASSIGNED'
  } else if (PRE_SCENE_STATUSES.includes(status) || status === 'ASSIGNED') {
    resolved = meta.acceptedAt ? 'MISSION_ASSIGNED' : 'MISSION_ASSIGNED'
  } else if (stored) {
    resolved = stored
  }

  return clampNurseWorkflowStep(resolved, status)
}

export function getNurseStepIndex(stepId: NurseWorkflowStepId): number {
  return NURSE_WORKFLOW_STEPS.findIndex((s) => s.id === stepId)
}

export function getNurseTimelineIndex(stepId: NurseWorkflowStepId): number {
  if (stepId === 'MISSION_CLOSED') return NURSE_TIMELINE_STEPS.length - 1
  const idx = NURSE_TIMELINE_STEPS.findIndex((t) => t.stepIds.includes(stepId))
  return idx >= 0 ? idx : 0
}

export function getNurseCurrentStep(mission: { id: string; status: string } | null): NurseWorkflowStep {
  const id = resolveNurseWorkflowStep(mission)
  return NURSE_WORKFLOW_STEPS.find((s) => s.id === id) ?? NURSE_WORKFLOW_STEPS[0]
}

export function getNextStepId(current: NurseWorkflowStepId): NurseWorkflowStepId | null {
  const idx = getNurseStepIndex(current)
  if (idx < 0 || idx >= NURSE_WORKFLOW_STEPS.length - 1) return null
  return NURSE_WORKFLOW_STEPS[idx + 1].id
}

export function stepFromBackendStatus(status: string): NurseWorkflowStepId {
  return clampNurseWorkflowStep(
    (() => {
      if (status === 'COMPLETED' || status === 'CANCELLED') return 'MISSION_CLOSED'
      if (status === 'ARRIVED_HOSPITAL') return 'HOSPITAL_HANDOVER'
      if (status === 'TRANSPORTING') return 'TREATMENT'
      if (ON_SCENE_STATUSES.includes(status)) return 'PATIENT_ASSESSMENT'
      return 'MISSION_ASSIGNED'
    })(),
    status,
  )
}
