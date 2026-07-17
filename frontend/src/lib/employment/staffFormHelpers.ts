import type { Department } from '@/types'
import { employeeAttendanceService } from '@/lib/api'
import { EMPLOYMENT_SHIFT_OPTIONS, shiftTimesForEmploymentType } from '@/lib/employment/shiftTypes'

export type StaffFormRole = 'dispatcher' | 'driver' | 'nurse'

export type WorkShiftOption = {
  id: string
  code: string
  name: string
  startTime: string
  endTime: string
  label: string
}

const ROLE_DEPARTMENT_KEYWORDS: Record<StaffFormRole, string[]> = {
  dispatcher: ['dispatch'],
  driver: ['field', 'emergency', 'logistics', 'transport', 'fleet'],
  nurse: ['medical', 'clinical', 'nurse'],
}

/** Departments suitable for the given staff role. Falls back to all if none match. */
export function filterDepartmentsForRole(
  departments: Department[],
  role: StaffFormRole,
): Department[] {
  const keywords = ROLE_DEPARTMENT_KEYWORDS[role]
  const matched = departments.filter((d) => {
    const name = (d.name ?? '').toLowerCase()
    return keywords.some((k) => name.includes(k))
  })
  return matched.length ? matched : departments
}

export function suggestDepartmentForRole(
  departments: Department[],
  role: StaffFormRole,
): Department | undefined {
  const pool = filterDepartmentsForRole(departments, role)
  if (role === 'dispatcher') {
    return (
      pool.find((d) => d.name === 'Dispatch Operations') ||
      pool.find((d) => d.name?.toLowerCase().includes('dispatch')) ||
      pool[0]
    )
  }
  if (role === 'driver') {
    return (
      pool.find((d) => d.name === 'Field Emergency') ||
      pool.find((d) => d.name?.toLowerCase().includes('field')) ||
      pool[0]
    )
  }
  return (
    pool.find((d) => d.name === 'Medical Response') ||
    pool.find((d) => d.name === 'Clinical Services') ||
    pool.find((d) => d.name?.toLowerCase().includes('medical')) ||
    pool[0]
  )
}

/** Active work shifts configured in Shift Management. */
export async function fetchWorkShiftEmploymentOptions(): Promise<WorkShiftOption[]> {
  try {
    const rows = await employeeAttendanceService.listWorkShifts()
    const list = Array.isArray(rows) ? rows : []
    const active = list.filter((s: { isActive?: boolean }) => s.isActive !== false)
    if (!active.length) return fallbackShiftOptions()
    return active.map((s: { id?: string; code?: string; name?: string; startTime?: string; endTime?: string }) => ({
      id: s.name || s.code || '',
      code: (s.code || '').toUpperCase(),
      name: s.name || s.code || '',
      startTime: s.startTime || '06:00',
      endTime: s.endTime || '18:00',
      label: `${s.name} (${s.startTime} – ${s.endTime})`,
    }))
  } catch {
    return fallbackShiftOptions()
  }
}

function fallbackShiftOptions(): WorkShiftOption[] {
  return EMPLOYMENT_SHIFT_OPTIONS.map((o) => {
    const isNight = o.id.toLowerCase().includes('night')
    return {
      id: o.id,
      code: isNight ? 'NIGHT' : 'DAY',
      name: o.id,
      startTime: isNight ? '18:00' : '06:00',
      endTime: isNight ? '06:00' : '18:00',
      label: o.label,
    }
  })
}

export function shiftTimesFromWorkShift(
  employmentType: string,
  options: WorkShiftOption[],
) {
  const match =
    options.find(
      (o) =>
        o.id === employmentType ||
        o.name === employmentType ||
        o.code === employmentType.toUpperCase(),
    ) ?? options[0]
  if (!match) return shiftTimesForEmploymentType(employmentType)
  return {
    defaultShift: match.name,
    typicalStartTime: match.startTime,
    startTime: match.startTime,
    endTime: match.endTime,
  }
}

/** Persist home region/district alongside street address (employee has no separate geo fields). */
export function formatResidentialAddress(
  street: string,
  districtName?: string,
  regionName?: string,
): string | undefined {
  const parts = [street.trim(), districtName?.trim(), regionName?.trim()].filter(Boolean)
  return parts.length ? parts.join(', ') : undefined
}

/** Certificate / license expiry one year after the given ISO date (YYYY-MM-DD). */
export function oneYearAfterDate(dateInput: string): string {
  if (!dateInput?.trim()) return ''
  const d = new Date(`${dateInput.trim()}T12:00:00`)
  if (Number.isNaN(d.getTime())) return ''
  d.setFullYear(d.getFullYear() + 1)
  return d.toISOString().slice(0, 10)
}
