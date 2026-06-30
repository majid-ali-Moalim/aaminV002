import type { HireEmergencyTypeOption } from '@/components/public/hire-ambulance/formHelpers'
import { fetchEmergencyTypes, sortEmergencyTypes, type EmergencyTypeOption } from '@/lib/emergency/emergencyTypes'

export type { HireEmergencyTypeOption }

/** Same records as Admin → Master Data → Emergency Configuration → Emergency Types */
export async function fetchHireEmergencyTypes(): Promise<HireEmergencyTypeOption[]> {
  const list = await fetchEmergencyTypes()
  return sortEmergencyTypes(list as EmergencyTypeOption[]) as HireEmergencyTypeOption[]
}
