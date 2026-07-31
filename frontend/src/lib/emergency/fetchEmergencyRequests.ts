import { emergencyRequestsService } from '@/lib/api'
import type { EmergencyRequest } from '@/types'
import type { EmergencyPortal } from '@/lib/emergency/emergencyPortalPaths'

export type EmergencyQueue = 'pending' | 'my-active' | 'station-active' | 'my-cases' | 'regional'

/** Dispatcher active missions scope on the active page. */
export type DispatcherActiveScope = 'my-active' | 'station-active'

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

/** Pending = regional unassigned; active page uses my-active or station-active. */
export function dispatcherQueueForPage(
  page: 'pending' | 'active' | 'my-cases' | 'monitoring' | 'critical' | 'default',
  activeScope: DispatcherActiveScope = 'my-active',
): EmergencyQueue {
  switch (page) {
    case 'pending':
      return 'pending'
    case 'active':
    case 'monitoring':
      return activeScope
    case 'my-cases':
      return 'my-cases'
    case 'critical':
      return 'my-active'
    default:
      return 'regional'
  }
}
