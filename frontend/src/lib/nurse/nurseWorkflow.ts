/** Nurse mission workflow — 12 clinical stages aligned with EMS operations */

export type NurseWorkflowStepId =
  | 'MISSION_ASSIGNED'
  | 'EN_ROUTE'
  | 'ARRIVE_SCENE'
  | 'PATIENT_ASSESSMENT'
  | 'VITAL_SIGNS'
  | 'MEDICAL_NOTES'
  | 'TREATMENT'
  | 'PATIENT_MONITORING'
  | 'TRANSPORT'
  | 'HOSPITAL_HANDOVER'
  | 'COMPLETE_DOCUMENTATION'
  | 'MISSION_CLOSED'

export type NurseTaskId =
  | 'accept'
  | 'view_case'
  | 'review_emergency'
  | 'contact_driver'
  | 'contact_dispatcher'
  | 'begin_care'
  | 'assessment'
  | 'vitals'
  | 'notes'
  | 'treatment'
  | 'monitoring'
  | 'coordinate_hospital'
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

export const NURSE_WORKFLOW_STEPS: NurseWorkflowStep[] = [
  {
    id: 'MISSION_ASSIGNED',
    label: 'Mission Assigned',
    shortLabel: 'Assigned',
    description: 'Review case details and accept the mission.',
    backendStatus: 'ASSIGNED',
    primaryTask: 'accept',
    actions: [
      { id: 'view_case', label: 'View Case Details', variant: 'secondary' },
      { id: 'accept', label: 'Accept Mission', variant: 'primary' },
    ],
  },
  {
    id: 'EN_ROUTE',
    label: 'En Route',
    shortLabel: 'En Route',
    description: 'Review emergency information and stay in contact with driver and dispatcher.',
    backendStatus: ['DISPATCHED', 'EN_ROUTE'],
    primaryTask: 'review_emergency',
    actions: [
      { id: 'review_emergency', label: 'Review Emergency Info', variant: 'primary' },
      { id: 'contact_driver', label: 'Contact Driver', variant: 'secondary' },
      { id: 'contact_dispatcher', label: 'Contact Dispatcher', variant: 'secondary' },
    ],
  },
  {
    id: 'ARRIVE_SCENE',
    label: 'Arrive at Scene',
    shortLabel: 'On Scene',
    description: 'Driver has arrived — begin patient care.',
    backendStatus: 'ARRIVED_SCENE',
    primaryTask: 'begin_care',
    actions: [
      { id: 'begin_care', label: 'Begin Patient Care', variant: 'primary' },
      { id: 'contact_driver', label: 'Contact Driver', variant: 'secondary' },
    ],
  },
  {
    id: 'PATIENT_ASSESSMENT',
    label: 'Patient Assessment',
    shortLabel: 'Assessment',
    description: 'Check condition, symptoms, injuries, and assessment notes.',
    backendStatus: ['ARRIVED_SCENE', 'PATIENT_STABILIZED'],
    primaryTask: 'assessment',
    actions: [
      { id: 'assessment', label: 'Record Assessment', variant: 'primary' },
      { id: 'advance', label: 'Continue to Vital Signs', variant: 'secondary' },
    ],
  },
  {
    id: 'VITAL_SIGNS',
    label: 'Vital Signs',
    shortLabel: 'Vitals',
    description: 'Blood pressure, pulse, temperature, SpO₂, respiratory rate.',
    primaryTask: 'vitals',
    actions: [
      { id: 'vitals', label: 'Record Vital Signs', variant: 'primary' },
      { id: 'advance', label: 'Continue to Medical Notes', variant: 'secondary' },
    ],
  },
  {
    id: 'MEDICAL_NOTES',
    label: 'Medical Notes',
    shortLabel: 'Notes',
    description: 'Observations, patient condition, and progress updates.',
    primaryTask: 'notes',
    actions: [
      { id: 'notes', label: 'Add Medical Notes', variant: 'primary' },
      { id: 'advance', label: 'Continue to Treatment', variant: 'secondary' },
    ],
  },
  {
    id: 'TREATMENT',
    label: 'Treatment',
    shortLabel: 'Treatment',
    description: 'Oxygen, CPR, IV fluids, medication, bandaging, and other interventions.',
    primaryTask: 'treatment',
    actions: [
      { id: 'treatment', label: 'Record Treatment', variant: 'primary' },
      { id: 'advance', label: 'Ready for Transport', variant: 'secondary' },
    ],
  },
  {
    id: 'PATIENT_MONITORING',
    label: 'Patient Monitoring',
    shortLabel: 'Monitoring',
    description: 'Update vitals, monitor condition, add monitoring notes.',
    backendStatus: 'TRANSPORTING',
    primaryTask: 'monitoring',
    actions: [
      { id: 'monitoring', label: 'Update Monitoring', variant: 'primary' },
      { id: 'notes', label: 'Add Progress Note', variant: 'secondary' },
    ],
  },
  {
    id: 'TRANSPORT',
    label: 'Transport',
    shortLabel: 'Transport',
    description: 'Continue monitoring, update notes, coordinate with hospital.',
    backendStatus: 'TRANSPORTING',
    primaryTask: 'coordinate_hospital',
    actions: [
      { id: 'monitoring', label: 'Monitor Patient', variant: 'primary' },
      { id: 'coordinate_hospital', label: 'Coordinate Hospital', variant: 'secondary' },
      { id: 'notes', label: 'Update Medical Notes', variant: 'secondary' },
    ],
  },
  {
    id: 'HOSPITAL_HANDOVER',
    label: 'Hospital Handover',
    shortLabel: 'Handover',
    description: 'Transfer patient information and complete handover with receiving staff.',
    backendStatus: 'ARRIVED_HOSPITAL',
    primaryTask: 'handover',
    actions: [
      { id: 'handover', label: 'Complete Handover', variant: 'primary' },
      { id: 'documentation', label: 'Review Documentation', variant: 'secondary' },
    ],
  },
  {
    id: 'COMPLETE_DOCUMENTATION',
    label: 'Complete Documentation',
    shortLabel: 'Documentation',
    description: 'Assessment, vitals, notes, treatments, and handover reports.',
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

const PHASE_KEY = (id: string) => `eads-nurse-workflow:${id}`
const META_KEY = (id: string) => `eads-nurse-workflow-meta:${id}`

export type NurseWorkflowMeta = {
  timestamps: Partial<Record<NurseWorkflowStepId, string>>
  acceptedAt?: string
  activityLog: Array<{ time: string; text: string }>
  completedTasks: Partial<Record<NurseWorkflowStepId, boolean>>
}

export function getStoredNursePhase(missionId: string): NurseWorkflowStepId | null {
  if (typeof window === 'undefined') return null
  return sessionStorage.getItem(PHASE_KEY(missionId)) as NurseWorkflowStepId | null
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

export function resolveNurseWorkflowStep(mission: { id: string; status: string } | null): NurseWorkflowStepId {
  if (!mission) return 'MISSION_ASSIGNED'
  const stored = getStoredNursePhase(mission.id)
  const status = mission.status

  if (status === 'COMPLETED' || status === 'CANCELLED') return 'MISSION_CLOSED'
  if (status === 'ARRIVED_HOSPITAL') {
    if (stored === 'COMPLETE_DOCUMENTATION') return 'COMPLETE_DOCUMENTATION'
    if (stored === 'HOSPITAL_HANDOVER') return 'HOSPITAL_HANDOVER'
    return 'HOSPITAL_HANDOVER'
  }
  if (status === 'TRANSPORTING') {
    if (stored === 'TRANSPORT') return 'TRANSPORT'
    if (stored === 'PATIENT_MONITORING') return 'PATIENT_MONITORING'
    return 'PATIENT_MONITORING'
  }
  if (status === 'ARRIVED_SCENE' || status === 'PATIENT_STABILIZED') {
    const clinicalSteps: NurseWorkflowStepId[] = [
      'PATIENT_ASSESSMENT',
      'VITAL_SIGNS',
      'MEDICAL_NOTES',
      'TREATMENT',
    ]
    if (stored && clinicalSteps.includes(stored)) return stored
    if (stored === 'ARRIVE_SCENE') return 'ARRIVE_SCENE'
    return stored && stored !== 'EN_ROUTE' && stored !== 'MISSION_ASSIGNED' ? stored : 'ARRIVE_SCENE'
  }
  if (status === 'DISPATCHED' || status === 'EN_ROUTE') {
    if (stored === 'EN_ROUTE') return 'EN_ROUTE'
    return stored === 'MISSION_ASSIGNED' ? 'MISSION_ASSIGNED' : 'EN_ROUTE'
  }
  if (status === 'ASSIGNED') return stored === 'EN_ROUTE' ? 'EN_ROUTE' : 'MISSION_ASSIGNED'
  return stored || 'MISSION_ASSIGNED'
}

export function getNurseStepIndex(stepId: NurseWorkflowStepId): number {
  return NURSE_WORKFLOW_STEPS.findIndex((s) => s.id === stepId)
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
  if (status === 'COMPLETED' || status === 'CANCELLED') return 'MISSION_CLOSED'
  if (status === 'ARRIVED_HOSPITAL') return 'HOSPITAL_HANDOVER'
  if (status === 'TRANSPORTING') return 'PATIENT_MONITORING'
  if (status === 'ARRIVED_SCENE' || status === 'PATIENT_STABILIZED') return 'ARRIVE_SCENE'
  if (status === 'DISPATCHED' || status === 'EN_ROUTE') return 'EN_ROUTE'
  if (status === 'ASSIGNED') return 'MISSION_ASSIGNED'
  return 'MISSION_ASSIGNED'
}
