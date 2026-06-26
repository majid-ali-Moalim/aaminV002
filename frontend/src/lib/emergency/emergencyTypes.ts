import { API_BASE_URL } from '@/lib/api'

/** Same records as Admin → Master Data → Emergency Configuration → Emergency Types */
export type EmergencyTypeOption = {
  id: string
  code: string | null
  name: string
  description?: string | null
  incidentCategoryId?: string | null
  incidentCategory?: { id: string; name: string; code?: string | null } | null
  isActive?: boolean
}

export function isOtherEmergencyType(
  type: Pick<EmergencyTypeOption, 'code' | 'name'> | undefined,
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

export function sortEmergencyTypes(types: EmergencyTypeOption[]): EmergencyTypeOption[] {
  return [...types].sort((a, b) => {
    if (isOtherEmergencyType(a)) return 1
    if (isOtherEmergencyType(b)) return -1
    return a.name.localeCompare(b.name)
  })
}

/** Public endpoints — active rows in master-data/emergency (Emergency Types tab). */
export async function fetchEmergencyTypes(): Promise<EmergencyTypeOption[]> {
  const endpoints = [
    `${API_BASE_URL}/api/public/emergency-types`,
    `${API_BASE_URL}/api/setup/emergency-types`,
  ]

  for (const url of endpoints) {
    try {
      const res = await fetch(url, { cache: 'no-store' })
      if (!res.ok) continue
      const data = await res.json()
      const list = Array.isArray(data) ? (data as EmergencyTypeOption[]) : []
      const active = list.filter((t) => t.isActive !== false)
      if (active.length > 0) {
        return sortEmergencyTypes(active)
      }
    } catch {
      /* try next endpoint */
    }
  }

  return []
}

export async function fetchEmergencyTypesAuthenticated(): Promise<EmergencyTypeOption[]> {
  const { systemSetupService } = await import('@/lib/api')
  const data = await systemSetupService.getEmergencyTypes()
  const list = Array.isArray(data) ? (data as EmergencyTypeOption[]) : []
  return sortEmergencyTypes(list.filter((t) => t.isActive !== false))
}

export function resolveIncidentCategoryId(type: EmergencyTypeOption | undefined): string | undefined {
  if (!type) return undefined
  return type.incidentCategoryId || type.incidentCategory?.id || undefined
}

export type FleetAvailability = {
  available: number
  total: number
  canAcceptRequests: boolean
}

export async function fetchFleetAvailability(): Promise<FleetAvailability | null> {
  const endpoints = [
    `${API_BASE_URL}/api/public/fleet/availability`,
    `${API_BASE_URL}/api/emergency-requests/available/ambulances`,
  ]

  for (const url of endpoints) {
    try {
      const res = await fetch(url, { cache: 'no-store' })
      if (!res.ok) continue

      if (url.includes('fleet/availability')) {
        const data = await res.json()
        if (typeof data?.available === 'number') {
          return {
            available: data.available,
            total: data.total ?? data.available,
            canAcceptRequests: Boolean(data.canAcceptRequests ?? data.available > 0),
          }
        }
      }

      const ambulances = await res.json()
      const list = Array.isArray(ambulances) ? ambulances : []
      const available = list.filter((a: { status?: string }) => a.status === 'AVAILABLE').length
      return {
        available,
        total: list.length,
        canAcceptRequests: available > 0,
      }
    } catch {
      /* try next */
    }
  }

  return null
}
