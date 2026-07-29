import { API_BASE_URL } from '@/lib/api'

/** Same records as Admin → Master Data → Mission Configuration → Transport Types */
export type TransportTypeOption = {
  id: string
  code: string | null
  name: string
  description?: string | null
  isActive?: boolean
}

export function isOtherTransportType(
  type: Pick<TransportTypeOption, 'code' | 'name'> | undefined,
): boolean {
  if (!type) return false
  const code = (type.code || '').toUpperCase().replace(/-/g, '_')
  const name = type.name.trim().toLowerCase()
  return (
    code === 'OTHER' ||
    code === 'OTHERS' ||
    name === 'other' ||
    name === 'others' ||
    name.startsWith('other ')
  )
}

export function isFuneralTransportCode(code: string): boolean {
  return code.toUpperCase().replace(/-/g, '_') === 'FUNERAL'
}

export function sortTransportTypes(types: TransportTypeOption[]): TransportTypeOption[] {
  return [...types].sort((a, b) => {
    if (isOtherTransportType(a)) return 1
    if (isOtherTransportType(b)) return -1
    return a.name.localeCompare(b.name)
  })
}

export function resolveTransportTypeLabel(
  code: string,
  otherDetail: string,
  types: TransportTypeOption[],
): string {
  const match = types.find((t) => (t.code || '').toUpperCase() === code.toUpperCase())
  if (match && isOtherTransportType(match)) {
    return otherDetail.trim() ? `Other: ${otherDetail.trim()}` : 'Other'
  }
  if (match) return match.name
  if (code === 'OTHER') return otherDetail.trim() ? `Other: ${otherDetail.trim()}` : 'Other'
  return code.replace(/_/g, ' ')
}

/** Read active transport types from master-data mission configuration. */
export async function fetchTransportTypes(): Promise<TransportTypeOption[]> {
  try {
    const { mdmService } = await import('@/lib/api')
    const data = await mdmService.listAll('transport-types', { status: 'active' })
    const list = Array.isArray(data) ? (data as TransportTypeOption[]) : []
    const active = list.filter((t) => t.isActive !== false)
    if (active.length > 0) {
      return sortTransportTypes(active)
    }
  } catch {
    /* dispatchers may lack MDM read permission — fall back to setup endpoint */
  }

  try {
    const res = await fetch(`${API_BASE_URL}/api/setup/transport-types`, {
      cache: 'no-store',
      credentials: 'include',
    })
    if (!res.ok) return []
    const data = await res.json()
    const list = Array.isArray(data) ? (data as TransportTypeOption[]) : []
    return sortTransportTypes(list.filter((t) => t.isActive !== false))
  } catch {
    return []
  }
}
