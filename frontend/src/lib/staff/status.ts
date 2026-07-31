export type StaffShiftStatus = 'AVAILABLE' | 'UNAVAILABLE'
export type CrewOperationalStatus = 'available' | 'unavailable'

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

/** Attendance-based dispatch availability (present + not on case). */
export function getCrewOperationalStatusLabel(status?: string | null): string {
  return status === 'available' ? 'Available' : 'Unavailable'
}

export function getCrewOperationalStatusStyles(status?: string | null): {
  badge: string
  label: string
} {
  if (status === 'available') {
    return {
      badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      label: 'Available',
    }
  }
  return {
    badge: 'bg-red-100 text-red-800 border-red-200',
    label: 'Unavailable',
  }
}

export function getEmploymentStatusLabel(status?: string | null): string {
  if (!status) return '—'
  return status === 'ACTIVE' ? 'Active' : 'Inactive'
}

export function getEmploymentStatusStyles(status?: string | null): { badge: string; label: string } {
  if (status === 'ACTIVE') {
    return {
      badge: 'bg-blue-100 text-blue-800 border-blue-200',
      label: 'Active',
    }
  }
  return {
    badge: 'bg-slate-100 text-slate-700 border-slate-200',
    label: 'Inactive',
  }
}

/** Legacy shift-status labels (admin form). */
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
