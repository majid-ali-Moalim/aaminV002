import type { EmergencyRequest } from '@/types'
import {
  BLEEDING_STATUS_OPTIONS,
  BREATHING_STATUS_OPTIONS,
  CONSCIOUS_STATUS_OPTIONS,
} from './triageOptions'
import { normalizeBreathingStatus, triageOptionLabel } from './callerReport'

export type SimpleCaseField = { label: string; value: string }

function norm(s?: string | null): string {
  return (s ?? '').trim()
}

function isUnknown(s?: string | null): boolean {
  const v = norm(s).toUpperCase()
  return !v || v === 'UNKNOWN' || v === 'N/A'
}

/** Compact case facts for pending review — skips duplicate / empty values. */
export function buildSimpleCaseSummary(request: EmergencyRequest): SimpleCaseField[] {
  const rows: SimpleCaseField[] = []

  const patientName = request.patient?.fullName
  const patientPhone = request.patient?.phone
  const callerPhone = request.callerPhone
  const callerName = request.callerName

  if (!isUnknown(patientName)) {
    rows.push({ label: 'Patient', value: norm(patientName) })
  }

  const phone = norm(callerPhone) || norm(patientPhone)
  if (phone) {
    rows.push({ label: 'Phone', value: phone })
  }

  const location = norm(request.pickupLocation)
  const landmark = norm(request.pickupLandmark)
  if (location) {
    rows.push({
      label: 'Location',
      value: landmark && landmark !== location ? `${location} · ${landmark}` : location,
    })
  }

  const description =
    norm(request.patientCondition) ||
    norm(request.symptoms) ||
    extractBriefFromNotes(request.notes)
  if (description) {
    rows.push({ label: 'Reported condition', value: description })
  }

  if (request.requestSource) {
    rows.push({ label: 'Source', value: request.requestSource.replace(/_/g, ' ') })
  }

  if (!isUnknown(callerName) && norm(callerName) !== norm(patientName)) {
    rows.push({ label: 'Caller', value: norm(callerName) })
  }

  const statusLine = [
    triageOptionLabel(CONSCIOUS_STATUS_OPTIONS, request.consciousStatus),
    triageOptionLabel(BREATHING_STATUS_OPTIONS, normalizeBreathingStatus(request.breathingStatus)),
    triageOptionLabel(BLEEDING_STATUS_OPTIONS, request.bleedingStatus),
  ]
    .filter((s) => s && s !== 'Not reported')
    .join(' · ')

  if (statusLine) {
    rows.push({ label: 'Quick triage (caller)', value: statusLine })
  }

  if (caseRequiresNurseFlag(request)) {
    rows.push({ label: 'Requirement', value: 'Nurse required' })
  }

  return rows
}

function extractBriefFromNotes(notes?: string | null): string {
  if (!notes?.trim()) return ''
  const lines = notes
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
  const skip = /^(Request Type:|Intake:|Requires Nurse:)/i
  const useful = lines.filter((l) => !skip.test(l))
  return useful[0] ?? ''
}

function caseRequiresNurseFlag(request: EmergencyRequest): boolean {
  const blob = `${request.notes ?? ''}\n${request.manualDispatchNotes ?? ''}`.toUpperCase()
  return blob.includes('REQUIRES NURSE: YES') || blob.includes('NURSE REQUIRED')
}
