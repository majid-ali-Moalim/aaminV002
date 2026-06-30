import { employeesService } from '@/lib/api'
import type { Department } from '@/types'

/** Compute the next suggested code for a prefix (e.g. DR, NUR, DIS). */
export function nextCodeFromExisting(codes: (string | null | undefined)[], prefix: string): string {
  const upper = prefix.toUpperCase()
  let max = 0
  for (const code of codes) {
    if (!code) continue
    const m = code.match(new RegExp(`^${upper}-?(\\d+)$`, 'i'))
    if (m) max = Math.max(max, Number(m[1]))
  }
  return `${upper}-${String(max + 1).padStart(3, '0')}`
}

export async function suggestEmployeeCode(prefix: string, employeeRoleId?: string): Promise<string> {
  try {
    const list = await employeesService.getAll(employeeRoleId)
    const codes = (Array.isArray(list) ? list : []).map((e) => e.employeeCode)
    return nextCodeFromExisting(codes, prefix)
  } catch {
    return `${prefix.toUpperCase()}-001`
  }
}

const ROLE_DEPARTMENT_HINTS: Record<'driver' | 'nurse' | 'dispatcher', string[]> = {
  driver: ['field', 'emergency', 'transport', 'operations'],
  nurse: ['medical', 'clinical', 'nursing', 'emergency'],
  dispatcher: ['dispatch', 'command', 'operations'],
}

/** Return departments relevant to the staff role; falls back to full list if none match. */
export function departmentsForRole(
  departments: Department[],
  role: 'driver' | 'nurse' | 'dispatcher',
): Department[] {
  const hints = ROLE_DEPARTMENT_HINTS[role]
  const matched = departments.filter((d) =>
    hints.some((h) => d.name.toLowerCase().includes(h)),
  )
  return matched.length ? matched : departments
}

export function defaultUsernameFromFirstName(firstName: string, phone?: string): string {
  const fromName = firstName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 24)
  if (fromName.length >= 3) return fromName
  const digits = (phone || '').replace(/\D/g, '').replace(/^252/, '').slice(0, 9)
  return digits || fromName || 'staff'
}
