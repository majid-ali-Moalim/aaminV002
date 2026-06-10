export type AssessmentData = {
  _type: 'assessment'
  chiefComplaint: string
  symptoms: string
  consciousnessLevel: string
  painLevel: string
  breathingStatus: string
  injuryDescription: string
  assessmentNotes: string
}

export type TreatmentData = {
  _type: 'treatment'
  treatmentType: string
  notes: string
  medication?: string
}

const ASSESSMENT_PREFIX = '[EADS_ASSESSMENT]'

export function encodeAssessment(data: Omit<AssessmentData, '_type'>): string {
  const payload: AssessmentData = { _type: 'assessment', ...data }
  return `${ASSESSMENT_PREFIX}${JSON.stringify(payload)}`
}

export function parseClinicalRecord(notes?: string | null): AssessmentData | null {
  if (!notes?.startsWith(ASSESSMENT_PREFIX)) return null
  try {
    return JSON.parse(notes.slice(ASSESSMENT_PREFIX.length)) as AssessmentData
  } catch {
    return null
  }
}

export function isAssessmentRecord(record: { clinicalNotes?: string | null }): boolean {
  return Boolean(parseClinicalRecord(record.clinicalNotes))
}

const MONITORING_PREFIX = '[EADS_MONITORING]'
const HANDOVER_PREFIX = '[EADS_HANDOVER]'

export type MonitoringData = {
  _type: 'monitoring'
  bloodPressure?: string
  heartRate?: string
  temperature?: string
  oxygenSaturation?: string
  respiratoryRate?: string
  condition?: string
  notes: string
}

export type HandoverData = {
  _type: 'handover'
  patientCondition: string
  treatmentGiven: string
  receivingStaff: string
  notes: string
  signature: string
}

export function encodeMonitoring(data: Omit<MonitoringData, '_type'>): string {
  return `${MONITORING_PREFIX}${JSON.stringify({ _type: 'monitoring', ...data })}`
}

export function parseMonitoring(notes?: string | null): MonitoringData | null {
  if (!notes?.startsWith(MONITORING_PREFIX)) return null
  try {
    return JSON.parse(notes.slice(MONITORING_PREFIX.length)) as MonitoringData
  } catch {
    return null
  }
}

export function isMonitoringRecord(record: { clinicalNotes?: string | null }): boolean {
  return Boolean(parseMonitoring(record.clinicalNotes))
}

export function encodeHandover(data: Omit<HandoverData, '_type'>): string {
  return `${HANDOVER_PREFIX}${JSON.stringify({ _type: 'handover', ...data })}`
}

export function parseHandover(notes?: string | null): HandoverData | null {
  if (!notes?.startsWith(HANDOVER_PREFIX)) return null
  try {
    return JSON.parse(notes.slice(HANDOVER_PREFIX.length)) as HandoverData
  } catch {
    return null
  }
}

export function isHandoverRecord(record: { clinicalNotes?: string | null }): boolean {
  return Boolean(parseHandover(record.clinicalNotes))
}

export function isMedicalNoteRecord(record: {
  clinicalNotes?: string | null
  treatmentGiven?: string | null
}): boolean {
  if (!record.clinicalNotes) return false
  if (isAssessmentRecord(record) || isMonitoringRecord(record) || isHandoverRecord(record)) return false
  return !record.treatmentGiven
}

export const CONSCIOUSNESS_LEVELS = ['Alert', 'Verbal', 'Pain', 'Unresponsive'] as const
export const PAIN_LEVELS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'] as const
export const BREATHING_STATUS = ['Normal', 'Labored', 'Shallow', 'Absent', 'Assisted'] as const

export const TREATMENT_TYPES = [
  'Oxygen Therapy',
  'CPR',
  'IV Fluid',
  'Bandaging',
  'Medication Given',
  'Wound Care',
  'Splinting',
  'Other',
] as const

export const MISSION_STATUS_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'assigned', label: 'Assigned', statuses: ['ASSIGNED'] },
  { id: 'active', label: 'Active', statuses: ['DISPATCHED', 'ARRIVED_SCENE', 'PATIENT_STABILIZED'] },
  { id: 'transporting', label: 'Transporting', statuses: ['TRANSPORTING'] },
  { id: 'completed', label: 'Completed', statuses: ['COMPLETED', 'ARRIVED_HOSPITAL'] },
  { id: 'cancelled', label: 'Cancelled', statuses: ['CANCELLED'] },
] as const

export type MissionFilterId = (typeof MISSION_STATUS_FILTERS)[number]['id']

export function filterCasesByStatus(cases: any[], filterId: MissionFilterId): any[] {
  if (filterId === 'all') return cases
  const def = MISSION_STATUS_FILTERS.find((f) => f.id === filterId)
  if (!def || !('statuses' in def)) return cases
  return cases.filter((c) => def.statuses.includes(c.status))
}
