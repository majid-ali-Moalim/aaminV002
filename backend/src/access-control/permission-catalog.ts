/** Permission keys aligned with frontend accessControlCatalog */

export const ALL_PERMISSION_KEYS = [
  'driver.create', 'driver.edit', 'driver.delete', 'driver.view', 'driver.assign', 'driver.shifts',
  'nurse.create', 'nurse.edit', 'nurse.delete', 'nurse.view', 'nurse.care', 'nurse.handover',
  'ambulance.create', 'ambulance.edit', 'ambulance.delete', 'ambulance.assign', 'ambulance.status', 'ambulance.maintenance',
  'dispatcher.create', 'dispatcher.edit', 'dispatcher.delete', 'dispatcher.shifts',
  'case.create', 'case.edit', 'case.delete', 'case.assign', 'case.cancel', 'case.triage', 'dispatch.board',
  'patient.create', 'patient.edit', 'patient.view', 'patient.export',
  'hospital.view', 'hospital.manage', 'hospital.handover',
  'report.view', 'report.export', 'report.kpi', 'report.audit',
  'employee.create', 'employee.edit', 'employee.delete', 'employee.attendance', 'station.manage',
  'role.manage', 'permission.manage', 'user.permission', 'access.delegate', 'access.approve', 'audit.view', 'security.manage',
  'system.settings', 'system.regions', 'system.notifications', 'system.setup', 'system.tracking', 'system.master-data',
] as const;

export type PermissionKey = (typeof ALL_PERMISSION_KEYS)[number];

export const STAFF_ROLE_SUGGESTIONS: Record<string, PermissionKey[]> = {
  administrator: [...ALL_PERMISSION_KEYS],
  dispatcher: [
    'driver.create', 'driver.view', 'nurse.create', 'nurse.view',
    'ambulance.assign', 'ambulance.status', 'case.create', 'case.edit', 'case.assign',
    'case.triage', 'dispatch.board', 'patient.create', 'patient.view',
    'report.view', 'hospital.view', 'hospital.handover',
  ],
  driver: ['driver.view', 'driver.shifts', 'ambulance.status', 'patient.view', 'case.edit', 'hospital.view'],
  nurse: ['nurse.care', 'nurse.handover', 'nurse.view', 'patient.view', 'patient.edit', 'hospital.view'],
  'hospital-coordinator': ['hospital.view', 'hospital.manage', 'hospital.handover', 'report.view'],
  supervisor: [
    'driver.create', 'driver.edit', 'driver.view', 'nurse.create', 'nurse.edit', 'nurse.view',
    'case.edit', 'case.assign', 'case.cancel', 'dispatch.board', 'report.view', 'report.kpi',
    'employee.attendance', 'access.approve',
  ],
  'fleet-manager': [
    'ambulance.assign', 'ambulance.status', 'ambulance.maintenance', 'driver.assign',
    'report.view', 'report.export',
  ],
  employee: ['employee.attendance', 'report.view'],
};

export function isValidPermissionKey(key: string): key is PermissionKey {
  return (ALL_PERMISSION_KEYS as readonly string[]).includes(key);
}

export function resolveStaffProfile(
  role: string,
  employeeRoleName?: string | null,
): keyof typeof STAFF_ROLE_SUGGESTIONS | null {
  if (role === 'PATIENT') return null;
  if (role === 'ADMIN') return 'administrator';
  const name = (employeeRoleName ?? '').toLowerCase();
  if (name.includes('dispatch')) return 'dispatcher';
  if (name.includes('driver')) return 'driver';
  if (name.includes('hospital') && name.includes('coord')) return 'hospital-coordinator';
  if (name.includes('nurse') || name.includes('paramedic')) return 'nurse';
  if (name.includes('supervisor')) return 'supervisor';
  if (name.includes('fleet')) return 'fleet-manager';
  return 'employee';
}

export function getSuggestedPermissions(
  role: string,
  employeeRoleName?: string | null,
): PermissionKey[] {
  const profile = resolveStaffProfile(role, employeeRoleName);
  if (!profile) return [];
  return STAFF_ROLE_SUGGESTIONS[profile] ?? [];
}
