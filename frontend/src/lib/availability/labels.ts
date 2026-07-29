/** Dispatch-facing labels — avoid HR terms like attendance / present / absent in the UI. */

export const AVAILABILITY_LABELS = {
  module: 'Crew Availability',
  moduleShort: 'Availability',
  reports: 'Availability Reports',
  dailyBoard: 'Daily availability board',
  editStatus: 'Edit availability status',
  markAvailable: 'Mark available',
  markUnavailable: 'Mark unavailable',
  markedAvailable: 'Marked available for dispatch',
  markedUnavailable: 'Marked unavailable',
  updated: 'Availability updated',
  loadFailed: 'Failed to load availability',
  updateFailed: 'Failed to update availability',
  shiftOnly: 'Availability can only be updated during this employee\'s shift window',
  noRecord: 'No availability record to update',
  reportsLoadFailed: 'Failed to load availability reports',
  availableDays: 'Available days',
  unavailableDays: 'Unavailable days',
  availabilityRate: 'Availability rate',
  avgAvailabilityRate: 'Avg availability rate',
  todayAvailability: 'Today\'s availability',
  availableStaff: 'Available staff',
  unavailableStaff: 'Unavailable staff',
  availabilityScore: 'Availability score',
  missedShiftStarts: 'Missed shift starts',
} as const

/** Backend still returns Present / Absent — map for display only. */
export function displayAvailabilityStatus(status: string | null | undefined): string {
  if (!status) return '—'
  const s = status.trim()
  if (s === 'Present' || s.toLowerCase() === 'present') return 'Available'
  if (s === 'Absent' || s.toLowerCase() === 'absent') return 'Unavailable'
  return s.replace(/_/g, ' ')
}

export function isAvailableStatus(status: string | null | undefined): boolean {
  if (!status) return false
  const s = status.trim().toLowerCase()
  return s === 'present' || s === 'available'
}

export function displayAttendanceFlag(present: boolean): string {
  return present ? 'Available' : 'Unavailable'
}

export function displayTodayPresence(flag: 'present' | 'absent' | string | null | undefined): string {
  if (flag === 'present' || flag === true) return 'Available'
  if (flag === 'absent' || flag === false) return 'Unavailable'
  return displayAvailabilityStatus(String(flag ?? ''))
}
