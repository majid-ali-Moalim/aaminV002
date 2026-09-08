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

function parseEmbeddedPayload<T>(notes: string | null | undefined, prefix: string): T | null {
  if (!notes) return null
  const idx = notes.indexOf(prefix)
  if (idx < 0) return null
  const after = notes.slice(idx + prefix.length).trimStart()
  if (!after.startsWith('{')) return null
  let depth = 0
  for (let i = 0; i < after.length; i++) {
    const ch = after[i]
    if (ch === '{') depth++
    else if (ch === '}') {
      depth--
      if (depth === 0) {
        try {
          return JSON.parse(after.slice(0, i + 1)) as T
        } catch {
          return null
        }
      }
    }
  }
  return null
}

function parsePrefixedPayload<T>(notes: string | null | undefined, prefix: string): T | null {
  if (!notes) return null
  if (notes.startsWith(prefix)) {
    try {
      return JSON.parse(notes.slice(prefix.length)) as T
    } catch {
      /* fall through to embedded parse */
    }
  }
  return parseEmbeddedPayload<T>(notes, prefix)
}

export function encodeAssessment(data: Omit<AssessmentData, '_type'>): string {
  const payload: AssessmentData = { _type: 'assessment', ...data }
  return `${ASSESSMENT_PREFIX}${JSON.stringify(payload)}`
}

export function parseClinicalRecord(notes?: string | null): AssessmentData | null {
  return parsePrefixedPayload<AssessmentData>(notes, ASSESSMENT_PREFIX)
}

export function isAssessmentRecord(record: { clinicalNotes?: string | null }): boolean {
  return Boolean(parseClinicalRecord(record.clinicalNotes))
}

/** Most recent assessment / medical-notes record for a case (newest wins on edit). */
export function findLatestAssessmentRecord<T extends { clinicalNotes?: string | null; createdAt?: string | Date }>(
  records: T[],
): T | null {
  return (
    records
      .filter(isAssessmentRecord)
      .sort(
        (a, b) =>
          new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime(),
      )[0] ?? null
  )
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
  /** Live, deceased, or unknown at handover */
  patientOutcome?: 'Live' | 'Deceased' | 'Unknown'
  acceptedHospital?: string
  rejectedHospitals?: Array<{
    id: string
    hospitalName: string
    reason: string
    notes: string
  }>
  ageGroup?: string
  gender?: string
  nationalityType?: string
  maritalStatus?: string
  driverName?: string
  nurseName?: string
  handoverDocumentUrl?: string
  handoverDocumentName?: string
}

export function encodeMonitoring(data: Omit<MonitoringData, '_type'>): string {
  return `${MONITORING_PREFIX}${JSON.stringify({ _type: 'monitoring', ...data })}`
}

export function parseMonitoring(notes?: string | null): MonitoringData | null {
  return parsePrefixedPayload<MonitoringData>(notes, MONITORING_PREFIX)
}

export function isMonitoringRecord(record: { clinicalNotes?: string | null }): boolean {
  return Boolean(parseMonitoring(record.clinicalNotes))
}

export function encodeHandover(data: Omit<HandoverData, '_type'>): string {
  return `${HANDOVER_PREFIX}${JSON.stringify({ _type: 'handover', ...data })}`
}

export function parseHandover(notes?: string | null): HandoverData | null {
  return parsePrefixedPayload<HandoverData>(notes, HANDOVER_PREFIX)
}

export function isHandoverRecord(record: { clinicalNotes?: string | null }): boolean {
  return Boolean(parseHandover(record.clinicalNotes))
}

/** Most recent handover record for a case. */
export function findLatestHandoverRecord<T extends { clinicalNotes?: string | null; createdAt?: string | Date }>(
  records: T[],
): T | null {
  return (
    records
      .filter(isHandoverRecord)
      .sort(
        (a, b) =>
          new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime(),
      )[0] ?? null
  )
}

const LOAD_PATIENT_PREFIX = '[EADS_LOAD_PATIENT]'

