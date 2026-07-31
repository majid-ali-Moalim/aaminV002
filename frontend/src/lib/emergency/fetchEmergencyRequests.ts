import { emergencyRequestsService } from '@/lib/api'
import type { EmergencyRequest } from '@/types'
import type { EmergencyPortal } from '@/lib/emergency/emergencyPortalPaths'

export type EmergencyQueue = 'pending' | 'my-active' | 'my-cases' | 'regional'

/** Fetch emergency cases with dispatcher queue scoping when in dispatcher portal. */
export async function fetchEmergencyRequests(
  portal: EmergencyPortal,
  queue?: EmergencyQueue,
  options?: { activeOnly?: boolean },
): Promise<EmergencyRequest[]> {
  const status = options?.activeOnly ? 'active' : undefined
  if (portal === 'dispatcher') {
    const data = await emergencyRequestsService.getAll({
      queue: queue ?? 'regional',
      ...(status ? { status } : {}),
    })
    return Array.isArray(data) ? data : []
  }
  const data = await emergencyRequestsService.getAll(status ? { status } : undefined)
  return Array.isArray(data) ? data : []
}

/** Pending = regional unassigned queue; active/monitoring = this dispatcher's assigned cases. */
export function dispatcherQueueForPage(
  page: 'pending' | 'active' | 'my-cases' | 'monitoring' | 'critical' | 'default',
): EmergencyQueue {
  switch (page) {
    case 'pending':
      return 'pending'
    case 'active':
    case 'monitoring':
      return 'my-active'
    case 'my-cases':
      return 'my-cases'
    case 'critical':
      return 'my-active'
    default:
      return 'regional'
  }
}
