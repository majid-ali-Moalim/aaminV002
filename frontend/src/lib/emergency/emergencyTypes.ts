const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'

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

/** Public endpoint — mirrors active rows in master-data/emergency (Emergency Types tab). */
export async function fetchEmergencyTypes(): Promise<EmergencyTypeOption[]> {
  const res = await fetch(`${API_BASE}/api/setup/emergency-types`, { cache: 'no-store' })
  if (!res.ok) return []
  const data = await res.json()
  const list = Array.isArray(data) ? (data as EmergencyTypeOption[]) : []
  return sortEmergencyTypes(list.filter((t) => t.isActive !== false))
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
