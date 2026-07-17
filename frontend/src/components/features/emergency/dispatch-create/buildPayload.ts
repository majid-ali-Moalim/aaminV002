import { UNKNOWN_PATIENT_NAME, isUnknownPatientName } from '@/lib/emergency/patientName'
import { Priority, RequestSource } from '@/types'
import { normalizePhoneDigits } from '@/lib/driverFormValidation'
import {
  resolveIncidentCategoryId,
  isOtherEmergencyType,
  type EmergencyTypeOption,
} from '@/lib/emergency/emergencyTypes'
import { DISPATCH_NON_EMERGENCY_TRANSPORT_TYPES } from '@/lib/emergency/dispatchFormShared'
import type {
  DispatchRequestType,
  EmergencyDispatchForm,
  NonEmergencyDispatchForm,
  ReferralDispatchForm,
} from './types'

function formatPatientName(value: string): string {
  const trimmed = value.trim()
  return isUnknownPatientName(trimmed) ? UNKNOWN_PATIENT_NAME : trimmed
}

function phone(value: string) {
  return normalizePhoneDigits(value)
}

function pickupFromEmergency(data: EmergencyDispatchForm): string {
  const parts = [data.landmark.trim(), data.areaStreet.trim()].filter(Boolean)
  return parts.join(', ') || 'Banaadir'
}

function transportLabel(data: NonEmergencyDispatchForm): string {
  if (data.transportType === 'OTHER') return data.transportTypeOther.trim() || 'Other'
  const row = DISPATCH_NON_EMERGENCY_TRANSPORT_TYPES.find((t) => t.value === data.transportType)
  return row?.label ?? data.transportType.replace(/_/g, ' ')
}

function nurseLine(needsNurse: boolean | null): string {
  if (needsNurse === null) return ''
  return needsNurse ? 'Requires Nurse: Yes' : 'Requires Nurse: No'
}

function nurseManualNotes(needsNurse: boolean | null): string | undefined {
  return needsNurse
    ? 'NURSE REQUIRED — assign a nurse to this case before dispatch.'
    : undefined
}

export function buildEmergencyPayload(
  data: EmergencyDispatchForm,
  emergencyTypes: EmergencyTypeOption[],
) {
  const selectedType = emergencyTypes.find((t) => t.id === data.emergencyTypeId)
  const incidentCategoryId = resolveIncidentCategoryId(selectedType)
  const pickupLocation = pickupFromEmergency(data)
  const typeLabel =
    selectedType && isOtherEmergencyType(selectedType)
      ? `Other: ${data.emergencyTypeOther.trim()}`
      : selectedType?.name

  const notes = [
    'Request Type: Emergency',
    typeLabel ? `Emergency Type: ${typeLabel}` : '',
    nurseLine(true),
  ]
    .filter(Boolean)
    .join('\n')

  return {
    priority: data.priority,
    requestSource: RequestSource.PHONE_CALL,
    pickupLocation,
    pickupLandmark: data.landmark.trim() || undefined,
    patientCondition: data.briefDescription.trim(),
    consciousStatus: 'CONSCIOUS',
    breathingStatus: 'NORMAL',
    bleedingStatus: 'NONE',
    incidentCategoryId,
    regionId: data.regionId,
    districtId: data.districtId,
    stationId: data.stationId || undefined,
    callerName: formatPatientName(data.patientName),
    callerPhone: phone(data.phone),
    notes,
    manualDispatchNotes: nurseManualNotes(true),
    newPatient: {
      fullName: formatPatientName(data.patientName),
      phone: phone(data.phone),
      nationalityType: 'LOCAL',
      country: 'Somalia',
    },
  }
}

