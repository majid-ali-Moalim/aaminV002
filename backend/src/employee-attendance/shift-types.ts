/** 12-hour day / night shifts — aligned with driver/nurse employment type. */
export const DAY_SHIFT = {
  code: 'DAY',
  name: 'Day time',
  startTime: '06:00',
  endTime: '18:00',
  description: '12-hour day shift (06:00 – 18:00)',
  color: '#22C55E',
} as const;

export const NIGHT_SHIFT = {
  code: 'NIGHT',
  name: 'Night time',
  startTime: '18:00',
  endTime: '06:00',
  description: '12-hour night shift (18:00 – 06:00)',
  color: '#6366F1',
} as const;

export const DEFAULT_SHIFTS = [DAY_SHIFT, NIGHT_SHIFT];

export function resolveShiftForEmployee(
  defaultShift?: string | null,
  typicalStartTime?: string | null,
) {
  const label = (defaultShift || typicalStartTime || '').toLowerCase();
  if (label.includes('night')) return NIGHT_SHIFT;
  return DAY_SHIFT;
}

export function parseTimeOnDay(time: string, day: Date): Date {
  const [h, m] = time.split(':').map(Number);
  const d = new Date(day);
  d.setHours(h, m ?? 0, 0, 0);
  return d;
}

/** Which 12-hour shift window is active right now (Day 06:00–18:00, Night otherwise). */
export function getActiveShiftCodeAt(at = new Date()): 'DAY' | 'NIGHT' {
  const minutes = at.getHours() * 60 + at.getMinutes();
  const dayStart = 6 * 60;
  const dayEnd = 18 * 60;
  return minutes >= dayStart && minutes < dayEnd ? 'DAY' : 'NIGHT';
}

export function isEmployeeOnActiveShift(
  defaultShift?: string | null,
  typicalStartTime?: string | null,
  at = new Date(),
): boolean {
  const empShift = resolveShiftForEmployee(defaultShift, typicalStartTime);
  return empShift.code === getActiveShiftCodeAt(at);
}

export function activeShiftLabel(at = new Date()): string {
  return getActiveShiftCodeAt(at) === 'DAY' ? 'Day time' : 'Night time';
}

export function employeeMatchesWorkShift(
  defaultShift?: string | null,
  typicalStartTime?: string | null,
  workShift?: { code?: string | null; name?: string | null },
) {
  if (!workShift) return false;
  const emp = resolveShiftForEmployee(defaultShift, typicalStartTime);
  const code = (workShift.code ?? '').toUpperCase();
  if (code === 'DAY' || code === 'NIGHT') return emp.code === code;
  const name = (workShift.name ?? defaultShift ?? '').toLowerCase();
  return name.includes(emp.code === 'NIGHT' ? 'night' : 'day');
}

export function shiftAssignmentForCode(code: 'DAY' | 'NIGHT') {
  const shift = code === 'NIGHT' ? NIGHT_SHIFT : DAY_SHIFT;
  return {
    shiftCode: shift.code as 'DAY' | 'NIGHT',
    shiftName: shift.name,
    defaultShift: shift.name,
    typicalStartTime: shift.startTime,
  };
}

export function normalizeShiftCode(input?: string | null): 'DAY' | 'NIGHT' {
  if ((input ?? '').toUpperCase() === 'NIGHT' || (input ?? '').toLowerCase().includes('night')) {
    return 'NIGHT';
  }
  return 'DAY';
}

export type StaffRoleBucket = 'drivers' | 'nurses' | 'dispatchers' | 'admins' | 'other';

export function staffRoleBucket(roleName?: string | null): StaffRoleBucket {
  const n = (roleName ?? '').toLowerCase();
  if (n.includes('driver')) return 'drivers';
  if (n.includes('nurse')) return 'nurses';
  if (n.includes('dispatcher')) return 'dispatchers';
  if (n.includes('admin')) return 'admins';
  return 'other';
}

export function isStaffEmployeeRole(roleName?: string | null): boolean {
  return staffRoleBucket(roleName) !== 'other';
}

/** Field roles with scheduled day/night shifts (excludes admins). */
export function isFieldShiftRole(roleName?: string | null): boolean {
  const bucket = staffRoleBucket(roleName);
  return bucket === 'drivers' || bucket === 'nurses' || bucket === 'dispatchers';
}

export function fieldRoleBucket(roleName?: string | null): 'drivers' | 'nurses' | 'dispatchers' | 'other' {
  const bucket = staffRoleBucket(roleName);
  if (bucket === 'admins') return 'other';
  if (bucket === 'other') return 'other';
  return bucket;
}
