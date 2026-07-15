import { isValidSomaliaPhone } from '@/lib/driverFormValidation'
import type {
  DispatchFormErrors,
  DispatchRequestType,
  EmergencyDispatchForm,
  NonEmergencyDispatchForm,
  ReferralDispatchForm,
} from './types'

const NAME_MIN = 2

function req(errors: DispatchFormErrors, field: string, value: string, label: string) {
  if (!value.trim()) errors[field] = `${label} is required`
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

export function validateEmergencyDispatchForm(data: EmergencyDispatchForm): DispatchFormErrors {
  const errors: DispatchFormErrors = {}
  req(errors, 'patientName', data.patientName, 'Patient name')
  phone(errors, 'phone', data.phone)
  if (!data.emergencyTypeId) errors.emergencyTypeId = 'Emergency type is required'
  if (!data.regionId) errors.regionId = 'Region is required'
  if (!data.districtId) errors.districtId = 'District is required'
  req(errors, 'landmark', data.landmark, 'Landmark')
  if (!data.priority) errors.priority = 'Priority is required'
  req(errors, 'briefDescription', data.briefDescription, 'Brief description')
  if (!data.destinationHospitalId) errors.destinationHospitalId = 'Destination hospital is required'
  if (data.destinationHospitalId && !data.destinationHospitalBranchId) {
    errors.destinationHospitalBranchId = 'Select a hospital branch'
  }
  return errors
}

export function validateNonEmergencyDispatchForm(data: NonEmergencyDispatchForm): DispatchFormErrors {
  const errors: DispatchFormErrors = {}
  req(errors, 'patientName', data.patientName, 'Patient name')
  phone(errors, 'phone', data.phone)
  if (!data.transportType) errors.transportType = 'Transport type is required'
  if (!data.regionId) errors.regionId = 'Pickup region is required'
  if (!data.districtId) errors.districtId = 'Pickup district is required'
  req(errors, 'pickupAddress', data.pickupAddress, 'Pickup address')
  if (!data.destinationHospitalId) errors.destinationHospitalId = 'Destination hospital is required'
  if (data.destinationHospitalId && !data.destinationHospitalBranchId) {
    errors.destinationHospitalBranchId = 'Select a hospital branch'
  }
  if (!data.bookingDate) errors.bookingDate = 'Booking date is required'
  else if (data.bookingDate < new Date().toISOString().slice(0, 10)) {
    errors.bookingDate = 'Booking date cannot be in the past'
  }
  if (!data.bookingTime) errors.bookingTime = 'Booking time is required'
  return errors
}

export function validateReferralDispatchForm(data: ReferralDispatchForm): DispatchFormErrors {
  const errors: DispatchFormErrors = {}
  req(errors, 'patientName', data.patientName, 'Patient name')
  phone(errors, 'phone', data.phone)
  req(errors, 'referringHospital', data.referringHospital, 'Referring hospital')
  if (!data.receivingHospitalId) errors.receivingHospitalId = 'Receiving hospital is required'
  if (data.receivingHospitalId && !data.receivingHospitalBranchId) {
    errors.receivingHospitalBranchId = 'Select receiving branch'
  }
  req(errors, 'referralReason', data.referralReason, 'Reason for referral')
  if (!data.priority) errors.priority = 'Priority is required'
  if (!data.regionId) errors.regionId = 'Region is required'
  if (!data.districtId) errors.districtId = 'District is required'
  if (data.patientName.trim() && data.patientName.trim().length < NAME_MIN) {
    errors.patientName = 'Patient name is too short'
  }
  return errors
}

export function validateDispatchForm(
  type: DispatchRequestType,
  draft: {
    emergency: EmergencyDispatchForm
    nonEmergency: NonEmergencyDispatchForm
    referral: ReferralDispatchForm
  },
): DispatchFormErrors {
  switch (type) {
    case 'EMERGENCY':
      return validateEmergencyDispatchForm(draft.emergency)
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
