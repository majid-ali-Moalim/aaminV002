import { Priority, RequestSource } from '@/types'
import { normalizePhoneDigits } from '@/lib/driverFormValidation'
import {
  resolveIncidentCategoryId,
  type EmergencyTypeOption,
} from '@/lib/emergency/emergencyTypes'
import type {
  DispatchRequestType,
  EmergencyDispatchForm,
  NonEmergencyDispatchForm,
  ReferralDispatchForm,
} from './types'

function phone(value: string) {
  return normalizePhoneDigits(value)
}

function pickupFromEmergency(data: EmergencyDispatchForm): string {
  const parts = [data.landmark.trim(), data.areaStreet.trim()].filter(Boolean)
  return parts.join(', ') || data.landmark.trim()
}

export function buildEmergencyPayload(
  data: EmergencyDispatchForm,
  emergencyTypes: EmergencyTypeOption[],
) {
  const selectedType = emergencyTypes.find((t) => t.id === data.emergencyTypeId)
  const incidentCategoryId = resolveIncidentCategoryId(selectedType)
  const pickupLocation = pickupFromEmergency(data)

  const notes = [
    'Request Type: Emergency',
    selectedType?.name ? `Emergency Type: ${selectedType.name}` : '',
    data.additionalDirections.trim() ? `Directions: ${data.additionalDirections.trim()}` : '',
  ]
    .filter(Boolean)
    .join('\n')

  return {
    priority: data.priority,
    requestSource: RequestSource.PHONE_CALL,
    pickupLocation,
    pickupLandmark: data.landmark.trim() || undefined,
    destination: data.destinationHospitalBranchName || undefined,
    destinationHospitalId: data.destinationHospitalId || undefined,
    destinationHospitalBranchId: data.destinationHospitalBranchId || undefined,
    destinationHospitalBranchName: data.destinationHospitalBranchName || undefined,
    patientCondition: data.briefDescription.trim(),
    consciousStatus: 'CONSCIOUS',
    breathingStatus: 'NORMAL',
    bleedingStatus: 'NONE',
    incidentCategoryId,
    regionId: data.regionId,
    districtId: data.districtId,
    stationId: data.stationId || undefined,
    callerName: data.patientName.trim(),
    callerPhone: phone(data.phone),
    notes,
    newPatient: {
      fullName: data.patientName.trim(),
      phone: phone(data.phone),
      nationalityType: 'LOCAL',
      country: 'Somalia',
    },
  }
}

export function buildNonEmergencyPayload(data: NonEmergencyDispatchForm) {
  const transportLabel =
    data.transportType.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

  const notes = [
    'Request Type: Non-Emergency',
    `Transport Type: ${transportLabel}`,
    `Booking Date: ${data.bookingDate}`,
    `Booking Time: ${data.bookingTime}`,
    data.mobilityRequirement.trim() ? `Mobility: ${data.mobilityRequirement.trim()}` : '',
    data.specialInstructions.trim() ? `Special Instructions: ${data.specialInstructions.trim()}` : '',
  ]
    .filter(Boolean)
    .join('\n')

  return {
    priority: Priority.LOW,
    requestSource: RequestSource.OTHER,
    pickupLocation: data.pickupAddress.trim(),
    destination: data.destinationHospitalBranchName || data.destination.trim(),
    destinationHospitalId: data.destinationHospitalId || undefined,
    destinationHospitalBranchId: data.destinationHospitalBranchId || undefined,
    destinationHospitalBranchName: data.destinationHospitalBranchName || undefined,
    regionId: data.regionId,
    districtId: data.districtId,
    stationId: data.stationId || undefined,
    patientCondition: `Non-emergency transport: ${transportLabel}`,
    needsStretcher: data.stretcherNeeded,
    callerName: data.patientName.trim(),
    callerPhone: phone(data.phone),
    notes,
    newPatient: {
      fullName: data.patientName.trim(),
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
    data.medicalNotes.trim() ? `Medical Notes: ${data.medicalNotes.trim()}` : '',
    data.requiredEquipment.trim() ? `Required Equipment: ${data.requiredEquipment.trim()}` : '',
    data.additionalNotes.trim() ? `Additional Notes: ${data.additionalNotes.trim()}` : '',
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
    destinationHospitalBranchName: data.receivingHospitalBranchName || undefined,
    regionId: data.regionId,
    districtId: data.districtId,
    stationId: data.stationId || undefined,
    patientCondition: data.patientConditionSummary.trim() || `Referral: ${data.referralReason.trim()}`,
    callerName: data.patientName.trim(),
    callerPhone: phone(data.phone),
    notes,
    newPatient: {
      fullName: data.patientName.trim(),
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
