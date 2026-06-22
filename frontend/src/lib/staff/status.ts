export type StaffShiftStatus = 'AVAILABLE' | 'UNAVAILABLE'

/** Admin-settable shift statuses for drivers and nurses. ON_DUTY is set by missions/dispatch. */
export const ADMIN_STAFF_STATUS_OPTIONS: { id: StaffShiftStatus; label: string }[] = [
  { id: 'AVAILABLE', label: 'Available' },
  { id: 'UNAVAILABLE', label: 'Unavailable' },
]

export function mapStaffShiftStatus(value: string): StaffShiftStatus {
  if (value === 'AVAILABLE' || value === 'Available') return 'AVAILABLE'
  return 'UNAVAILABLE'
}

export function getAdminStaffStatusValue(status: string): StaffShiftStatus {
  return status === 'AVAILABLE' ? 'AVAILABLE' : 'UNAVAILABLE'
}

export function getStaffStatusLabel(status: string): string {
  if (status === 'AVAILABLE') return 'Available'
  if (status === 'ON_DUTY') return 'Unavailable (On Duty)'
  return 'Unavailable'
}

export function getStaffStatusStyles(status: string): {
  badge: string
  label: string
} {
  if (status === 'AVAILABLE') {
    return {
      badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      label: 'Available',
    }
  }
  if (status === 'ON_DUTY') {
    return {
      badge: 'bg-slate-100 text-slate-800 border-slate-200',
      label: 'Unavailable (On Duty)',
    }
  }
  return {
    badge: 'bg-slate-100 text-slate-700 border-slate-200',
    label: 'Unavailable',
  }
}
