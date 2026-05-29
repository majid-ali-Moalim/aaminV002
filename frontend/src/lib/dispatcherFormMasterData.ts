import { Gender } from '@/types'
import { systemSetupService, dispatchersService } from '@/lib/api'
import type { Department, EmployeeRole, Region } from '@/types'
import { genderOptions as baseGenderOptions } from '@/lib/nurseFormMasterData'

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
  genderOptions: SelectOption[]
  employmentTypeOptions: SelectOption[]
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
  const [regs, depts, roles, stats] = await Promise.all([
    systemSetupService.getRegions(),
    systemSetupService.getDepartments(),
    systemSetupService.getRoles(),
    dispatchersService.getStats().catch(() => ({ total: 0 })),
  ])

  const regions = Array.isArray(regs) ? regs.filter((r) => r.isActive !== false) : []
  const departments = Array.isArray(depts) ? depts.filter((d) => d.isActive !== false) : []
  const employeeRoles = Array.isArray(roles) ? roles.filter((r) => r.isActive !== false) : []
  const dispatcherRole = employeeRoles.find((r) => r.name === 'Dispatcher')

  return {
    regions,
    departments,
    employeeRoles,
    dispatcherRoleId: dispatcherRole?.id || '',
    dispatcherRoleName: dispatcherRole?.name || 'Dispatcher',
    dispatcherStatsTotal: (stats as { total?: number })?.total ?? 0,
    genderOptions: baseGenderOptions(),
    employmentTypeOptions: DEFAULT_EMPLOYMENT_TYPES.map((t) => ({ id: t, label: t })),
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
  return (
    departments.find((d) => d.name === 'Dispatch Operations') ||
    departments.find((d) => d.name?.toLowerCase().includes('dispatch')) ||
    departments[0]
  )
}

export function nextDispatcherCode(statsTotal: number) {
  return `DIS-${String(statsTotal + 1).padStart(3, '0')}`
}
