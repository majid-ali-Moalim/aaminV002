import { StepId } from './constants'
import {
  AGE_GROUPS,
  HOSPITAL_TRANSPORT_TYPES,
  TRANSPORT_TYPES,
  type TransportTypeValue,
} from './constants'
import type { HireTranslations } from './translations'

export type HireEmergencyTypeOption = {
  id: string
  code: string | null
  name: string
  incidentCategoryId?: string | null
  incidentCategory?: { id: string; name: string } | null
}

export function isOtherEmergencyType(
  type: Pick<HireEmergencyTypeOption, 'code' | 'name'> | undefined,
): boolean {
  if (!type) return false
  const code = (type.code || '').toUpperCase().replace(/-/g, '_')
  const name = type.name.trim().toLowerCase()
  return (
    code === 'OTHER' ||
    code === 'OTHERS' ||
    name === 'other' ||
    name === 'others' ||
    name.startsWith('other ') ||
    name.includes('other emergency')
  )
}

export function isOtherTransportType(transportType: string): boolean {
  return transportType === 'OTHER'
}

export function isFuneralTransport(transportType: string): boolean {
  return transportType === 'FUNERAL'
}

export function isHospitalTransport(transportType: string): boolean {
  return HOSPITAL_TRANSPORT_TYPES.includes(transportType as TransportTypeValue)
}

export type HireFormValues = {
  isPatient: string
  callerName: string
  callerPhone: string
  callerAltPhone: string
  callerRelationship: string
  patientName: string
  gender: string
  ageGroup: string
  estimatedAge: string
  dateOfBirth: string
  bloodGroup: string
  destinationHospital: string
  nationalityType: string
  country: string
  emergencyType: string
  emergencyTypeOther: string
  transportType: string
  transportTypeOther: string
  conditionDescription: string
  consciousStatus: string
  breathingStatus: string
  bleedingStatus: string
  regionId: string
  districtId: string
  areaName: string
  landmarkDescription: string
  additionalDirections: string
  preferredLanguage: string
  specialInstructions: string
  requestType: string
  consent: boolean
  maritalStatus: string
  needsOxygen: boolean
  needsStretcher: boolean
}

export const defaultFormValues: HireFormValues = {
  isPatient: 'NO',
  callerName: '',
  callerPhone: '',
  callerAltPhone: '',
  callerRelationship: '',
  patientName: '',
  gender: '',
  ageGroup: '',
  estimatedAge: '',
  dateOfBirth: '',
  bloodGroup: '',
  destinationHospital: '',
  nationalityType: 'LOCAL',
  country: 'Somalia',
  emergencyType: '',
  emergencyTypeOther: '',
  transportType: '',
  transportTypeOther: '',
  conditionDescription: '',
  consciousStatus: '',
  breathingStatus: '',
  bleedingStatus: '',
  regionId: '',
  districtId: '',
  areaName: '',
  landmarkDescription: '',
  additionalDirections: '',
  preferredLanguage: '',
  specialInstructions: '',
  requestType: 'EMERGENCY',
  consent: false,
  maritalStatus: '',
  needsOxygen: false,
  needsStretcher: false,
}

export function isEmergencyRequest(data: Pick<HireFormValues, 'requestType'>): boolean {
  return data.requestType === 'EMERGENCY'
}

export function computePriority(data: HireFormValues): 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' {
  if (!isEmergencyRequest(data)) return 'LOW'
  if (
    data.breathingStatus === 'NOT_BREATHING' ||
    data.consciousStatus === 'UNCONSCIOUS' ||
    data.bleedingStatus === 'HEAVY_UNCONTROLLED'
  ) {
    return 'CRITICAL'
  }
  if (
    data.breathingStatus === 'DIFFICULTY' ||
    data.bleedingStatus === 'SEVERE' ||
    data.bleedingStatus === 'MINOR'
  ) {
    return 'HIGH'
  }
  return 'HIGH'
}

export function calculateAgeFromDateOfBirth(dateOfBirth: string): number | null {
  if (!dateOfBirth) return null
  const dob = new Date(`${dateOfBirth}T00:00:00`)
  if (Number.isNaN(dob.getTime())) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  if (dob > today) return null
  let age = today.getFullYear() - dob.getFullYear()
  const monthDiff = today.getMonth() - dob.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age -= 1
  }
  return age
}

