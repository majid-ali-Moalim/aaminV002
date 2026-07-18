import { EmergencyRequest } from '@/types'
import { parseHandover } from '@/lib/nurse/patientCareTypes'
import { triageOptionLabel } from '@/lib/emergency/callerReport'
import {
  BLEEDING_STATUS_OPTIONS,
  BREATHING_STATUS_OPTIONS,
  CONSCIOUS_STATUS_OPTIONS,
} from '@/lib/emergency/triageOptions'

export type RejectedHospitalEntry = {
  id: string
  hospitalName: string
  reason: string
  notes: string
}

export type CaseClosureFormState = {
  acceptedHospital: string
  rejectedEntries: RejectedHospitalEntry[]
  consciousStatus: string
  breathingStatus: string
  bleedingStatus: string
  patientConditionAtClose: string
  receivingStaff: string
  treatmentSummary: string
  handoverNotes: string
  dispatcherNotes: string
}

export const HOSPITAL_REFUSAL_REASON_OPTIONS = [
  { value: '', label: 'Select reason…' },
  { value: 'NO_BEDS', label: 'No beds available' },
  { value: 'ICU_FULL', label: 'ICU full' },
  { value: 'ER_FULL', label: 'Emergency room full' },
  { value: 'EQUIPMENT_LIMIT', label: 'Equipment limitation' },
  { value: 'STAFF_SHORTAGE', label: 'Staff shortage' },
  { value: 'HOSPITAL_CLOSED', label: 'Hospital closed' },
  { value: 'OTHER', label: 'Other' },
]

function employeeName(emp?: { firstName?: string | null; lastName?: string | null } | null) {
  if (!emp) return ''
  return `${emp.firstName || ''} ${emp.lastName || ''}`.trim()
}

export function newRejectedHospitalEntry(): RejectedHospitalEntry {
  return {
    id: `rej-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    hospitalName: '',
    reason: '',
    notes: '',
  }
}

export function serializeRejectedHospitals(entries: RejectedHospitalEntry[]): string {
  return entries
    .filter((e) => e.hospitalName.trim())
    .map((e) => {
      const reasonLabel =
        HOSPITAL_REFUSAL_REASON_OPTIONS.find((o) => o.value === e.reason)?.label || e.reason
      const parts = [e.hospitalName.trim()]
      if (reasonLabel && e.reason) parts.push(`(${reasonLabel})`)
      if (e.notes.trim()) parts.push(`— ${e.notes.trim()}`)
      return parts.join(' ')
    })
    .join('; ')
}

export function buildPatientStatusSummary(form: Pick<
  CaseClosureFormState,
  'consciousStatus' | 'breathingStatus' | 'bleedingStatus' | 'patientConditionAtClose'
>): string {
  const triage = [
    triageOptionLabel(CONSCIOUS_STATUS_OPTIONS, form.consciousStatus),
    triageOptionLabel(BREATHING_STATUS_OPTIONS, form.breathingStatus),
    triageOptionLabel(BLEEDING_STATUS_OPTIONS, form.bleedingStatus),
  ]
    .filter(Boolean)
    .join(' · ')

  const summary = form.patientConditionAtClose.trim()
  if (triage && summary) return `${triage} — ${summary}`
  return triage || summary
}

export function buildCaseClosureDefaults(request: EmergencyRequest): CaseClosureFormState {
  const handoverRecord = (request.patientCareRecords ?? []).find((r) =>
    parseHandover(r.clinicalNotes),
  )
  const handover = handoverRecord ? parseHandover(handoverRecord.clinicalNotes) : null

  const destinationHospital = (request as EmergencyRequest & {
    destinationHospital?: { name?: string } | null
    destinationHospitalBranchName?: string | null
  }).destinationHospital

  const branchName = (request as EmergencyRequest & { destinationHospitalBranchName?: string | null })
    .destinationHospitalBranchName

  const accepted =
    branchName ||
    destinationHospital?.name ||
    request.destination ||
    ''

  return {
    acceptedHospital: accepted,
    rejectedEntries: [],
    consciousStatus: request.consciousStatus || 'CONSCIOUS',
    breathingStatus: request.breathingStatus || 'NORMAL',
    bleedingStatus: request.bleedingStatus || 'NONE',
    patientConditionAtClose:
      handover?.patientCondition ||
      request.patientCondition ||
      request.symptoms ||
      '',
    receivingStaff: handover?.receivingStaff || '',
    treatmentSummary: handover?.treatmentGiven || handoverRecord?.treatmentGiven || '',
    handoverNotes: handover?.notes || '',
    dispatcherNotes: '',
  }
}

export function caseClosureReadonlyFields(request: EmergencyRequest) {
  return {
    trackingCode: request.trackingCode,
    driverName: employeeName(request.driver) || '—',
    nurseName: employeeName(request.nurse) || '—',
    ambulance: request.ambulance?.ambulanceNumber || '—',
    patientName: request.patient?.fullName || request.callerName || '—',
    status: request.status.replace(/_/g, ' '),
  }
}
