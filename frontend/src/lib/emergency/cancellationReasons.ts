import { API_BASE_URL } from '@/lib/api'

/** Same records as Admin → Master Data → Mission Configuration → Cancellation Reasons */
export type CancellationReasonOption = {
  id: string
  code: string | null
  name: string
  description?: string | null
  isActive?: boolean
}

export function isOtherCancellationReason(
  reason: Pick<CancellationReasonOption, 'code' | 'name'> | undefined,
): boolean {
  if (!reason) return false
  const code = (reason.code || '').toUpperCase().replace(/-/g, '_')
  const name = reason.name.trim().toLowerCase()
  return (
    code === 'OTHER' ||
    code === 'OTHERS' ||
    name === 'other' ||
    name === 'others' ||
    name.startsWith('other ')
  )
}

export function sortCancellationReasons(
  reasons: CancellationReasonOption[],
): CancellationReasonOption[] {
  return [...reasons].sort((a, b) => {
    if (isOtherCancellationReason(a)) return 1
    if (isOtherCancellationReason(b)) return -1
    return a.name.localeCompare(b.name)
  })
}

export function buildCancellationReasonText(
  reason: CancellationReasonOption | undefined,
  otherDetail: string,
): string {
  if (!reason) return otherDetail.trim()
  if (isOtherCancellationReason(reason)) {
    return `Other: ${otherDetail.trim()}`
  }
  return reason.name.trim()
}

/** Read active cancellation reasons from master-data mission configuration. */
export async function fetchCancellationReasons(): Promise<CancellationReasonOption[]> {
  try {
    const { mdmService } = await import('@/lib/api')
    const data = await mdmService.listAll('cancellation-reasons', { status: 'active' })
    const list = Array.isArray(data) ? (data as CancellationReasonOption[]) : []
    const active = list.filter((r) => r.isActive !== false)
    if (active.length > 0) {
      return sortCancellationReasons(active)
    }
  } catch {
    /* dispatchers may lack MDM read permission — fall back to setup endpoint */
  }

  try {
    const res = await fetch(`${API_BASE_URL}/api/setup/cancellation-reasons`, {
      cache: 'no-store',
      credentials: 'include',
    })
    if (!res.ok) return []
    const data = await res.json()
    const list = Array.isArray(data) ? (data as CancellationReasonOption[]) : []
    return sortCancellationReasons(list.filter((r) => r.isActive !== false))
  } catch {
    return []
  }
}
