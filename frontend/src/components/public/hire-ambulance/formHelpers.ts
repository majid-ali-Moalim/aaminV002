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
  medicalStatus: string
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
  medicalStatus: '',
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
}

export function computePriority(data: HireFormValues): 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' {
  if (
    data.breathingStatus === 'NOT_BREATHING' ||
    data.consciousStatus === 'UNCONSCIOUS' ||
    data.medicalStatus === 'CRITICAL'
  ) {
    return 'CRITICAL'
  }
  if (
    data.breathingStatus === 'DIFFICULTY' ||
    data.medicalStatus === 'SERIOUS' ||
    data.requestType === 'EMERGENCY'
  ) {
    return 'HIGH'
  }
  if (data.requestType === 'NON_EMERGENCY') return 'LOW'
  return 'MEDIUM'
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
  return Boolean(data.latitude?.trim() && data.longitude?.trim())
}

export function hasManualLocation(data: HireFormValues): boolean {
  return Boolean(
    data.regionId &&
      data.districtId &&
      data.areaName.trim() &&
      data.landmarkDescription.trim(),
  )
}

export function validateStep(
  step: StepId,
  data: HireFormValues,
  context?: { emergencyTypes?: HireEmergencyTypeOption[] },
): string | null {
  switch (step) {
    case 'urgency':
      if (!data.requestType) return 'Select request type'
      if (!data.emergencyType) return 'Select emergency type'
      {
        const selectedType = context?.emergencyTypes?.find((t) => t.id === data.emergencyType)
        if (selectedType && isOtherEmergencyType(selectedType) && !data.emergencyTypeOther.trim()) {
          return 'Please type the emergency type when you select Others'
        }
      }
      if (!data.consciousStatus) return 'Indicate if patient is conscious'
      if (!data.breathingStatus) return 'Indicate breathing status'
      if (!data.conditionDescription.trim()) return 'Describe what happened'
      return null
    case 'identity':
      if (!data.isPatient) return 'Please confirm if you are the patient'
      if (data.isPatient === 'NO') {
        if (!data.callerName.trim()) return 'Caller name is required'
        if (!data.callerRelationship) return 'Relationship to patient is required'
      }
      if (!data.callerPhone.trim()) return 'Phone number is required'
      return null
    case 'patient':
      if (!data.patientName.trim()) return 'Patient name is required'
      if (!data.gender) return 'Gender is required'
      if (!data.dateOfBirth) return 'Date of birth is required'
      if (!data.maritalStatus) return 'Marital status is required'
      if (!data.bloodGroup) return 'Blood group is required'
      if (!data.medicalStatus) return 'Medical status is required'
      if (data.isPatient === 'NO' && !data.estimatedAge) return 'Estimated age is required'
      return null
    case 'location':
      if (!hasGpsLocation(data) && !hasManualLocation(data)) {
        return 'Share your GPS location or enter pickup address details'
      }
      return null
    case 'details':
      if (!data.nationalityType) return 'Select nationality type'
      if (data.nationalityType === 'INTERNATIONAL' && !data.country) return 'Select country'
      if (!data.preferredLanguage) return 'Select preferred language'
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
  const finalAge = data.isPatient === 'YES' ? 0 : Number(data.estimatedAge) || 0
  const finalCountry =
    data.nationalityType === 'LOCAL' ? 'Somalia' : data.country || 'Unknown'

  const gps = hasGpsLocation(data)
  const manual = hasManualLocation(data)

  const gpsLabel = gps ? `GPS: ${data.latitude}, ${data.longitude}` : ''
  const manualLabel = manual
    ? data.areaName
      ? `${data.areaName}, ${data.landmarkDescription}`
      : data.landmarkDescription
    : ''

  const pickupLocation = [manualLabel, gpsLabel].filter(Boolean).join(' | ') || gpsLabel
  const pickupLandmark = data.landmarkDescription.trim() || gpsLabel

  return {
    callerName: finalCallerName,
    callerPhone: normalizePhone(data.callerPhone),
    callerAltPhone: data.callerAltPhone ? normalizePhone(data.callerAltPhone) : '',
    callerRelationship: finalRelationship,
    newPatient: {
      fullName: data.patientName,
      gender: data.gender || 'UNKNOWN',
      age: finalAge,
      dateOfBirth: data.dateOfBirth || undefined,
      bloodType: data.bloodGroup || undefined,
      maritalStatus: data.maritalStatus || 'UNKNOWN',
      nationalityType: data.nationalityType,
      country: finalCountry,
      phone: normalizePhone(data.callerPhone),
      alternatePhone: data.callerAltPhone ? normalizePhone(data.callerAltPhone) : undefined,
    },
    patientCondition: data.conditionDescription,
    consciousStatus: data.consciousStatus,
    breathingStatus: data.breathingStatus,
    destination: data.destinationHospital || undefined,
    priority: computePriority(data),
    incidentCategoryId,
    regionId: data.regionId || undefined,
    districtId: data.districtId || undefined,
    pickupLocation,
    pickupLandmark,
    needsOxygen: data.needsOxygen,
    needsStretcher: data.needsStretcher,
    pickupLatitude: gps ? parseFloat(data.latitude) : undefined,
    pickupLongitude: gps ? parseFloat(data.longitude) : undefined,
    notes: [
      `Emergency Type: ${emergencyTypeLabel}`,
      selectedType?.code && !isOtherEmergencyType(selectedType) ? `Type Code: ${selectedType.code}` : '',
      `Directions: ${data.additionalDirections || 'N/A'}`,
      `Language: ${data.preferredLanguage}`,
      `Special Instructions: ${data.specialInstructions || 'None'}`,
      `Request Type: ${data.requestType}`,
      gps ? `Coordinates: ${data.latitude}, ${data.longitude}` : '',
      gps ? `Maps: https://www.google.com/maps?q=${data.latitude},${data.longitude}` : '',
    ]
      .filter(Boolean)
      .join('\n'),
    requestSource: 'OTHER',
  }
}
