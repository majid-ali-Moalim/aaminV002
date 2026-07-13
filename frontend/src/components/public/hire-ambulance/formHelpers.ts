import { StepId } from './constants'
import {
  AGE_GROUPS,
  EMERGENCY_TYPE_OPTIONS,
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
  latitude: string
  longitude: string
  gpsLocationDescription: string
  nationalityUnknown: boolean
  bookingDate: string
  bookingTime: string
  bookingTimeCustom: string
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
  latitude: '',
  longitude: '',
  gpsLocationDescription: '',
  nationalityUnknown: false,
  bookingDate: '',
  bookingTime: '',
  bookingTimeCustom: '',
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

export function hasGpsLocation(data: HireFormValues): boolean {
  if (!data.latitude?.trim() || !data.longitude?.trim()) return false
  const lat = parseFloat(data.latitude)
  const lng = parseFloat(data.longitude)
  return (
    !Number.isNaN(lat) &&
    !Number.isNaN(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  )
}

export function hasManualLocation(data: HireFormValues): boolean {
  return Boolean(data.regionId && data.districtId && data.areaName.trim())
}

export function hasPickupLocation(data: HireFormValues): boolean {
  return hasGpsLocation(data) || hasManualLocation(data)
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
    case 'emergency':
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
    case 'request': {
      if (!data.isPatient) return t.validation.isPatient
      if (data.isPatient === 'NO') {
        if (!data.callerName.trim()) return t.validation.callerName
        if (!data.callerRelationship) return t.validation.relationship
      }
      if (!data.callerPhone.trim()) return t.validation.phone
      if (!isValidSomaliaPhone(data.callerPhone)) return t.validation.phoneInvalid
      if (data.isPatient === 'YES' && !data.patientName.trim()) return t.validation.patientName
      if (data.isPatient === 'YES') {
        if (!data.dateOfBirth) return t.validation.dob
        const age = calculateAgeFromDateOfBirth(data.dateOfBirth)
        if (age === null) return t.validation.dobInvalid
      } else if (!data.ageGroup) {
        return t.validation.ageGroup
      }
      if (
        !isEmergencyRequest(data) &&
        isHospitalTransport(data.transportType) &&
        !data.destinationHospital.trim()
      ) {
        return t.validation.destinationHospital
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
      if (data.latitude?.trim() || data.longitude?.trim()) {
        if (!hasGpsLocation(data)) {
          return 'Enter valid GPS coordinates or clear them and use the pickup address'
        }
      }
      if (!hasPickupLocation(data)) {
        return 'Provide GPS coordinates or a complete pickup address — at least one is required'
      }
      if (hasManualLocation(data)) {
        if (!data.regionId) return t.validation.region
        if (!data.districtId) return t.validation.district
        if (!data.areaName.trim()) return t.validation.area
      }
      if (!emergency && isFuneralTransport(data.transportType)) {
        if (!data.destinationHospital.trim()) {
          return t.validation.destination
        }
      }
      if (!data.consent) return t.validation.consent
      return null
    }
    case 'review':
      if (!data.consent) return t.validation.consent
      return null
    default:
      return null
  }
}

export function isOtherEmergencyTypeValue(value: string): boolean {
  return value === 'other'
}

export function emergencyTypeLabel(value: string, other?: string): string {
  if (value === 'other') return other?.trim() || 'Other'
  const row = EMERGENCY_TYPE_OPTIONS.find((item) => item.value === value)
  return row?.label || value
}

export function resolveIncidentCategoryId(
  emergencyType: string,
  emergencyTypes?: HireEmergencyTypeOption[],
): string | undefined {
  if (!emergencyType || emergencyType === 'other') return undefined
  const label = emergencyTypeLabel(emergencyType).toLowerCase()
  const match = emergencyTypes?.find((item) => {
    const name = item.name.trim().toLowerCase()
    const code = (item.code || '').toLowerCase().replace(/-/g, '_')
    return name === label || name.includes(label) || code.includes(emergencyType)
  })
  return match?.incidentCategoryId || match?.incidentCategory?.id || undefined
}

export function validateEmergencyForm(data: HireFormValues, context: ValidationContext): string | null {
  const { t } = context
  if (!data.patientName.trim()) return t.validation.patientName
  if (!data.callerPhone.trim()) return t.validation.phone
  if (!isValidSomaliaPhone(data.callerPhone)) return t.validation.phoneInvalid
  if (!data.emergencyType) return t.validation.emergencyType
  if (isOtherEmergencyTypeValue(data.emergencyType) && !data.emergencyTypeOther.trim()) {
    return t.validation.emergencyTypeOther
  }
  if (!data.regionId) return t.validation.region
  if (!data.districtId) return t.validation.district
  if (data.conditionDescription.length > 100) return t.validation.conditionMax
  return null
}

export function validateNonEmergencyForm(data: HireFormValues, context: ValidationContext): string | null {
  const { t } = context
  if (!data.patientName.trim()) return t.validation.patientName
  if (!data.callerPhone.trim()) return t.validation.phone
  if (!isValidSomaliaPhone(data.callerPhone)) return t.validation.phoneInvalid
  if (!data.transportType) return t.validation.transportType
  if (isOtherTransportType(data.transportType) && !data.transportTypeOther.trim()) {
    return t.validation.transportTypeOther
  }
  if (!data.regionId) return t.validation.region
  if (!data.districtId) return t.validation.district
  if (!data.areaName.trim()) return t.validation.area
  if (!data.destinationHospital.trim()) return t.validation.destinationHospital
  if (!data.bookingDate) return t.validation.bookingDate
  const time = data.bookingTime === 'custom' ? data.bookingTimeCustom : data.bookingTime
  if (!time) return t.validation.bookingTime
  if (!data.consent) return t.validation.consent
  return null
}

export function resolvedBookingTime(data: HireFormValues): string {
  if (data.bookingTime === 'custom') return data.bookingTimeCustom.trim()
  return data.bookingTime.trim()
}

export function validateAllSteps(
  data: HireFormValues,
  context: ValidationContext,
): { step: StepId; message: string } | null {
  if (isEmergencyRequest(data)) {
    const err = validateEmergencyForm(data, context)
    return err ? { step: 'emergency', message: err } : null
  }
  const err = validateNonEmergencyForm(data, context)
  return err ? { step: 'request', message: err } : null
}

export function transportTypeLabel(data: HireFormValues, t: HireTranslations): string {
  if (isOtherTransportType(data.transportType)) {
    return data.transportTypeOther.trim()
  }
  const key = data.transportType as keyof typeof t.transportTypes
  return t.transportTypes[key] ?? data.transportType
}

export function buildPayload(data: HireFormValues, emergencyTypes?: HireEmergencyTypeOption[]) {
  const emergency = isEmergencyRequest(data)
  const typeLabel = emergencyTypeLabel(data.emergencyType, data.emergencyTypeOther)
  const incidentCategoryId = emergency
    ? resolveIncidentCategoryId(data.emergencyType, emergencyTypes)
    : undefined

  const pickupParts = [data.areaName.trim(), data.landmarkDescription.trim()].filter(Boolean)
  const pickupLocation =
    pickupParts.join(', ') || data.areaName.trim() || 'Location pending confirmation'
  const pickupLandmark = data.areaName.trim() || data.landmarkDescription.trim() || undefined

  const transportLabel = !emergency
    ? TRANSPORT_TYPES.find((tt) => tt.value === data.transportType)?.label ??
      (isOtherTransportType(data.transportType) ? data.transportTypeOther.trim() : '')
    : ''

  const bookingTime = resolvedBookingTime(data)

  return {
    callerName: data.patientName.trim() || 'Unknown Caller',
    callerPhone: normalizePhone(data.callerPhone),
    callerRelationship: 'OTHER',
    newPatient: {
      fullName: data.patientName.trim() || 'Unknown Patient',
      gender: 'UNKNOWN',
      age: 0,
      phone: normalizePhone(data.callerPhone),
      nationalityType: 'LOCAL',
      country: 'Somalia',
    },
    patientCondition: emergency
      ? data.conditionDescription.trim() || `Emergency: ${typeLabel}`
      : `Non-emergency transport: ${transportLabel}`,
    destination: !emergency ? data.destinationHospital.trim() || undefined : undefined,
    priority: emergency ? 'HIGH' : 'LOW',
    incidentCategoryId,
    regionId: data.regionId || undefined,
    districtId: data.districtId || undefined,
    pickupLocation,
    pickupLandmark,
    notes: [
      `Request Type: ${emergency ? 'Emergency' : 'Non-Emergency'}`,
      emergency ? `Emergency Type: ${typeLabel}` : '',
      !emergency && transportLabel ? `Transport Type: ${transportLabel}` : '',
      !emergency && isOtherTransportType(data.transportType)
        ? `Transport Detail: ${data.transportTypeOther.trim()}`
        : '',
      !emergency && data.bookingDate ? `Booking Date: ${data.bookingDate}` : '',
      !emergency && bookingTime ? `Booking Time: ${bookingTime}` : '',
      !emergency ? `Special Instructions: ${data.specialInstructions.trim() || 'None'}` : '',
      emergency && data.conditionDescription.trim()
        ? `What happened: ${data.conditionDescription.trim()}`
        : '',
    ]
      .filter(Boolean)
      .join('\n'),
    requestSource: 'OTHER',
  }
}
