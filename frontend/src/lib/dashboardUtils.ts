/** Active emergency statuses (matches Prisma EmergencyRequestStatus) */
export const ACTIVE_CASE_STATUSES = [
  'PENDING',
  'REVIEWING',
  'ASSIGNED',
  'DISPATCHED',
  'EN_ROUTE',
  'ARRIVED_SCENE',
  'PATIENT_STABILIZED',
  'TRANSPORTING',
  'ARRIVED_HOSPITAL',
] as const

export function isActiveEmergency(status: string): boolean {
  return ACTIVE_CASE_STATUSES.includes(status as (typeof ACTIVE_CASE_STATUSES)[number])
}

export function isToday(dateStr?: string | null): boolean {
  if (!dateStr) return false
  const d = new Date(dateStr)
  return !isNaN(d.getTime()) && d.toDateString() === new Date().toDateString()
}

export function getEmployeeRoleName(employee: { employeeRole?: { name?: string } | null }): string {
  return (employee.employeeRole?.name || '').toLowerCase()
}

export function isDriverEmployee(employee: { employeeRole?: { name?: string } | null }): boolean {
  return getEmployeeRoleName(employee).includes('driver')
}

export function isNurseEmployee(employee: { employeeRole?: { name?: string } | null }): boolean {
  return getEmployeeRoleName(employee).includes('nurse')
}

export function isEmployeeOnShift(employee: { shiftStatus?: string | null }): boolean {
  const s = (employee.shiftStatus || '').toUpperCase()
  return s.includes('ON') || s.includes('ACTIVE') || s.includes('DUTY')
}

export function formatBloodType(bloodType?: string | null): string {
  if (!bloodType) return 'Unknown'
  const map: Record<string, string> = {
    A_POSITIVE: 'A+',
    A_NEGATIVE: 'A-',
    B_POSITIVE: 'B+',
    B_NEGATIVE: 'B-',
    AB_POSITIVE: 'AB+',
    AB_NEGATIVE: 'AB-',
    O_POSITIVE: 'O+',
    O_NEGATIVE: 'O-',
  }
  return map[bloodType] || bloodType
}

export function formatEmployeeName(
  employee?: { firstName?: string | null; lastName?: string | null } | null
): string {
  if (!employee) return 'Not Assigned'
  const name = `${employee.firstName || ''} ${employee.lastName || ''}`.trim()
  return name || 'Not Assigned'
}

export function mapActivityLogItem(activity: {
  type?: string
  description?: string
  createdAt?: string
  status?: string
}) {
  const typeLabels: Record<string, string> = {
    emergency: 'Emergency Request',
    referral: 'Hospital Referral',
    user: 'Staff Update',
    ambulance: 'Ambulance Update',
  }
  return {
    action: typeLabels[activity.type || ''] || 'System Activity',
    details: activity.description || 'Activity recorded',
    createdAt: activity.createdAt,
  }
}