export type LoadPatientData = {
  _type: 'load_patient'
  loadedAt: string
  notes?: string
}

export function encodeLoadPatient(data?: { notes?: string }): string {
  const payload: LoadPatientData = {
    _type: 'load_patient',
    loadedAt: new Date().toISOString(),
    notes: data?.notes,
  }
  return `${LOAD_PATIENT_PREFIX}${JSON.stringify(payload)}`
}

export function parseLoadPatient(notes?: string | null): LoadPatientData | null {
  return parsePrefixedPayload<LoadPatientData>(notes, LOAD_PATIENT_PREFIX)
}

export function isLoadPatientRecord(record: { clinicalNotes?: string | null }): boolean {
  return Boolean(parseLoadPatient(record.clinicalNotes))
}

const TRANSFER_HOSPITAL_PREFIX = '[EADS_TRANSFER_HOSPITAL]'

export type TransferHospitalData = {
  _type: 'transfer_hospital'
  confirmedAt: string
  notes?: string
}

export function encodeTransferToHospital(data?: { notes?: string }): string {
  const payload: TransferHospitalData = {
    _type: 'transfer_hospital',
    confirmedAt: new Date().toISOString(),
    notes: data?.notes,
  }
  return `${TRANSFER_HOSPITAL_PREFIX}${JSON.stringify(payload)}`
}

export function parseTransferToHospital(notes?: string | null): TransferHospitalData | null {
  return parsePrefixedPayload<TransferHospitalData>(notes, TRANSFER_HOSPITAL_PREFIX)
}

export function isTransferToHospitalRecord(record: { clinicalNotes?: string | null }): boolean {
  return Boolean(parseTransferToHospital(record.clinicalNotes))
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

export const PAIN_LEVEL_OPTIONS = [
  { value: 'None', label: 'None — No pain' },
  { value: 'Mild', label: 'Mild — Minimal discomfort' },
  { value: 'Moderate', label: 'Moderate — Distressing pain' },
  { value: 'Severe', label: 'Severe — Worst pain' },
] as const

export const PATIENT_HANDOVER_OUTCOMES = [
  { value: 'Live', label: 'Live — Patient alive at handover' },
  { value: 'Deceased', label: 'Dead — Patient deceased during transfer' },
  { value: 'Unknown', label: 'Unknown — Status not confirmed' },
] as const

/** Display label for handover outcome (Deceased stored in DB → shown as Dead). */
export function handoverOutcomeLabel(value?: string | null): string {
  if (!value) return '—'
  if (value === 'Deceased' || value === 'Dead') return 'Dead'
  if (value === 'Live') return 'Live'
  if (value === 'Unknown') return 'Unknown'
  return value
}

export function normalizeHandoverOutcome(
  value?: string | null,
): 'Live' | 'Deceased' | 'Unknown' | '' {
  if (value === 'Live') return 'Live'
  if (value === 'Deceased' || value === 'Dead') return 'Deceased'
  if (value === 'Unknown') return 'Unknown'
  return ''
}

export const PAIN_LEVELS = PAIN_LEVEL_OPTIONS.map((o) => o.value)

const LEGACY_PAIN_LEVEL_MAP: Record<string, string> = {
  '0': 'None',
  '1': 'Mild',
  '2': 'Mild',
  '3': 'Mild',
  '4': 'Moderate',
  '5': 'Moderate',
  '6': 'Moderate',
  '7': 'Severe',
  '8': 'Severe',
  '9': 'Severe',
  '10': 'Severe',
}

export function normalizePainLevel(value: string): string {
  if (PAIN_LEVELS.includes(value as (typeof PAIN_LEVELS)[number])) return value
  return LEGACY_PAIN_LEVEL_MAP[value] ?? 'None'
}

export function painLevelLabel(value: string): string {
  const normalized = normalizePainLevel(value)
  return PAIN_LEVEL_OPTIONS.find((o) => o.value === normalized)?.label ?? normalized
}
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
