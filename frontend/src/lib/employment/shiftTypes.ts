/** 12-hour day / night shifts used on driver & nurse forms and attendance. */
export const EMPLOYMENT_SHIFT_OPTIONS = [
  { id: 'Day time', label: 'Day time (06:00 – 18:00)' },
  { id: 'Night time', label: 'Night time (18:00 – 06:00)' },
] as const

export type EmploymentShiftType = (typeof EMPLOYMENT_SHIFT_OPTIONS)[number]['id']

export const DAY_SHIFT = {
  code: 'DAY',
  name: 'Day time',
  startTime: '06:00',
  endTime: '18:00',
  hours: 12,
} as const

export const NIGHT_SHIFT = {
  code: 'NIGHT',
  name: 'Night time',
  startTime: '18:00',
  endTime: '06:00',
  hours: 12,
} as const

export function shiftTimesForEmploymentType(type: string) {
  const isNight = type.toLowerCase().includes('night')
  const shift = isNight ? NIGHT_SHIFT : DAY_SHIFT
  return {
    defaultShift: shift.name,
    typicalStartTime: shift.startTime,
    startTime: shift.startTime,
    endTime: shift.endTime,
  }
}

export function isValidEmploymentShiftType(type: string): type is EmploymentShiftType {
  return EMPLOYMENT_SHIFT_OPTIONS.some((o) => o.id === type)
}

export function formatShiftLabel(type: string | null | undefined): string {
  if (!type) return DAY_SHIFT.name
  const isNight = type.toLowerCase().includes('night')
  const shift = isNight ? NIGHT_SHIFT : DAY_SHIFT
  return `${shift.name} (${shift.startTime} – ${shift.endTime})`
}

export const WORK_SHIFT_TEMPLATES = [
  {
    code: DAY_SHIFT.code,
    name: DAY_SHIFT.name,
    startTime: DAY_SHIFT.startTime,
    endTime: DAY_SHIFT.endTime,
    description: DAY_SHIFT.name + ' — 12 hours for drivers, nurses & dispatchers',
    color: '#22C55E',
    durationHours: DAY_SHIFT.hours,
  },
  {
    code: NIGHT_SHIFT.code,
    name: NIGHT_SHIFT.name,
    startTime: NIGHT_SHIFT.startTime,
    endTime: NIGHT_SHIFT.endTime,
    description: NIGHT_SHIFT.name + ' — 12 hours for drivers, nurses & dispatchers',
    color: '#6366F1',
    durationHours: NIGHT_SHIFT.hours,
  },
] as const

export const STAFF_EMPLOYEE_ROLES = ['Driver', 'Nurse', 'Dispatcher', 'Administrator'] as const

export type StaffRoleBucket = 'drivers' | 'nurses' | 'dispatchers' | 'admins' | 'other'

export function staffRoleBucket(roleName?: string | null): StaffRoleBucket {
  const n = (roleName ?? '').toLowerCase()
  if (n.includes('driver')) return 'drivers'
  if (n.includes('nurse')) return 'nurses'
  if (n.includes('dispatcher')) return 'dispatchers'
  if (n.includes('admin')) return 'admins'
  return 'other'
}

export function isStaffEmployeeRole(roleName?: string | null): boolean {
  return staffRoleBucket(roleName) !== 'other'
}

export function staffRoleLabel(bucket: StaffRoleBucket): string {
  switch (bucket) {
    case 'drivers':
      return 'Drivers'
    case 'nurses':
      return 'Nurses'
    case 'dispatchers':
      return 'Dispatchers'
    case 'admins':
      return 'Admins'
    default:
      return 'Other'
  }
}

export const FIELD_SHIFT_ROLES = ['Drivers', 'Nurses', 'Dispatchers'] as const

export function getActiveShiftCodeAt(at = new Date()): 'DAY' | 'NIGHT' {
  const minutes = at.getHours() * 60 + at.getMinutes()
  const dayStart = 6 * 60
  const dayEnd = 18 * 60
  return minutes >= dayStart && minutes < dayEnd ? 'DAY' : 'NIGHT'
}

export function activeShiftLabel(at = new Date()): string {
  return getActiveShiftCodeAt(at) === 'DAY' ? 'Day time (06:00 – 18:00)' : 'Night time (18:00 – 06:00)'
}
