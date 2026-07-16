import { Priority } from '@/types'

export type DispatchRequestType = 'EMERGENCY' | 'NON_EMERGENCY' | 'REFERRAL'

export type EmergencyDispatchForm = {
  patientName: string
  phone: string
  emergencyTypeId: string
  regionId: string
  districtId: string
  stationId: string
  landmark: string
  priority: Priority
  briefDescription: string
  areaStreet: string
  additionalDirections: string
  destinationHospitalId: string
  destinationHospitalBranchId: string
  destinationHospitalBranchName: string
}

export type NonEmergencyDispatchForm = {
  patientName: string
  phone: string
  transportType: string
  regionId: string
  districtId: string
  stationId: string
  pickupAddress: string
  destination: string
  destinationHospitalId: string
  destinationHospitalBranchId: string
  destinationHospitalBranchName: string
  bookingDate: string
  bookingTime: string
  mobilityRequirement: string
  wheelchairNeeded: boolean
  stretcherNeeded: boolean
  specialInstructions: string
}

export type ReferralDispatchForm = {
  patientName: string
  phone: string
  referringHospital: string
  receivingHospital: string
  receivingHospitalId: string
  receivingHospitalBranchId: string
  receivingHospitalBranchName: string
  referralReason: string
  priority: Priority
  regionId: string
  districtId: string
  stationId: string
  referringDoctor: string
  patientConditionSummary: string
  medicalNotes: string
  requiredEquipment: string
  additionalNotes: string
}

export type DispatchCreateDraft = {
  requestType: DispatchRequestType | null
  emergency: EmergencyDispatchForm
  nonEmergency: NonEmergencyDispatchForm
  referral: ReferralDispatchForm
}

export type DispatchFormErrors = Record<string, string>

export const defaultEmergencyForm = (): EmergencyDispatchForm => ({
  patientName: '',
  phone: '',
  emergencyTypeId: '',
  regionId: '',
  districtId: '',
  stationId: '',
  landmark: '',
  priority: Priority.HIGH,
  briefDescription: '',
  areaStreet: '',
  additionalDirections: '',
  destinationHospitalId: '',
  destinationHospitalBranchId: '',
  destinationHospitalBranchName: '',
})

export const defaultNonEmergencyForm = (): NonEmergencyDispatchForm => ({
  patientName: '',
  phone: '',
  transportType: '',
  regionId: '',
  districtId: '',
  stationId: '',
  pickupAddress: '',
  destination: '',
  destinationHospitalId: '',
  destinationHospitalBranchId: '',
  destinationHospitalBranchName: '',
  bookingDate: '',
  bookingTime: '',
  mobilityRequirement: '',
  wheelchairNeeded: false,
  stretcherNeeded: false,
  specialInstructions: '',
})

export const defaultReferralForm = (): ReferralDispatchForm => ({
  patientName: '',
  phone: '',
  referringHospital: '',
  receivingHospital: '',
  receivingHospitalId: '',
  receivingHospitalBranchId: '',
  receivingHospitalBranchName: '',
  referralReason: '',
  priority: Priority.MEDIUM,
  regionId: '',
  districtId: '',
  stationId: '',
  referringDoctor: '',
  patientConditionSummary: '',
  medicalNotes: '',
  requiredEquipment: '',
  additionalNotes: '',
})

export const defaultDraft = (): DispatchCreateDraft => ({
  requestType: null,
  emergency: defaultEmergencyForm(),
  nonEmergency: defaultNonEmergencyForm(),
  referral: defaultReferralForm(),
})
