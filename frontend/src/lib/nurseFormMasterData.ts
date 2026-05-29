import { Gender, BloodType } from '@/types'
import {
  systemSetupService,
  ambulancesService,
  emergencyRequestsService,
  nursesService,
} from '@/lib/api'
import type { Ambulance, Department, EmployeeRole, EquipmentLevel, Region } from '@/types'

export type SelectOption = { id: string; label: string }

export type NurseFormMasterData = {
  regions: Region[]
  departments: Department[]
  employeeRoles: EmployeeRole[]
  equipmentLevels: EquipmentLevel[]
  ambulances: Ambulance[]
  nurseRoleId: string
  nurseRoleName: string
  nurseStatsTotal: number
  qualifications: SelectOption[]
  specializations: SelectOption[]
  employmentTypes: SelectOption[]
  genderOptions: SelectOption[]
  bloodGroupOptions: SelectOption[]
  shiftStatusOptions: SelectOption[]
}

const DEFAULT_QUALIFICATIONS = [
  'Diploma in Nursing',
  'BSc Nursing',
  'MSc Nursing',
  'Registered Nurse',
  'Specialist Nurse',
]

const DEFAULT_SPECIALIZATIONS = ['Emergency', 'ICU', 'Trauma', 'General', 'Pediatric', 'Maternity']

const DEFAULT_EMPLOYMENT_TYPES = ['Full-time', 'Part-time', 'Contract', 'Rotational']

export const SHIFT_STATUS_OPTIONS: SelectOption[] = [
  { id: 'OFF_DUTY', label: 'Off Duty' },
  { id: 'AVAILABLE', label: 'Available' },
  { id: 'ON_DUTY', label: 'On Duty' },
  { id: 'UNAVAILABLE', label: 'On Leave / Unavailable' },
]

export function genderOptions(): SelectOption[] {
  return [
    { id: Gender.MALE, label: 'Male' },
    { id: Gender.FEMALE, label: 'Female' },
  ]
}

export function bloodGroupOptions(): SelectOption[] {
  const labels: Record<BloodType, string> = {
    [BloodType.A_POSITIVE]: 'A+',
    [BloodType.A_NEGATIVE]: 'A-',
    [BloodType.B_POSITIVE]: 'B+',
    [BloodType.B_NEGATIVE]: 'B-',
    [BloodType.AB_POSITIVE]: 'AB+',
    [BloodType.AB_NEGATIVE]: 'AB-',
    [BloodType.O_POSITIVE]: 'O+',
    [BloodType.O_NEGATIVE]: 'O-',
  }
  return Object.values(BloodType).map((id) => ({ id, label: labels[id as BloodType] }))
}

function uniqueOptions(values: (string | null | undefined)[], defaults: string[]): SelectOption[] {
  const merged = [...new Set([...values.filter(Boolean), ...defaults] as string[])].sort((a, b) =>
    a.localeCompare(b)
  )
  return merged.map((v) => ({ id: v, label: v }))
}

export async function fetchNurseFormMasterData(): Promise<NurseFormMasterData> {
  const [regs, depts, roles, levels, ambs, stats, nurses] = await Promise.all([
    systemSetupService.getRegions(),
    systemSetupService.getDepartments(),
    systemSetupService.getRoles(),
    systemSetupService.getEquipmentLevels().catch(() => []),
    ambulancesService.getAll().catch(() => emergencyRequestsService.getAvailableAmbulances()),
    nursesService.getStats().catch(() => ({ total: 0 })),
    nursesService.getAll().catch(() => []),
  ])

  const regions = Array.isArray(regs) ? regs.filter((r) => r.isActive !== false) : []
  const departments = Array.isArray(depts) ? depts.filter((d) => d.isActive !== false) : []
  const employeeRoles = Array.isArray(roles) ? roles.filter((r) => r.isActive !== false) : []
  const equipmentLevels = Array.isArray(levels) ? levels.filter((l) => l.isActive !== false) : []
  const nursesList = Array.isArray(nurses) ? nurses : []

  const ambulances = (Array.isArray(ambs) ? ambs : []).filter(
    (a: Ambulance) => a.isActive !== false && (a.status === 'AVAILABLE' || a.status === 'ON_DUTY')
  )

  const nurseRole = employeeRoles.find((r) => r.name === 'Nurse')

  const qualifications = uniqueOptions(
    nursesList.map((n) => (n as { qualification?: string }).qualification),
    DEFAULT_QUALIFICATIONS
  )
  const specializations = uniqueOptions(
    nursesList.map((n) => (n as { specialization?: string }).specialization),
    DEFAULT_SPECIALIZATIONS
  )
  const employmentTypes = uniqueOptions(
    nursesList.map((n) => (n as { defaultShift?: string }).defaultShift),
    DEFAULT_EMPLOYMENT_TYPES
  )

  return {
    regions,
    departments,
    employeeRoles,
    equipmentLevels,
    ambulances,
    nurseRoleId: nurseRole?.id || '',
    nurseRoleName: nurseRole?.name || 'Nurse',
    nurseStatsTotal: (stats as { total?: number })?.total ?? 0,
    qualifications,
    specializations,
    employmentTypes,
    genderOptions: genderOptions(),
    bloodGroupOptions: bloodGroupOptions(),
    shiftStatusOptions: SHIFT_STATUS_OPTIONS,
  }
}

export type NurseMasterDataIssues = {
  messages: string[]
  hasBlockingIssue: boolean
}

export function validateMasterData(data: Pick<
  NurseFormMasterData,
  'regions' | 'departments' | 'employeeRoles' | 'nurseRoleId'
>): NurseMasterDataIssues {
  const messages: string[] = []
  if (!data.regions.length) messages.push('No regions in System Setup.')
  if (!data.departments.length) messages.push('No departments in System Setup.')
  if (!data.employeeRoles.length) messages.push('No employee roles in System Setup.')
  if (!data.nurseRoleId) messages.push('Nurse role not found in System Setup.')
  return { messages, hasBlockingIssue: messages.length > 0 }
}

export function suggestNurseDepartment(departments: Department[]): Department | undefined {
  return (
    departments.find((d) => d.name === 'Medical Response') ||
    departments.find((d) => d.name === 'Clinical Services') ||
    departments.find((d) => d.name?.toLowerCase().includes('medical')) ||
    departments.find((d) => d.name === 'Field Emergency') ||
    departments[0]
  )
}

export function nextNurseCode(statsTotal: number): string {
  return `NUR-${String(statsTotal + 1).padStart(3, '0')}`
}
