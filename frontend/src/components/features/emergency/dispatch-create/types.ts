import { Priority } from '@/types'
import {
  defaultSharedDispatchContact,
  type SharedDispatchContact,
} from '@/lib/emergency/dispatchFormShared'

export type DispatchRequestType = 'EMERGENCY' | 'NON_EMERGENCY' | 'REFERRAL'

export type EmergencyDispatchForm = {
  patientName: string
  phone: string
  emergencyTypeId: string
  emergencyTypeOther: string
  regionId: string
  districtId: string
  stationId: string
  landmark: string
  priority: Priority
  briefDescription: string
  areaStreet: string
  needsNurse: boolean | null
}

export type NonEmergencyDispatchForm = {
  patientName: string
  phone: string
  transportType: string
  transportTypeOther: string
  regionId: string
  districtId: string
  stationId: string
  pickupAddress: string
  destination: string
  destinationHospitalId: string
  destinationHospitalName: string
  destinationHospitalBranchId: string
  destinationHospitalBranchName: string
  bookingDateTime: string
  mobilityRequirement: string
  wheelchairNeeded: boolean
  stretcherNeeded: boolean
  specialInstructions: string
  needsNurse: boolean | null
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
  requiredEquipment: string
  additionalNotes: string
  needsNurse: boolean | null
}

export type DispatchCreateDraft = {
  requestType: DispatchRequestType | null
  sharedContact: SharedDispatchContact
  sharedSavedAt: string | null
  emergency: EmergencyDispatchForm
  nonEmergency: NonEmergencyDispatchForm
  referral: ReferralDispatchForm
}

export type DispatchFormErrors = Record<string, string>

export const defaultEmergencyForm = (): EmergencyDispatchForm => ({
  patientName: '',
  phone: '',
  emergencyTypeId: '',
  emergencyTypeOther: '',
  regionId: '',
  districtId: '',
  stationId: '',
  landmark: '',
  priority: Priority.HIGH,
  briefDescription: '',
  areaStreet: '',
  needsNurse: true,
})

export const defaultNonEmergencyForm = (): NonEmergencyDispatchForm => ({
  patientName: '',
  phone: '',
  transportType: '',
  transportTypeOther: '',
  regionId: '',
  districtId: '',
  stationId: '',
  pickupAddress: '',
  destination: '',
  destinationHospitalId: '',
  destinationHospitalName: '',
  destinationHospitalBranchId: '',
  destinationHospitalBranchName: '',
  bookingDateTime: '',
  mobilityRequirement: '',
  wheelchairNeeded: false,
  stretcherNeeded: false,
  specialInstructions: '',
  needsNurse: null,
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
  requiredEquipment: '',
  additionalNotes: '',
  needsNurse: null,
})

export const defaultDraft = (): DispatchCreateDraft => ({
  requestType: null,
  sharedContact: defaultSharedDispatchContact(),
  sharedSavedAt: null,
  emergency: defaultEmergencyForm(),
  nonEmergency: defaultNonEmergencyForm(),
  referral: defaultReferralForm(),
})

/** Merge legacy session-storage drafts into the current shape. */
export function normalizeDispatchDraft(raw: Partial<DispatchCreateDraft>): DispatchCreateDraft {
  const base = defaultDraft()
  const emergency = { ...base.emergency, ...(raw.emergency ?? {}) } as EmergencyDispatchForm & {
    additionalDirections?: string
    destinationHospitalId?: string
  }
  if (!('emergencyTypeOther' in emergency)) emergency.emergencyTypeOther = ''
  if (!('needsNurse' in emergency) || emergency.needsNurse === null) emergency.needsNurse = true

  const nonEmergency = { ...base.nonEmergency, ...(raw.nonEmergency ?? {}) } as NonEmergencyDispatchForm & {
    bookingDate?: string
    bookingTime?: string
  }
  if (!nonEmergency.bookingDateTime && nonEmergency.bookingDate) {
    nonEmergency.bookingDateTime = nonEmergency.bookingTime
      ? `${nonEmergency.bookingDate}T${nonEmergency.bookingTime}`
      : `${nonEmergency.bookingDate}T09:00`
  }
  if (!('transportTypeOther' in nonEmergency)) nonEmergency.transportTypeOther = ''
  if (!('destinationHospitalName' in nonEmergency)) {
    nonEmergency.destinationHospitalName = nonEmergency.destination || ''
  }
  if (!('needsNurse' in nonEmergency)) nonEmergency.needsNurse = null

  const referral = { ...base.referral, ...(raw.referral ?? {}) } as ReferralDispatchForm & {
    medicalNotes?: string
  }
  if (!('needsNurse' in referral)) referral.needsNurse = null

  return {
    ...base,
    ...raw,
    sharedContact: { ...base.sharedContact, ...(raw.sharedContact ?? {}) },
    sharedSavedAt: raw.sharedSavedAt ?? null,
    emergency,
    nonEmergency,
    referral,
  }
}
