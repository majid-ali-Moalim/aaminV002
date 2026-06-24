import { StepId } from './constants'

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

export type HireFormValues = {
  isPatient: string
  callerName: string
  callerPhone: string
  callerAltPhone: string
  callerRelationship: string
  patientName: string
  gender: string
  estimatedAge: string
  dateOfBirth: string
  bloodGroup: string
  destinationHospital: string
  nationalityType: string
  country: string
  emergencyType: string
  emergencyTypeOther: string
  conditionDescription: string
  consciousStatus: string
  breathingStatus: string
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
}

export const defaultFormValues: HireFormValues = {
  isPatient: '',
  callerName: '',
  callerPhone: '',
  callerAltPhone: '',
  callerRelationship: '',
  patientName: '',
  gender: '',
  estimatedAge: '',
  dateOfBirth: '',
  bloodGroup: '',
  destinationHospital: '',
  nationalityType: '',
  country: '',
  emergencyType: '',
  emergencyTypeOther: '',
  conditionDescription: '',
  consciousStatus: '',
  breathingStatus: '',
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
}

export function computePriority(data: HireFormValues): 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' {
  if (!isEmergencyRequest(data)) return 'LOW'
  if (data.breathingStatus === 'NOT_BREATHING' || data.consciousStatus === 'UNCONSCIOUS') {
    return 'CRITICAL'
  }
  if (data.breathingStatus === 'DIFFICULTY') return 'HIGH'
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

export function syncEstimatedAgeFromDob(dateOfBirth: string): string {
  const age = calculateAgeFromDateOfBirth(dateOfBirth)
  return age !== null ? String(age) : ''
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

export function isEmergencyRequest(data: Pick<HireFormValues, 'requestType'>): boolean {
  return data.requestType === 'EMERGENCY'
}

export function validateStep(
  step: StepId,
  data: HireFormValues,
  context?: { emergencyTypes?: HireEmergencyTypeOption[] },
): string | null {
  switch (step) {
    case 'urgency':
      if (!data.requestType) return 'Select request type'
      return null
    case 'identity':
      return null
    case 'patient':
      if (data.dateOfBirth) {
        const age = calculateAgeFromDateOfBirth(data.dateOfBirth)
        if (age === null) return 'Enter a valid date of birth that is not in the future'
      }
      return null
    case 'location':
      if (data.latitude?.trim() || data.longitude?.trim()) {
        if (!hasGpsLocation(data)) {
          return 'Enter valid GPS coordinates or clear them and use the pickup address'
        }
      }
      return null
    case 'details':
      return null
    case 'review':
      if (!data.consent) return 'You must confirm this is a genuine request'
      return null
    default:
      return null
  }
}

export function buildPayload(data: HireFormValues, emergencyTypes?: HireEmergencyTypeOption[]) {
  const selectedType = emergencyTypes?.find((t) => t.id === data.emergencyType)
  const emergencyTypeLabel = selectedType
    ? isOtherEmergencyType(selectedType)
      ? data.emergencyTypeOther.trim()
      : selectedType.name
    : data.emergencyType
  const incidentCategoryId =
    selectedType?.incidentCategoryId || selectedType?.incidentCategory?.id || undefined

  const finalCallerName =
    data.isPatient === 'YES' ? data.patientName : data.callerName || 'Unknown Caller'
  const finalRelationship = data.isPatient === 'YES' ? 'SELF' : data.callerRelationship || 'OTHER'
  const finalAge = calculateAgeFromDateOfBirth(data.dateOfBirth) ?? 0
  const finalCountry =
    data.nationalityType === 'UNKNOWN' || data.nationalityUnknown
      ? 'Unknown'
      : data.nationalityType === 'LOCAL'
        ? 'Somalia'
        : data.country || 'Unknown'

  const gps = hasGpsLocation(data)
  const manual = hasManualLocation(data)

  const gpsLabel = gps ? `GPS: ${data.latitude}, ${data.longitude}` : ''
  const manualLabel = manual ? data.areaName.trim() : ''

  const gpsDetail = data.gpsLocationDescription.trim()
  const pickupLocation = [manualLabel, gpsLabel, gpsDetail ? `Place: ${gpsDetail}` : '']
    .filter(Boolean)
    .join(' | ') || gpsLabel
  const pickupLandmark =
    data.areaName.trim() || gpsDetail || data.additionalDirections.trim() || gpsLabel

  return {
    callerName: finalCallerName,
    callerPhone: data.callerPhone.trim() ? normalizePhone(data.callerPhone) : '',
    callerAltPhone: data.callerAltPhone ? normalizePhone(data.callerAltPhone) : '',
    callerRelationship: finalRelationship,
    newPatient: {
      fullName: data.patientName.trim() || (data.isPatient === 'NO' ? 'Unknown Patient' : ''),
      gender: data.gender || 'UNKNOWN',
      age: finalAge,
      dateOfBirth: data.dateOfBirth || undefined,
      bloodType: data.bloodGroup || undefined,
      maritalStatus: data.maritalStatus || 'UNKNOWN',
      nationalityType: data.nationalityType,
      country: finalCountry,
      phone: data.callerPhone.trim() ? normalizePhone(data.callerPhone) : undefined,
      alternatePhone: data.callerAltPhone ? normalizePhone(data.callerAltPhone) : undefined,
    },
    patientCondition:
      data.conditionDescription.trim() ||
      (isEmergencyRequest(data)
        ? 'Emergency transport request'
        : 'Non-emergency transport — details to be confirmed by dispatch'),
    consciousStatus: data.consciousStatus || undefined,
    breathingStatus: data.breathingStatus || undefined,
    destination: data.destinationHospital || undefined,
    priority: computePriority(data),
    incidentCategoryId,
    regionId: data.regionId || undefined,
    districtId: data.districtId || undefined,
    pickupLocation: pickupLocation || 'Location to be confirmed by dispatch',
    pickupLandmark: pickupLandmark || 'To be confirmed',
    needsOxygen: data.needsOxygen,
    needsStretcher: data.needsStretcher,
    pickupLatitude: gps ? parseFloat(data.latitude) : undefined,
    pickupLongitude: gps ? parseFloat(data.longitude) : undefined,
    notes: [
      isEmergencyRequest(data) && emergencyTypeLabel ? `Emergency Type: ${emergencyTypeLabel}` : '',
      isEmergencyRequest(data) && selectedType?.code && !isOtherEmergencyType(selectedType)
        ? `Type Code: ${selectedType.code}`
        : '',
      `Directions: ${data.additionalDirections || 'N/A'}`,
      `Language: ${data.preferredLanguage || 'Not specified'}`,
      `Special Instructions: ${data.specialInstructions || 'None'}`,
      `Request Type: ${data.requestType === 'EMERGENCY' ? 'Emergency' : 'Non-Emergency'}`,
      !isEmergencyRequest(data) ? 'Triage: To be completed by dispatch if needed' : '',
      gps ? `Coordinates: ${data.latitude}, ${data.longitude}` : '',
      gps && gpsDetail ? `Patient location details: ${gpsDetail}` : '',
      gps ? `Maps: https://www.google.com/maps?q=${data.latitude},${data.longitude}` : '',
    ]
      .filter(Boolean)
      .join('\n'),
    requestSource: 'OTHER',
  }
}
