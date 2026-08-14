const DESKTOP_PREFS_KEY = 'aamin_notification_desktop_prefs'

export type DesktopNotificationPrefs = {
  desktopEnabled: boolean
  soundEnabled: boolean
  newEmergency: boolean
  crewAssignment: boolean
  caseUpdates: boolean
  adminNotifications: boolean
}

export const DEFAULT_DESKTOP_PREFS: DesktopNotificationPrefs = {
  desktopEnabled: true,
  soundEnabled: true,
  newEmergency: true,
  crewAssignment: true,
  caseUpdates: true,
  adminNotifications: true,
}

/** Core mission events that should always use OS desktop popups when permission is granted. */
export const PRIMARY_DESKTOP_EVENTS = new Set([
  'NEW_EMERGENCY_REQUEST',
  'EMERGENCY_CREATED',
  'CREW_ASSIGNED',
  'MISSION_ASSIGNED',
  'CASE_COMPLETED',
  'MISSION_COMPLETED',
])

export function loadDesktopNotificationPrefs(): DesktopNotificationPrefs {
  if (typeof window === 'undefined') return DEFAULT_DESKTOP_PREFS
  try {
    const raw = localStorage.getItem(DESKTOP_PREFS_KEY)
    if (!raw) return DEFAULT_DESKTOP_PREFS
    return { ...DEFAULT_DESKTOP_PREFS, ...JSON.parse(raw) }
  } catch {
    return DEFAULT_DESKTOP_PREFS
  }
}

export function saveDesktopNotificationPrefs(prefs: DesktopNotificationPrefs): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(DESKTOP_PREFS_KEY, JSON.stringify(prefs))
}

export function isDesktopCategoryEnabled(
  eventKey: string | null | undefined,
  prefs: DesktopNotificationPrefs,
): boolean {
  if (!prefs.desktopEnabled) return false
  const key = eventKey ?? ''
  if (key === 'NEW_EMERGENCY_REQUEST' || key === 'EMERGENCY_CREATED') {
    return prefs.newEmergency
  }
  if (key === 'CREW_ASSIGNED' || key === 'MISSION_ASSIGNED' || key === 'MISSION_REASSIGNED') {
    return prefs.crewAssignment
  }
  if (
    key === 'CASE_STARTED' ||
    key === 'ARRIVED_SCENE' ||
    key === 'PATIENT_LOADED' ||
    key === 'MEDICAL_NOTES_COMPLETED' ||
    key === 'EN_ROUTE_HOSPITAL' ||
    key === 'ARRIVED_HOSPITAL' ||
    key === 'HANDOVER_COMPLETED' ||
    key === 'CASE_COMPLETED' ||
    key === 'MISSION_UPDATED' ||
    key === 'MISSION_COMPLETED'
  ) {
    return prefs.caseUpdates
  }
  if (key === 'SYSTEM_ALERT' || key === 'SECURITY_ALERT' || key === 'EMERGENCY_BROADCAST') {
    return prefs.adminNotifications
  }
  return prefs.caseUpdates
}
