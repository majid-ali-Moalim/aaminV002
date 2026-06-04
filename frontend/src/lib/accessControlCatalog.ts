import {
  Truck,
  Stethoscope,
  Siren,
  Building2,
  BarChart2,
  Shield,
  Settings,
  Users,
  Radio,
  HeartPulse,
  Lock,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type PermissionDef = {
  key: string
  label: string
  description: string
  sensitive?: boolean
}

export type PermissionCategory = {
  id: string
  category: string
  icon: LucideIcon
  permissions: PermissionDef[]
}

export const PERMISSION_CATALOG: PermissionCategory[] = [
  {
    id: 'drivers',
    category: 'Drivers',
    icon: Truck,
    permissions: [
      { key: 'driver.create', label: 'Create Driver', description: 'Register new driver profiles' },
      { key: 'driver.edit', label: 'Edit Driver', description: 'Update driver information' },
      { key: 'driver.delete', label: 'Delete Driver', description: 'Remove driver from system', sensitive: true },
      { key: 'driver.view', label: 'View Drivers', description: 'Browse driver roster' },
      { key: 'driver.assign', label: 'Assign Driver to Unit', description: 'Pair drivers with ambulances' },
      { key: 'driver.shifts', label: 'Manage Driver Shifts', description: 'Edit shift and availability' },
    ],
  },
  {
    id: 'nurses',
    category: 'Nurses & Paramedics',
    icon: Stethoscope,
    permissions: [
      { key: 'nurse.create', label: 'Create Nurse', description: 'Register new nurse/paramedic profiles' },
      { key: 'nurse.edit', label: 'Edit Nurse', description: 'Update nurse information' },
      { key: 'nurse.delete', label: 'Delete Nurse', description: 'Remove nurse from system', sensitive: true },
      { key: 'nurse.view', label: 'View Nurses', description: 'Browse nursing staff roster' },
      { key: 'nurse.care', label: 'Record Patient Care', description: 'File treatment and vitals logs' },
      { key: 'nurse.handover', label: 'Hospital Handover', description: 'Complete patient handover records' },
    ],
  },
  {
    id: 'ambulances',
    category: 'Ambulances & Fleet',
    icon: Truck,
    permissions: [
      { key: 'ambulance.create', label: 'Create Ambulance', description: 'Register new fleet units' },
      { key: 'ambulance.edit', label: 'Edit Ambulance', description: 'Update vehicle details' },
      { key: 'ambulance.delete', label: 'Delete Ambulance', description: 'Remove unit from fleet', sensitive: true },
      { key: 'ambulance.assign', label: 'Assign Ambulance', description: 'Assign units to cases and stations' },
      { key: 'ambulance.status', label: 'Update Fleet Status', description: 'Change availability and readiness' },
      { key: 'ambulance.maintenance', label: 'Manage Maintenance', description: 'Schedule and log maintenance' },
    ],
  },
  {
    id: 'dispatchers',
    category: 'Dispatchers',
    icon: Radio,
    permissions: [
      { key: 'dispatcher.create', label: 'Create Dispatcher', description: 'Register new dispatcher accounts' },
      { key: 'dispatcher.edit', label: 'Edit Dispatcher', description: 'Update dispatcher profiles' },
      { key: 'dispatcher.delete', label: 'Delete Dispatcher', description: 'Remove dispatcher access', sensitive: true },
      { key: 'dispatcher.shifts', label: 'Manage Dispatcher Shifts', description: 'Assign shifts and duty logs' },
    ],
  },
  {
    id: 'emergency',
    category: 'Emergency Operations',
    icon: Siren,
    permissions: [
      { key: 'case.create', label: 'Create Emergency Case', description: 'Open new emergency requests' },
      { key: 'case.edit', label: 'Edit Emergency Case', description: 'Modify case details and priority' },
      { key: 'case.delete', label: 'Delete Emergency Case', description: 'Remove cases', sensitive: true },
      { key: 'case.assign', label: 'Assign Case Resources', description: 'Assign ambulance, driver, nurse' },
      { key: 'case.cancel', label: 'Cancel Case', description: 'Cancel active missions', sensitive: true },
      { key: 'case.triage', label: 'Triage Queue', description: 'Manage triage and pending queue' },
      { key: 'dispatch.board', label: 'Live Dispatch Board', description: 'Access live operations board' },
    ],
  },
  {
    id: 'patients',
    category: 'Patients & Records',
    icon: HeartPulse,
    permissions: [
      { key: 'patient.create', label: 'Create Patient', description: 'Register patient records' },
      { key: 'patient.edit', label: 'Edit Patient', description: 'Update patient demographics' },
      { key: 'patient.view', label: 'View Medical Records', description: 'Access patient case history' },
      { key: 'patient.export', label: 'Export Patient Data', description: 'Export records to file', sensitive: true },
    ],
  },
  {
    id: 'hospitals',
    category: 'Hospital Coordination',
    icon: Building2,
    permissions: [
      { key: 'hospital.view', label: 'View Hospitals', description: 'Browse hospital directory and case status' },
      { key: 'hospital.manage', label: 'Manage Hospitals', description: 'Edit hospitals and availability' },
      { key: 'hospital.handover', label: 'Case Handover', description: 'Accept, reject, and process handovers' },
    ],
  },
  {
    id: 'reports',
    category: 'Reports & Analytics',
    icon: BarChart2,
    permissions: [
      { key: 'report.view', label: 'View Reports', description: 'Access operational reports' },
      { key: 'report.export', label: 'Export Reports', description: 'Download PDF/Excel exports' },
      { key: 'report.kpi', label: 'View KPI Dashboard', description: 'Access KPI and analytics' },
      { key: 'report.audit', label: 'View Audit Reports', description: 'Access compliance reports' },
    ],
  },
  {
    id: 'workforce',
    category: 'Workforce & Organization',
    icon: Users,
    permissions: [
      { key: 'employee.create', label: 'Create Employee', description: 'Add staff members' },
      { key: 'employee.edit', label: 'Edit Employee', description: 'Update employee records' },
      { key: 'employee.delete', label: 'Delete Employee', description: 'Remove staff accounts', sensitive: true },
      { key: 'employee.attendance', label: 'Attendance & Duty Logs', description: 'View and manage attendance' },
      { key: 'station.manage', label: 'Manage Stations', description: 'Configure base stations and coverage' },
    ],
  },
  {
    id: 'access',
    category: 'Permissions & Security',
    icon: Lock,
    permissions: [
      { key: 'role.manage', label: 'Manage Roles', description: 'Create and edit system roles' },
      { key: 'permission.manage', label: 'Manage Permissions', description: 'Edit permission catalog' },
      { key: 'user.permission', label: 'Assign User Permissions', description: 'Grant direct user overrides' },
      { key: 'access.delegate', label: 'Delegate Access', description: 'Create delegation grants' },
      { key: 'access.approve', label: 'Approve Permission Requests', description: 'Review sensitive action requests' },
      { key: 'audit.view', label: 'View Audit Logs', description: 'Access permission audit trail' },
      { key: 'security.manage', label: 'Manage Security Policies', description: 'Configure MFA, session, IP rules' },
    ],
  },
  {
    id: 'system',
    category: 'System Administration',
    icon: Settings,
    permissions: [
      { key: 'system.settings', label: 'System Settings', description: 'Modify global configuration' },
      { key: 'system.regions', label: 'Manage Regions & Districts', description: 'Geographic setup' },
      { key: 'system.notifications', label: 'Manage Notifications', description: 'Configure alert rules' },
      { key: 'system.setup', label: 'System Setup', description: 'Categories, types, equipment levels' },
      { key: 'system.tracking', label: 'Public Tracking', description: 'Manage public tracking links' },
    ],
  },
]

export const ALL_PERMISSIONS = PERMISSION_CATALOG.flatMap((c) => c.permissions)

export const SYSTEM_ROLES = [
  {
    id: 'administrator',
    name: 'Administrator',
    description: 'Full system access — all modules, settings, and security controls.',
    userCount: 3,
    isSystem: true,
    permissions: ALL_PERMISSIONS.map((p) => p.key),
  },
  {
    id: 'dispatcher',
    name: 'Dispatcher',
    description: 'Emergency dispatch, case assignment, and fleet coordination.',
    userCount: 12,
    isSystem: true,
    permissions: [
      'driver.create', 'driver.view', 'nurse.create', 'nurse.view',
      'ambulance.assign', 'ambulance.status', 'case.create', 'case.edit', 'case.assign',
      'case.triage', 'dispatch.board', 'patient.create', 'patient.view',
      'report.view', 'hospital.view', 'hospital.handover',
    ],
  },
  {
    id: 'driver',
    name: 'Driver',
    description: 'Field operations — missions, status updates, assigned unit only.',
    userCount: 28,
    isSystem: true,
    permissions: ['patient.view', 'ambulance.status', 'driver.shifts', 'hospital.view'],
  },
  {
    id: 'nurse',
    name: 'Nurse',
    description: 'Clinical care during missions — vitals, notes, handover.',
    userCount: 18,
    isSystem: true,
    permissions: ['nurse.care', 'nurse.handover', 'patient.view', 'hospital.view'],
  },
  {
    id: 'hospital-coordinator',
    name: 'Hospital Coordinator',
    description: 'Full hospital coordination — availability, incoming cases, and handovers.',
    userCount: 6,
    isSystem: true,
    permissions: ['hospital.view', 'hospital.manage', 'hospital.handover', 'report.view'],
  },
  {
    id: 'supervisor',
    name: 'Supervisor',
    description: 'Oversight of dispatch operations, escalations, and staff performance.',
    userCount: 5,
    isSystem: true,
    permissions: [
      'driver.create', 'driver.edit', 'driver.view', 'nurse.create', 'nurse.edit', 'nurse.view',
      'case.edit', 'case.assign', 'case.cancel', 'dispatch.board', 'report.view', 'report.kpi',
      'employee.attendance', 'access.approve',
    ],
  },
  {
    id: 'fleet-manager',
    name: 'Fleet Manager',
    description: 'Ambulance fleet, maintenance, assignments, and utilization reports.',
    userCount: 4,
    isSystem: true,
    permissions: [
      'ambulance.assign', 'ambulance.status', 'ambulance.maintenance', 'driver.assign', 'report.view', 'report.export',
    ],
  },
  {
    id: 'custom-role',
    name: 'Custom Role',
    description: 'User-defined role with configurable permission set.',
    userCount: 0,
    isSystem: false,
    permissions: [] as string[],
  },
]

export const PERMISSION_TEMPLATES = [
  {
    id: 'dispatcher-template',
    name: 'Dispatcher Template',
    description: 'Standard dispatch desk permissions for new operators.',
    permissionCount: 14,
    permissions: SYSTEM_ROLES.find((r) => r.id === 'dispatcher')!.permissions,
  },
  {
    id: 'senior-nurse',
    name: 'Senior Nurse Template',
    description: 'Lead paramedic with care records and handover authority.',
    permissionCount: 8,
    permissions: ['nurse.care', 'nurse.handover', 'nurse.view', 'patient.view', 'patient.edit', 'case.view', 'case.edit', 'report.view'],
  },
  {
    id: 'fleet-manager-template',
    name: 'Fleet Manager Template',
    description: 'Full fleet operations without dispatch case deletion.',
    permissionCount: 10,
    permissions: SYSTEM_ROLES.find((r) => r.id === 'fleet-manager')!.permissions,
  },
  {
    id: 'emergency-supervisor',
    name: 'Emergency Supervisor Template',
    description: 'Escalations, approvals, and multi-station oversight.',
    permissionCount: 16,
    permissions: SYSTEM_ROLES.find((r) => r.id === 'supervisor')!.permissions,
  },
]

export function getPermissionLabel(key: string) {
  return ALL_PERMISSIONS.find((p) => p.key === key)?.label ?? key
}

export function roleHasPermission(roleId: string, key: string) {
  const role = SYSTEM_ROLES.find((r) => r.id === roleId)
  return role?.permissions.includes(key) ?? false
}

/** Staff-only role profiles — Patient accounts have no system permissions. */
export const STAFF_ROLE_PROFILES = SYSTEM_ROLES.filter((r) => r.id !== 'custom-role')

export type StaffProfileId =
  | 'administrator'
  | 'dispatcher'
  | 'driver'
  | 'nurse'
  | 'supervisor'
  | 'fleet-manager'
  | 'employee'

export function resolveStaffProfile(
  role: string,
  employeeRoleName?: string | null,
): StaffProfileId | null {
  if (role === 'PATIENT') return null
  if (role === 'ADMIN') return 'administrator'
  const name = (employeeRoleName ?? '').toLowerCase()
  if (name.includes('dispatch')) return 'dispatcher'
  if (name.includes('driver')) return 'driver'
  if (name.includes('nurse') || name.includes('paramedic')) return 'nurse'
  if (name.includes('supervisor')) return 'supervisor'
  if (name.includes('fleet')) return 'fleet-manager'
  return 'employee'
}

export function getSuggestedPermissionsForUser(
  role: string,
  employeeRoleName?: string | null,
): string[] {
  const profile = resolveStaffProfile(role, employeeRoleName)
  if (!profile) return []
  if (profile === 'employee') {
    return ['employee.attendance', 'report.view']
  }
  const match = SYSTEM_ROLES.find((r) => r.id === profile)
  return match?.permissions ?? []
}

export function getStaffProfileLabel(profile: StaffProfileId | null): string {
  if (!profile) return 'No access'
  if (profile === 'employee') return 'General Staff'
  return STAFF_ROLE_PROFILES.find((r) => r.id === profile)?.name ?? profile
}

/** Permission categories shown when assigning access (staff manage patients; patients don't get portal permissions). */
export const ASSIGNABLE_PERMISSION_CATALOG = PERMISSION_CATALOG
