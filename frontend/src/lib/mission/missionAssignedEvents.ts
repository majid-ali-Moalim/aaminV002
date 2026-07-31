export const MISSION_ASSIGNED_EVENT = 'aamin:mission-assigned'

export type MissionAssignedDetail = {
  id: string
  trackingCode?: string
  status?: string
}

export function dispatchMissionAssignedEvent(mission: MissionAssignedDetail) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(MISSION_ASSIGNED_EVENT, { detail: mission }))
}

export function onMissionAssigned(handler: (mission: MissionAssignedDetail) => void) {
  if (typeof window === 'undefined') return () => {}
  const listener = (event: Event) => {
    const detail = (event as CustomEvent<MissionAssignedDetail>).detail
    if (detail?.id) handler(detail)
  }
  window.addEventListener(MISSION_ASSIGNED_EVENT, listener)
  return () => window.removeEventListener(MISSION_ASSIGNED_EVENT, listener)
}