export function buildNonEmergencyPayload(data: NonEmergencyDispatchForm) {
  const label = transportLabel(data)
  const bookingDate = data.bookingDateTime.slice(0, 10)
  const bookingTime = data.bookingDateTime.slice(11, 16)

  const destinationName =
    data.destinationHospitalBranchName ||
    data.destinationHospitalName ||
    data.destination.trim()

  const notes = [
    'Request Type: Non-Emergency',
    `Transport Type: ${label}`,
    `Booking: ${bookingDate} ${bookingTime}`,
    data.specialInstructions.trim() ? `Special Instructions: ${data.specialInstructions.trim()}` : '',
    nurseLine(data.needsNurse),
  ]
    .filter(Boolean)
    .join('\n')

  return {
    priority: Priority.LOW,
    requestSource: RequestSource.OTHER,
    pickupLocation: data.pickupAddress.trim(),
    destination: destinationName || undefined,
    destinationHospitalId: data.destinationHospitalId || undefined,
    destinationHospitalBranchId: data.destinationHospitalBranchId || undefined,
    destinationHospitalBranchName: data.destinationHospitalBranchName || data.destinationHospitalName || undefined,
    regionId: data.regionId,
    districtId: data.districtId,
    stationId: data.stationId || undefined,
    patientCondition: `Non-emergency transport: ${label}`,
    needsStretcher: data.stretcherNeeded,
    callerName: formatPatientName(data.patientName),
    callerPhone: phone(data.phone),
    notes,
    manualDispatchNotes: nurseManualNotes(data.needsNurse),
    newPatient: {
      fullName: formatPatientName(data.patientName),
      phone: phone(data.phone),
      nationalityType: 'LOCAL',
      country: 'Somalia',
    },
  }
}

export function buildReferralPayload(data: ReferralDispatchForm) {
  const notes = [
    'Request Type: Referral',
    `Referring Hospital: ${data.referringHospital.trim()}`,
    `Receiving Hospital: ${data.receivingHospital.trim()}`,
    `Referral Reason: ${data.referralReason.trim()}`,
    data.referringDoctor.trim() ? `Referring Doctor: ${data.referringDoctor.trim()}` : '',
    data.requiredEquipment.trim() ? `Required Equipment: ${data.requiredEquipment.trim()}` : '',
    data.additionalNotes.trim() ? `Additional Notes: ${data.additionalNotes.trim()}` : '',
    nurseLine(data.needsNurse),
  ]
    .filter(Boolean)
    .join('\n')

  return {
    priority: data.priority,
    requestSource: RequestSource.REFERRAL,
    pickupLocation: data.referringHospital.trim(),
    destination: data.receivingHospitalBranchName || data.receivingHospital.trim(),
    destinationHospitalId: data.receivingHospitalId || undefined,
    destinationHospitalBranchId: data.receivingHospitalBranchId || undefined,
    destinationHospitalBranchName: data.receivingHospitalBranchName || data.receivingHospital.trim() || undefined,
    regionId: data.regionId,
    districtId: data.districtId,
    stationId: data.stationId || undefined,
    patientCondition: data.patientConditionSummary.trim() || `Referral: ${data.referralReason.trim()}`,
    callerName: formatPatientName(data.patientName),
    callerPhone: phone(data.phone),
    notes,
    manualDispatchNotes: nurseManualNotes(data.needsNurse),
    newPatient: {
      fullName: formatPatientName(data.patientName),
      phone: phone(data.phone),
      nationalityType: 'LOCAL',
      country: 'Somalia',
    },
  }
}

export function buildPayloadForType(
  type: DispatchRequestType,
  draft: {
    emergency: EmergencyDispatchForm
    nonEmergency: NonEmergencyDispatchForm
    referral: ReferralDispatchForm
  },
  emergencyTypes: EmergencyTypeOption[],
) {
  switch (type) {
    case 'EMERGENCY':
      return buildEmergencyPayload(draft.emergency, emergencyTypes)
    case 'NON_EMERGENCY':
      return buildNonEmergencyPayload(draft.nonEmergency)
    case 'REFERRAL':
      return buildReferralPayload(draft.referral)
  }
}
