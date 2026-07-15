import type { EmergencyRequest } from '@/types'
import {
  BLEEDING_STATUS_OPTIONS,
  BREATHING_STATUS_OPTIONS,
  CONSCIOUS_STATUS_OPTIONS,
} from './triageOptions'

export type CallerReportRow = { label: string; value: string }

export function triageOptionLabel(
  options: { value: string; label: string }[],
  value?: string | null,
): string {
  if (!value) return 'Not reported'
  const match = options.find((o) => o.value === value)
  return match?.label ?? value.replace(/_/g, ' ')
}

export function normalizeBreathingStatus(value?: string | null): string {
  if (!value) return 'NORMAL'
  if (value === 'DIFFICULTY' || value === 'DIFFICULT') return 'DIFFICULT'
  if (value === 'ARREST' || value === 'NOT_BREATHING') return 'NOT_BREATHING'
  return value
}

/** Unique breathing options for UI (no duplicates). */
export const BREATHING_UI_OPTIONS = [
  { value: 'NORMAL', label: 'Normal breathing' },
  { value: 'DIFFICULT', label: 'Difficulty breathing' },
  { value: 'LABORED', label: 'Labored / shallow' },
  { value: 'NOT_BREATHING', label: 'Not breathing' },
] as const

export function buildCallerReport(request: EmergencyRequest): CallerReportRow[] {
  const rows: CallerReportRow[] = []

  if (request.patient?.fullName) rows.push({ label: 'Patient name', value: request.patient.fullName })
  if (request.patient?.phone) rows.push({ label: 'Patient phone', value: request.patient.phone })
  if (request.patient?.gender) rows.push({ label: 'Gender', value: request.patient.gender })
  if (request.patient?.age != null) rows.push({ label: 'Age', value: String(request.patient.age) })

  if (request.callerName) rows.push({ label: 'Caller name', value: request.callerName })
  if (request.callerPhone) rows.push({ label: 'Caller phone', value: request.callerPhone })
  if (request.requestSource) {
    rows.push({ label: 'Request source', value: request.requestSource.replace(/_/g, ' ') })
  }

  rows.push({ label: 'Pickup location', value: request.pickupLocation })
  if (request.pickupLandmark) rows.push({ label: 'Landmark / area', value: request.pickupLandmark })
  if (request.destination) rows.push({ label: 'Destination', value: request.destination })

  if (request.incidentCategory?.name) {
    rows.push({ label: 'Emergency type', value: request.incidentCategory.name })
  }

  if (request.patientCondition) {
    rows.push({ label: 'Condition reported', value: request.patientCondition })
  }
  if (request.symptoms) rows.push({ label: 'Symptoms reported', value: request.symptoms })

  rows.push({
    label: 'Conscious (reported)',
    value: triageOptionLabel(CONSCIOUS_STATUS_OPTIONS, request.consciousStatus),
  })
  rows.push({
    label: 'Breathing (reported)',
    value: triageOptionLabel(BREATHING_STATUS_OPTIONS, request.breathingStatus),
  })
  rows.push({
    label: 'Bleeding (reported)',
    value: triageOptionLabel(BLEEDING_STATUS_OPTIONS, request.bleedingStatus),
  })

  if (request.needsOxygen) rows.push({ label: 'Equipment', value: 'Needs oxygen' })
  if (request.needsStretcher) rows.push({ label: 'Equipment', value: 'Needs stretcher' })

  if (request.notes?.trim()) rows.push({ label: 'Full request notes', value: request.notes.trim() })

  return rows
}

export function callerReportSummary(request: EmergencyRequest): string {
  const parts = [
    request.patientCondition,
    request.symptoms,
    request.notes,
  ].filter(Boolean)
  return parts.join('\n\n').trim()
}
