/** Dispatch compatibility — filter hospitals by case requirements */

const TYPE_RULES: Record<string, { allowed: string[]; blocked: string[] }> = {
  'Women & Child Hospital': {
    allowed: ['Maternity Care', 'Women & Child Care', 'Pediatric Care', 'General Care'],
    blocked: ['Trauma Care', 'Neurology Support', 'Cardiology Support', 'Surgery Support'],
  },
  Clinic: {
    allowed: ['General Care'],
    blocked: ['ICU Capability', 'Trauma Care', 'Surgery Support'],
  },
  'Trauma Center': {
    allowed: ['Trauma Care', 'Emergency Department', 'Surgery Support', 'ICU Capability'],
    blocked: [],
  },
  'Cardiac Center': {
    allowed: ['Cardiology Support', 'ICU Capability', 'Emergency Department'],
    blocked: [],
  },
};

const CASE_CAPABILITY_MAP: Record<string, string[]> = {
  MATERNITY: ['Maternity Care', 'Women & Child Care'],
  PEDIATRIC: ['Pediatric Care', 'Women & Child Care'],
  TRAUMA: ['Trauma Care', 'Emergency Department', 'Surgery Support'],
  CARDIAC: ['Cardiology Support', 'ICU Capability'],
  NEURO: ['Neurology Support', 'ICU Capability'],
  ICU: ['ICU Capability'],
  GENERAL: ['General Care', 'Emergency Department'],
};

export function hospitalAcceptsEmergency(hospital: {
  acceptEmergencyCases?: boolean
  isActive?: boolean
  operationalStatus?: string
  capacityStatus?: string
  availabilityStatus?: string
  emergencyUnitStatus?: string
}): boolean {
  if (!hospital.acceptEmergencyCases) return false
  if (!hospital.isActive) return false
  if (hospital.operationalStatus && hospital.operationalStatus !== 'Active') return false
  const blockedStatuses = ['Full Capacity', 'Temporarily Unavailable', 'Under Maintenance']
  if (hospital.capacityStatus && blockedStatuses.includes(hospital.capacityStatus)) return false
  if (hospital.availabilityStatus && blockedStatuses.includes(hospital.availabilityStatus)) return false
  if (hospital.emergencyUnitStatus === 'Closed') return false
  return true
}

export function hospitalMatchesCase(
  hospital: {
    hospitalType?: string | null
    medicalCapabilities?: unknown
    acceptEmergencyCases?: boolean
    isActive?: boolean
    operationalStatus?: string
    capacityStatus?: string
    availabilityStatus?: string
    emergencyUnitStatus?: string
  },
  caseInfo?: { priority?: string; incidentCategory?: string; patientCondition?: string },
): boolean {
  if (!hospitalAcceptsEmergency(hospital)) return false

  const caps = Array.isArray(hospital.medicalCapabilities)
    ? (hospital.medicalCapabilities as string[])
    : []

  const typeRule = hospital.hospitalType ? TYPE_RULES[hospital.hospitalType] : undefined
  if (typeRule) {
    // Type-specific blocks checked against capabilities needed
  }

  const condition = [
    caseInfo?.incidentCategory,
    caseInfo?.patientCondition,
    caseInfo?.priority,
  ]
    .filter(Boolean)
    .join(' ')
    .toUpperCase()

  let required: string[] = ['General Care']
  for (const [key, needed] of Object.entries(CASE_CAPABILITY_MAP)) {
    if (condition.includes(key)) required = needed
  }

  if (hospital.hospitalType && TYPE_RULES[hospital.hospitalType]) {
    const blocked = TYPE_RULES[hospital.hospitalType].blocked
    if (required.some((r) => blocked.includes(r))) return false
  }

  return required.some((r) => caps.includes(r)) || caps.includes('General Care')
}

export function filterCompatibleHospitals<T extends Parameters<typeof hospitalMatchesCase>[0]>(
  hospitals: T[],
  caseInfo?: Parameters<typeof hospitalMatchesCase>[1],
): T[] {
  return hospitals.filter((h) => hospitalMatchesCase(h, caseInfo))
}
