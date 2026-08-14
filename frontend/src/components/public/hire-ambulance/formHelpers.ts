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
  scheduleMode: 'now' | 'booking' | ''
}

const KEYBOARD_SPAM_PATTERNS = [
  'asdf',
  'asdfg',
  'asdfgh',
  'qwerty',
  'qwertyu',
  'qwer',
  'zxcv',
  'zxcvb',
  'zxcvbn',
  '12345',
  '123456',
  '1234567',
  'abcdef',
  'abc123',
  'qazwsx',
  'qweasd',
  'wasd',
  'fdsa',
  'ytrewq',
  'poiuy',
  'lkjhg',
  'mnbvc',
  'hjkl',
  'yuio',
  'bnm',
]

const ALLOWED_LITERAL_NAMES = new Set(['unknown patient', 'unknown caller'])

export function hasRepeatedCharacters(value: string, minRepeat = 4): boolean {
  const compact = value.replace(/\s+/g, '')
  if (compact.length < minRepeat) return false
  return /(.)\1{3,}/i.test(compact)
}

export function hasKeyboardSpamPattern(value: string): boolean {
  const compact = value.toLowerCase().replace(/[^a-z0-9]/g, '')
  if (compact.length < 4) return false
  return KEYBOARD_SPAM_PATTERNS.some((pattern) => compact.includes(pattern))
}

export function isInvalidTextInput(value: string): boolean {
  const trimmed = value.trim()
  if (!trimmed) return false
  if (ALLOWED_LITERAL_NAMES.has(trimmed.toLowerCase())) return false
  return hasRepeatedCharacters(trimmed) || hasKeyboardSpamPattern(trimmed)
}

function validateOptionalTextField(
  value: string,
  field: keyof HireFormValues,
  errors: HireFormErrors,
  invalidMessage: string,
) {
  if (value.trim() && isInvalidTextInput(value)) {
    errors[field] = invalidMessage
  }
}

function validateRequiredTextField(
  value: string,
  field: keyof HireFormValues,
  errors: HireFormErrors,
  requiredMessage: string,
  invalidMessage: string,
) {
  if (!value.trim()) {
    errors[field] = requiredMessage
    return
  }
  if (isInvalidTextInput(value)) {
    errors[field] = invalidMessage
  }
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
  consciousStatus: 'CONSCIOUS',
  breathingStatus: 'NORMAL',
  bleedingStatus: 'NONE',
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
  scheduleMode: 'now',
}

export function isEmergencyRequest(data: Pick<HireFormValues, 'requestType'>): boolean {
  return data.requestType === 'EMERGENCY'
}

