import { API_BASE } from '@/components/public/hire-ambulance/constants'
import {
  HireEmergencyTypeOption,
  isOtherEmergencyType,
} from '@/components/public/hire-ambulance/formHelpers'

/** Same records as Admin → Master Data → Emergency Configuration → Emergency Types */
export async function fetchHireEmergencyTypes(): Promise<HireEmergencyTypeOption[]> {
  const res = await fetch(`${API_BASE}/api/setup/emergency-types`, { cache: 'no-store' })
  if (!res.ok) return []
  const data = await res.json()
  const list = Array.isArray(data) ? (data as HireEmergencyTypeOption[]) : []
  return sortEmergencyTypesForHire(list)
}

export function sortEmergencyTypesForHire(types: HireEmergencyTypeOption[]): HireEmergencyTypeOption[] {
  return [...types].sort((a, b) => {
    if (isOtherEmergencyType(a)) return 1
    if (isOtherEmergencyType(b)) return -1
    return a.name.localeCompare(b.name)
  })
}