export function ageFromGroup(ageGroup: string): number | null {
  const row = AGE_GROUPS.find((g) => g.value === ageGroup)
  return row ? row.age : null
}

export function resolvePatientAge(data: HireFormValues): number {
  if (data.isPatient === 'YES') {
    return calculateAgeFromDateOfBirth(data.dateOfBirth) ?? 0
  }
  return ageFromGroup(data.ageGroup) ?? 0
}

export function formatSomaliaPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '').replace(/^252/, '').slice(0, 9)
  if (digits.length <= 3) return digits
  if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`
  return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`
}

export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (digits.startsWith('252')) return digits
  if (digits.length === 9) return `252${digits}`
  return digits
}

export function isValidSomaliaPhone(raw: string): boolean {
  const digits = raw.replace(/\D/g, '').replace(/^252/, '')
  return digits.length === 9 && /^[67]/.test(digits)
}

export function hasManualLocation(data: HireFormValues): boolean {
  return Boolean(data.regionId && data.districtId && data.areaName.trim())
}

export function hasPickupLocation(data: HireFormValues): boolean {
  return hasManualLocation(data)
}

export type ValidationContext = {
  emergencyTypes?: HireEmergencyTypeOption[]
  t: HireTranslations
}

export function validateStep(
  step: StepId,
  data: HireFormValues,
  context: ValidationContext,
): string | null {
  const { t } = context
  const emergency = isEmergencyRequest(data)

  switch (step) {
    case 'urgency': {
      if (!data.requestType) return t.validation.requestType
      if (!emergency) {
        if (!data.transportType) return t.validation.transportType
        if (isOtherTransportType(data.transportType) && !data.transportTypeOther.trim()) {
          return t.validation.transportTypeOther
        }
      } else {
        const selected = context.emergencyTypes?.find((et) => et.id === data.emergencyType)
        if (selected && isOtherEmergencyType(selected) && !data.emergencyTypeOther.trim()) {
          return t.validation.emergencyTypeOther
        }
        if (!data.bleedingStatus) return t.validation.bleeding
        if (!data.consciousStatus) return t.validation.conscious
        if (!data.breathingStatus) return t.validation.breathing
      }
      return null
    }
    case 'identity': {
      if (!data.isPatient) return t.validation.isPatient
      if (data.isPatient === 'NO') {
        if (!data.callerName.trim()) return t.validation.callerName
        if (!data.callerRelationship) return t.validation.relationship
      }
      if (!data.callerPhone.trim()) return t.validation.phone
      if (!isValidSomaliaPhone(data.callerPhone)) return t.validation.phoneInvalid
      return null
    }
    case 'patient': {
      if (data.isPatient === 'YES' && !data.patientName.trim()) return t.validation.patientName
      if (data.isPatient === 'YES') {
        if (!data.dateOfBirth) return t.validation.dob
        const age = calculateAgeFromDateOfBirth(data.dateOfBirth)
        if (age === null) return t.validation.dobInvalid
      } else if (!data.ageGroup) {
        return t.validation.ageGroup
      }
      return null
    }
    case 'location': {
      if (!data.regionId) return t.validation.region
      if (!data.districtId) return t.validation.district
      if (!data.areaName.trim()) return t.validation.area
      if (!emergency && isFuneralTransport(data.transportType)) {
        if (!data.destinationHospital.trim()) {
          return t.validation.destination
        }
      }
      return null
    }
    case 'details': {
      if (
        !isEmergencyRequest(data) &&
        isHospitalTransport(data.transportType) &&
        !data.destinationHospital.trim()
      ) {
        return t.validation.destinationHospital
      }
      return null
    }
    case 'review':
      if (!data.consent) return t.validation.consent
      return null
    default:
      return null
  }
}

export function validateAllSteps(
  data: HireFormValues,
  context: ValidationContext,
): { step: StepId; message: string } | null {
  const steps: StepId[] = ['urgency', 'identity', 'patient', 'location', 'details', 'review']
  for (const step of steps) {
    const err = validateStep(step, data, context)
    if (err) return { step, message: err }
  }
  return null
}

