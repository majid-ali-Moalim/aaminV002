import {
  isAssessmentRecord,
  isHandoverRecord,
  isLoadPatientRecord,
  isTransferToHospitalRecord,
} from '@/lib/nurse/patientCareTypes'

export type CareRecord = { clinicalNotes?: string | null; requestId?: string; emergencyRequest?: { id?: string } }

export function recordsForCase(records: CareRecord[], caseId: string): CareRecord[] {
  return records.filter(
    (r) => r.requestId === caseId || r.emergencyRequest?.id === caseId,
  )
}

export function hasLoadPatientSaved(records: CareRecord[], caseId: string): boolean {
  return recordsForCase(records, caseId).some(isLoadPatientRecord)
}

export function hasTransferToHospitalSaved(records: CareRecord[], caseId: string): boolean {
  return recordsForCase(records, caseId).some(isTransferToHospitalRecord)
}

export function hasMedicalNotesSaved(records: CareRecord[], caseId: string): boolean {
  return recordsForCase(records, caseId).some(isAssessmentRecord)
}

export function hasHandoverSaved(records: CareRecord[], caseId: string): boolean {
  return recordsForCase(records, caseId).some(isHandoverRecord)
}

export const ON_SCENE_STATUSES = ['ARRIVED_SCENE', 'PATIENT_STABILIZED'] as const
export const PRE_SCENE_STATUSES = ['ASSIGNED', 'DISPATCHED', 'EN_ROUTE'] as const

export function driverArrivedAtPatient(status: string): boolean {
  return ON_SCENE_STATUSES.includes(status as (typeof ON_SCENE_STATUSES)[number])
}

export function driverArrivedAtHospital(status: string): boolean {
  return status === 'ARRIVED_HOSPITAL' || status === 'COMPLETED'
}

export function driverTransporting(status: string): boolean {
  return status === 'TRANSPORTING' || driverArrivedAtHospital(status)
}
