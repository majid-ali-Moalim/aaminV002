import { ageFromGroup } from '@/lib/patients/updatePatientCaseValidation'
import { UNKNOWN_PATIENT_NAME, isUnknownPatientName } from '@/lib/emergency/patientName'
import { Gender, Priority, RequestSource } from '@/types'
import { normalizePhoneDigits } from '@/lib/driverFormValidation'
import {
  resolveIncidentCategoryId,
  isOtherEmergencyType,
  type EmergencyTypeOption,
} from '@/lib/emergency/emergencyTypes'
import { isFuneralTransportCode, resolveTransportTypeLabel, type TransportTypeOption } from '@/lib/emergency/transportTypes'
import {
  CONSCIOUS_STATUS_OPTIONS,
  BREATHING_STATUS_OPTIONS,
  BLEEDING_STATUS_OPTIONS,
} from '@/lib/emergency/triageOptions'
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

function patientDemographics(data: { ageGroup: string; gender: string }) {
  const age = ageFromGroup(data.ageGroup)
  return {
    gender: data.gender ? (data.gender as Gender) : undefined,
    age: age ?? undefined,
  }
}

function phone(value: string) {
  return normalizePhoneDigits(value)
}

function pickupFromEmergency(data: EmergencyDispatchForm): string {
  return data.areaStreet.trim() || 'Banaadir'
}

function triageLabel(
  value: string,
  options: readonly { value: string; label: string }[],
): string {
  return options.find((o) => o.value === value)?.label ?? value.replace(/_/g, ' ')
}

function transportLabel(data: NonEmergencyDispatchForm, transportTypes: TransportTypeOption[]): string {
  return resolveTransportTypeLabel(data.transportType, data.transportTypeOther, transportTypes)
}

function isFuneralTransport(transportType: string): boolean {
  return isFuneralTransportCode(transportType)
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
    `Conscious: ${triageLabel(data.consciousStatus, CONSCIOUS_STATUS_OPTIONS)}`,
    `Breathing: ${triageLabel(data.breathingStatus, BREATHING_STATUS_OPTIONS)}`,
    `Bleeding: ${triageLabel(data.bleedingStatus, BLEEDING_STATUS_OPTIONS)}`,
    data.needsOxygen ? 'Needs oxygen: Yes' : '',
    data.needsStretcher ? 'Needs stretcher: Yes' : '',
    nurseLine(true),
  ]
    .filter(Boolean)
    .join('\n')

  return {
    priority: data.priority,
    requestSource: RequestSource.PHONE_CALL,
    pickupLocation,
    pickupLandmark: data.areaStreet.trim() || undefined,
    patientCondition: data.briefDescription.trim(),
    consciousStatus: data.consciousStatus,
    breathingStatus: data.breathingStatus,
    bleedingStatus: data.bleedingStatus,
    needsOxygen: data.needsOxygen,
    needsStretcher: data.needsStretcher,
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

export function buildNonEmergencyPayload(
  data: NonEmergencyDispatchForm,
  transportTypes: TransportTypeOption[] = [],
) {
  const label = transportLabel(data, transportTypes)
  const funeral = isFuneralTransport(data.transportType)
  const needsNurse = funeral ? false : data.needsNurse
  const bookingDate = data.bookingDateTime.slice(0, 10)
  const bookingTime = data.bookingDateTime.slice(11, 16)

  const destinationName = funeral
    ? data.destinationHospitalName || data.destination.trim()
    : data.destinationHospitalBranchName ||
      data.destinationHospitalName ||
      data.destination.trim()

  const notes = [
    'Request Type: Non-Emergency',
    `Transport Type: ${label}`,
    `Booking: ${bookingDate} ${bookingTime}`,
    data.specialInstructions.trim() ? `Special Instructions: ${data.specialInstructions.trim()}` : '',
    nurseLine(needsNurse),
  ]
    .filter(Boolean)
    .join('\n')

  return {
    priority: Priority.LOW,
    requestSource: RequestSource.OTHER,
    pickupLocation: data.pickupAddress.trim(),
    destination: destinationName || undefined,
    destinationHospitalId: data.destinationHospitalId || undefined,
    destinationHospitalBranchId: funeral ? undefined : data.destinationHospitalBranchId || undefined,
    destinationHospitalBranchName: funeral
      ? data.destinationHospitalName || undefined
      : data.destinationHospitalBranchName || data.destinationHospitalName || undefined,
    regionId: data.regionId,
    districtId: data.districtId,
    stationId: data.stationId || undefined,
    patientCondition: `Non-emergency transport: ${label}`,
    needsStretcher: data.stretcherNeeded,
    callerName: formatPatientName(data.patientName),
    callerPhone: phone(data.phone),
    notes,
    manualDispatchNotes: nurseManualNotes(needsNurse),
    newPatient: {
      fullName: formatPatientName(data.patientName),
      phone: phone(data.phone),
      nationalityType: 'LOCAL',
      country: 'Somalia',
      ...patientDemographics(data),
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
      ...patientDemographics(data),
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
  transportTypes: TransportTypeOption[] = [],
) {
  switch (type) {
    case 'EMERGENCY':
      return buildEmergencyPayload(draft.emergency, emergencyTypes)
    case 'NON_EMERGENCY':
      return buildNonEmergencyPayload(draft.nonEmergency, transportTypes)
    case 'REFERRAL':
      return buildReferralPayload(draft.referral)
  }
}
