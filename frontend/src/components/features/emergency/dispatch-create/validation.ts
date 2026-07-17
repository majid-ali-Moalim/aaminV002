import { isValidSomaliaPhone } from '@/lib/driverFormValidation'
import { isValidDispatchPatientName } from '@/lib/emergency/patientName'
import { isOtherEmergencyType } from '@/lib/emergency/emergencyTypes'
import type { EmergencyTypeOption } from '@/lib/emergency/emergencyTypes'
import { Priority } from '@/types'
import type {
  DispatchFormErrors,
  DispatchRequestType,
  EmergencyDispatchForm,
  NonEmergencyDispatchForm,
  ReferralDispatchForm,
} from './types'

function req(errors: DispatchFormErrors, field: string, value: string, label: string) {
  if (!value.trim()) errors[field] = `${label} is required`
}

function patientName(errors: DispatchFormErrors, field: string, value: string) {
  if (!value.trim()) {
    errors[field] = 'Patient name is required'
    return
  }
  if (!isValidDispatchPatientName(value)) {
    errors[field] = 'Enter a valid patient name or use UNKNOWN'
  }
}

function phone(errors: DispatchFormErrors, field: string, value: string) {
  if (!value.trim()) {
    errors[field] = 'Phone number is required'
    return
  }
  if (!isValidSomaliaPhone(value)) {
    errors[field] = 'Enter a valid Somali phone number'
  }
}

function needsNurseCheck(errors: DispatchFormErrors, needsNurse: boolean | null) {
  if (needsNurse === null) errors.needsNurse = 'Select Yes or No for nurse required'
}

export function validateEmergencyDispatchForm(
  data: EmergencyDispatchForm,
  emergencyTypes: EmergencyTypeOption[] = [],
): DispatchFormErrors {
  const errors: DispatchFormErrors = {}
  patientName(errors, 'patientName', data.patientName)
  phone(errors, 'phone', data.phone)
  if (!data.emergencyTypeId) errors.emergencyTypeId = 'Emergency type is required'
  const selectedType = emergencyTypes.find((t) => t.id === data.emergencyTypeId)
  if (selectedType && isOtherEmergencyType(selectedType) && !data.emergencyTypeOther.trim()) {
    errors.emergencyTypeOther = 'Describe the other emergency type'
  }
  if (!data.regionId) errors.regionId = 'Region is required'
  if (!data.districtId) errors.districtId = 'District is required'
  if (!data.priority) errors.priority = 'Priority is required'
  if (data.priority === Priority.MEDIUM || data.priority === Priority.LOW) {
    errors.priority = 'Only Critical or High priority is available for emergencies'
  }
  req(errors, 'briefDescription', data.briefDescription, 'Brief description')
  return errors
}

export function validateNonEmergencyDispatchForm(data: NonEmergencyDispatchForm): DispatchFormErrors {
  const errors: DispatchFormErrors = {}
  patientName(errors, 'patientName', data.patientName)
  phone(errors, 'phone', data.phone)
  if (!data.transportType) errors.transportType = 'Transport type is required'
  if (data.transportType === 'OTHER' && !data.transportTypeOther.trim()) {
    errors.transportTypeOther = 'Describe the transport type'
  }
  if (!data.regionId) errors.regionId = 'Pickup region is required'
  if (!data.districtId) errors.districtId = 'Pickup district is required'
  req(errors, 'pickupAddress', data.pickupAddress, 'Pickup address')
  const hasHospital =
    Boolean(data.destinationHospitalId) || Boolean(data.destinationHospitalName.trim())
  if (!hasHospital) errors.destinationHospitalId = 'Destination hospital or place is required'
  if (!data.bookingDateTime) errors.bookingDateTime = 'Booking date and time is required'
  else {
    const booking = new Date(data.bookingDateTime)
    if (Number.isNaN(booking.getTime())) {
      errors.bookingDateTime = 'Enter a valid booking date and time'
    } else if (booking.getTime() < Date.now() - 60_000) {
      errors.bookingDateTime = 'Booking cannot be in the past'
    }
  }
  needsNurseCheck(errors, data.needsNurse)
  return errors
}

export function validateReferralDispatchForm(data: ReferralDispatchForm): DispatchFormErrors {
  const errors: DispatchFormErrors = {}
  patientName(errors, 'patientName', data.patientName)
  phone(errors, 'phone', data.phone)
  req(errors, 'referringHospital', data.referringHospital, 'Referring hospital')
  const hasReceiving =
    Boolean(data.receivingHospitalId) || Boolean(data.receivingHospital.trim())
  if (!hasReceiving) errors.receivingHospitalId = 'Receiving hospital is required'
  req(errors, 'referralReason', data.referralReason, 'Reason for referral')
  if (!data.priority) errors.priority = 'Priority is required'
  if (!data.regionId) errors.regionId = 'Region is required'
  if (!data.districtId) errors.districtId = 'District is required'
  needsNurseCheck(errors, data.needsNurse)
  return errors
}

export function validateDispatchForm(
  type: DispatchRequestType,
  draft: {
    emergency: EmergencyDispatchForm
    nonEmergency: NonEmergencyDispatchForm
    referral: ReferralDispatchForm
  },
  emergencyTypes: EmergencyTypeOption[] = [],
): DispatchFormErrors {
  switch (type) {
    case 'EMERGENCY':
      return validateEmergencyDispatchForm(draft.emergency, emergencyTypes)
    case 'NON_EMERGENCY':
      return validateNonEmergencyDispatchForm(draft.nonEmergency)
    case 'REFERRAL':
      return validateReferralDispatchForm(draft.referral)
    default:
      return { requestType: 'Select a request type' }
  }
}

export function firstErrorMessage(errors: DispatchFormErrors): string | null {
  const v = Object.values(errors).find(Boolean)
  return v ?? null
}
