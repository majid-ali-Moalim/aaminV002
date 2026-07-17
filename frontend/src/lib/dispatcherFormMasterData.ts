import { Gender } from '@/types'
import { systemSetupService, dispatchersService } from '@/lib/api'
import type { Department, EmployeeRole, Region } from '@/types'
import { genderOptions as baseGenderOptions } from '@/lib/nurseFormMasterData'
import {
  fetchWorkShiftEmploymentOptions,
  filterDepartmentsForRole,
  suggestDepartmentForRole,
  type WorkShiftOption,
} from '@/lib/employment/staffFormHelpers'

export type SelectOption = { id: string; label: string }

export const DISPATCHER_QUALIFICATIONS = [
  'Emergency Dispatch Certificate',
  'CAD Operations',
  'Radio & Communications',
  'Command Center Training',
  'EMD Certification',
]

export type DispatcherFormMasterData = {
  regions: Region[]
  departments: Department[]
  employeeRoles: EmployeeRole[]
  dispatcherRoleId: string
  dispatcherRoleName: string
  dispatcherStatsTotal: number
  dispatcherNextCode?: string
  genderOptions: SelectOption[]
  employmentTypeOptions: SelectOption[]
  workShiftOptions: WorkShiftOption[]
  shiftStatusOptions: SelectOption[]
  qualificationOptions: SelectOption[]
}

const DEFAULT_EMPLOYMENT_TYPES = ['Full-time', 'Part-time', 'Contract', 'Rotational']

export const DISPATCHER_SHIFT_OPTIONS: SelectOption[] = [
  { id: 'OFF_DUTY', label: 'Off Duty' },
  { id: 'AVAILABLE', label: 'Available' },
  { id: 'ON_DUTY', label: 'On Duty' },
  { id: 'UNAVAILABLE', label: 'On Leave / Unavailable' },
]

export async function fetchDispatcherFormMasterData(): Promise<DispatcherFormMasterData> {
  const [regs, depts, roles, stats, workShiftOptions] = await Promise.all([
    systemSetupService.getRegions(),
    systemSetupService.getDepartments(),
    systemSetupService.getRoles(),
    dispatchersService.getStats().catch(() => ({ total: 0 })),
    fetchWorkShiftEmploymentOptions(),
  ])

  const regions = Array.isArray(regs) ? regs.filter((r) => r.isActive !== false) : []
  const allDepartments = Array.isArray(depts) ? depts.filter((d) => d.isActive !== false) : []
  const departments = filterDepartmentsForRole(allDepartments, 'dispatcher')
  const employeeRoles = Array.isArray(roles) ? roles.filter((r) => r.isActive !== false) : []
  const dispatcherRole = employeeRoles.find((r) => r.name === 'Dispatcher')
  const employmentTypeOptions = workShiftOptions.map((s) => ({ id: s.id, label: s.label }))

  return {
    regions,
    departments,
    employeeRoles,
    dispatcherRoleId: dispatcherRole?.id || '',
    dispatcherRoleName: dispatcherRole?.name || 'Dispatcher',
    dispatcherStatsTotal: (stats as { total?: number })?.total ?? 0,
    dispatcherNextCode: (stats as { nextCode?: string })?.nextCode,
    genderOptions: baseGenderOptions(),
    employmentTypeOptions,
    workShiftOptions,
    shiftStatusOptions: DISPATCHER_SHIFT_OPTIONS,
    qualificationOptions: DISPATCHER_QUALIFICATIONS.map((q) => ({ id: q, label: q })),
  }
}

export function validateDispatcherMasterData(
  data: Pick<DispatcherFormMasterData, 'regions' | 'departments' | 'dispatcherRoleId'>,
) {
  const messages: string[] = []
  if (!data.regions.length) messages.push('No regions in System Setup.')
  if (!data.departments.length) messages.push('No departments in System Setup.')
  if (!data.dispatcherRoleId) messages.push('Dispatcher role not found in System Setup.')
  return { messages, hasBlockingIssue: messages.length > 0 }
}

export function suggestDispatcherDepartment(departments: Department[]) {
  return suggestDepartmentForRole(departments, 'dispatcher')
}

export function nextDispatcherCode(statsTotal: number, nextCode?: string) {
  return nextCode || `DIS-${String(statsTotal + 1).padStart(3, '0')}`
}