export function computePriority(data: HireFormValues): 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' {
  if (!isEmergencyRequest(data)) return 'LOW'

  const { consciousStatus, breathingStatus, bleedingStatus } = data
  if (!consciousStatus || !breathingStatus || !bleedingStatus) return 'HIGH'

  if (
    ['NOT_BREATHING', 'ARREST'].includes(breathingStatus) ||
    consciousStatus === 'UNCONSCIOUS' ||
    bleedingStatus === 'SEVERE'
  ) {
    return 'CRITICAL'
  }

  if (
    ['DIFFICULTY', 'DIFFICULT', 'LABORED'].includes(breathingStatus) ||
    consciousStatus === 'SEMI_CONSCIOUS' ||
    bleedingStatus === 'MILD' ||
    bleedingStatus === 'MODERATE'
  ) {
    return 'HIGH'
  }

  if (consciousStatus === 'CONSCIOUS' && breathingStatus === 'NORMAL' && bleedingStatus === 'NONE') {
    return 'MEDIUM'
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

export type HireFormErrors = Partial<Record<keyof HireFormValues, string>>

export function validateEmergencyFormFields(
  data: HireFormValues,
  context: ValidationContext,
): HireFormErrors {
  const { t } = context
  const errors: HireFormErrors = {}

  if (!data.requestType) errors.requestType = t.validation.requestType
  validateRequiredTextField(
    data.patientName,
    'patientName',
    errors,
    t.validation.patientName,
    t.validation.invalidText,
  )
  if (!data.callerPhone.trim()) {
    errors.callerPhone = t.validation.phone
  } else if (!isValidSomaliaPhone(data.callerPhone)) {
    errors.callerPhone = t.validation.phoneInvalid
  }
  if (!data.regionId) errors.regionId = t.validation.region
  if (!data.districtId) errors.districtId = t.validation.district
  validateRequiredTextField(data.areaName, 'areaName', errors, t.validation.area, t.validation.invalidText)
  validateRequiredTextField(
    data.conditionDescription,
    'conditionDescription',
    errors,
    t.validation.briefDescription,
    t.validation.invalidText,
  )
  if (data.conditionDescription.length > 100) {
    errors.conditionDescription = t.validation.conditionMax
  }

  return errors
}

export function validateNonEmergencyFormFields(
  data: HireFormValues,
  context: ValidationContext,
): HireFormErrors {
  const { t } = context
  const errors: HireFormErrors = {}

  if (!data.requestType) errors.requestType = t.validation.requestType
  validateRequiredTextField(
    data.patientName,
    'patientName',
    errors,
    t.validation.patientName,
    t.validation.invalidText,
  )
  if (!data.callerPhone.trim()) {
    errors.callerPhone = t.validation.phone
  } else if (!isValidSomaliaPhone(data.callerPhone)) {
    errors.callerPhone = t.validation.phoneInvalid
  }
  if (!data.transportType) {
    errors.transportType = t.validation.transportType
  } else if (isOtherTransportType(data.transportType)) {
    validateRequiredTextField(
      data.transportTypeOther,
      'transportTypeOther',
      errors,
      t.validation.transportTypeOther,
      t.validation.invalidText,
    )
  }
  if (!data.regionId) errors.regionId = t.validation.region
  if (!data.districtId) errors.districtId = t.validation.district
  validateRequiredTextField(data.areaName, 'areaName', errors, t.validation.area, t.validation.invalidText)
  validateRequiredTextField(
    data.destinationHospital,
    'destinationHospital',
    errors,
    t.validation.destinationHospital,
    t.validation.invalidText,
  )
  validateOptionalTextField(data.specialInstructions, 'specialInstructions', errors, t.validation.invalidText)

  const wantsBooking = data.scheduleMode === 'booking'
  if (wantsBooking) {
    if (!data.bookingDate) {
      errors.bookingDate = t.validation.bookingDate
    } else if (data.bookingDate < new Date().toISOString().slice(0, 10)) {
      errors.bookingDate = t.validation.bookingDatePast
    }
    if (!data.bookingTime) {
      errors.bookingTime = t.validation.bookingTime
    } else if (data.bookingTime === 'custom' && !data.bookingTimeCustom.trim()) {
      errors.bookingTimeCustom = t.validation.bookingTime
    }
  }
  if (!data.consent) errors.consent = t.validation.consent

  return errors
}

export function firstFormError(errors: HireFormErrors): string | null {
  const values = Object.values(errors).filter(Boolean)
  return values[0] ?? null
}

export function validateEmergencyForm(data: HireFormValues, context: ValidationContext): string | null {
  return firstFormError(validateEmergencyFormFields(data, context))
}

export function validateNonEmergencyForm(data: HireFormValues, context: ValidationContext): string | null {
  return firstFormError(validateNonEmergencyFormFields(data, context))
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

export function buildPayload(data: HireFormValues) {
  const emergency = isEmergencyRequest(data)

  const pickupParts = [data.areaName.trim(), data.landmarkDescription.trim()].filter(Boolean)
  const pickupLocation =
    pickupParts.join(', ') || data.areaName.trim() || 'Location pending confirmation'
  const pickupLandmark = data.areaName.trim() || data.landmarkDescription.trim() || undefined

  const transportLabel = !emergency
    ? TRANSPORT_TYPES.find((tt) => tt.value === data.transportType)?.label ??
      (isOtherTransportType(data.transportType) ? data.transportTypeOther.trim() : '')
    : ''

  const wantsBooking = !emergency && data.scheduleMode === 'booking'
  const bookingTime = wantsBooking ? resolvedBookingTime(data) : ''
  const priority = emergency ? 'HIGH' : 'LOW'

  return {
    callerName: data.patientName.trim() || 'Unknown Caller',
    callerPhone: normalizePhone(data.callerPhone),
    callerRelationship: 'OTHER',
    newPatient: {
      fullName: data.patientName.trim() || 'Unknown Patient',
      age: 0,
      phone: normalizePhone(data.callerPhone),
      nationalityType: 'LOCAL',
      country: 'Somalia',
      ...(data.gender === 'MALE' || data.gender === 'FEMALE' ? { gender: data.gender } : {}),
    },
    patientCondition: emergency
      ? data.conditionDescription.trim()
      : `Non-emergency transport: ${transportLabel}`,
    destination: !emergency ? data.destinationHospital.trim() || undefined : undefined,
    priority,
    regionId: data.regionId || undefined,
    districtId: data.districtId || undefined,
    pickupLocation,
    pickupLandmark,
    notes: [
      `Request Type: ${emergency ? 'Emergency' : 'Non-Emergency'}`,
      emergency ? 'Triage details pending — to be completed by dispatch' : '',
      !emergency && transportLabel ? `Transport Type: ${transportLabel}` : '',
      !emergency && isOtherTransportType(data.transportType)
        ? `Transport Detail: ${data.transportTypeOther.trim()}`
        : '',
      !emergency ? `Schedule: ${wantsBooking ? 'Booking' : 'Now'}` : '',
      wantsBooking && data.bookingDate ? `Booking Date: ${data.bookingDate}` : '',
      wantsBooking && bookingTime ? `Booking Time: ${bookingTime}` : '',
      !emergency ? `Special Instructions: ${data.specialInstructions.trim() || 'None'}` : '',
      emergency && data.conditionDescription.trim()
        ? `Brief description: ${data.conditionDescription.trim()}`
        : '',
    ]
      .filter(Boolean)
      .join('\n'),
    requestSource: 'OTHER',
  }
}