export function transportTypeLabel(data: HireFormValues, t: HireTranslations): string {
  if (isOtherTransportType(data.transportType)) {
    return data.transportTypeOther.trim()
  }
  const key = data.transportType as keyof typeof t.transportTypes
  return t.transportTypes[key] ?? data.transportType
}

export function buildPayload(data: HireFormValues, emergencyTypes?: HireEmergencyTypeOption[]) {
  const selectedType = emergencyTypes?.find((et) => et.id === data.emergencyType)
  const emergencyTypeLabel = selectedType
    ? isOtherEmergencyType(selectedType)
      ? data.emergencyTypeOther.trim()
      : selectedType.name
    : data.emergencyType
  const incidentCategoryId =
    selectedType?.incidentCategoryId || selectedType?.incidentCategory?.id || undefined

  const finalCallerName =
    data.isPatient === 'YES' ? data.patientName.trim() : data.callerName.trim()
  const finalRelationship = data.isPatient === 'YES' ? 'SELF' : data.callerRelationship || 'OTHER'
  const finalAge = resolvePatientAge(data)
  const finalCountry =
    data.nationalityType === 'LOCAL' ? 'Somalia' : data.country.trim() || 'Somalia'

  const pickupParts = [data.areaName.trim(), data.landmarkDescription.trim()].filter(Boolean)

  const transportLabel = !isEmergencyRequest(data)
    ? TRANSPORT_TYPES.find((tt) => tt.value === data.transportType)?.label ??
      (isOtherTransportType(data.transportType) ? data.transportTypeOther.trim() : '')
    : ''

  return {
    callerName: finalCallerName || 'Unknown Caller',
    callerPhone: normalizePhone(data.callerPhone),
    callerAltPhone: data.callerAltPhone.trim() ? normalizePhone(data.callerAltPhone) : '',
    callerRelationship: finalRelationship,
    newPatient: {
      fullName: data.patientName.trim() || (data.isPatient === 'YES' ? 'Unknown Patient' : 'Patient'),
      gender: data.gender || 'UNKNOWN',
      age: finalAge,
      dateOfBirth: data.isPatient === 'YES' ? data.dateOfBirth : undefined,
      bloodType: data.bloodGroup && data.bloodGroup !== 'UNKNOWN' ? data.bloodGroup : undefined,
      maritalStatus: data.maritalStatus || 'UNKNOWN',
      nationalityType: data.nationalityType || 'LOCAL',
      country: finalCountry,
      phone: normalizePhone(data.callerPhone),
      alternatePhone: data.callerAltPhone.trim() ? normalizePhone(data.callerAltPhone) : undefined,
    },
    patientCondition:
      data.conditionDescription.trim() ||
      (isEmergencyRequest(data)
        ? 'Emergency transport request'
        : `Non-emergency transport: ${transportLabel}`),
    consciousStatus: data.consciousStatus || undefined,
    breathingStatus: data.breathingStatus || undefined,
    bleedingStatus: data.bleedingStatus || undefined,
    destination: data.destinationHospital.trim() || undefined,
    priority: computePriority(data),
    incidentCategoryId,
    regionId: data.regionId,
    districtId: data.districtId,
    pickupLocation: pickupParts.join(', ') || 'Location pending confirmation',
    pickupLandmark: data.landmarkDescription.trim() || undefined,
    needsOxygen: data.needsOxygen,
    needsStretcher: data.needsStretcher,
    notes: [
      isEmergencyRequest(data) && emergencyTypeLabel ? `Emergency Type: ${emergencyTypeLabel}` : '',
      !isEmergencyRequest(data) && transportLabel ? `Transport Type: ${transportLabel}` : '',
      !isEmergencyRequest(data) && isOtherTransportType(data.transportType)
        ? `Transport Detail: ${data.transportTypeOther.trim()}`
        : '',
      data.ageGroup && data.isPatient === 'NO' ? `Age Group: ${data.ageGroup}` : '',
      `Language: ${data.preferredLanguage || 'Not specified'}`,
      `Special Instructions: ${data.specialInstructions.trim() || 'None'}`,
      `Request Type: ${isEmergencyRequest(data) ? 'Emergency' : 'Non-Emergency'}`,
    ]
      .filter(Boolean)
      .join('\n'),
    requestSource: 'OTHER',
  }
}
