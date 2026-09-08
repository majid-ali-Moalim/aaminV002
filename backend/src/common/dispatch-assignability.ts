import { isEmployeeOnActiveShift, resolveShiftForEmployee } from '../employee-attendance/shift-types';

/** Shift states that block dispatch assignment. */
export const BLOCKED_SHIFT_STATUSES = ['UNAVAILABLE', 'OFF_DUTY', 'ON_BREAK'] as const;

/** Shift states allowed for dispatch when not on case and on current shift. */
export const DISPATCH_ASSIGNABLE_SHIFT_STATUSES = ['AVAILABLE'] as const;

export type DispatchExclusionReason =
  | 'on_case'
  | 'absent'
  | 'wrong_shift'
  | 'unavailable_status'
  | 'inactive'
  | 'wrong_station';

export type DispatchAssignabilityInput = {
  id: string;
  status?: string | null;
  shiftStatus?: string | null;
  defaultShift?: string | null;
  typicalStartTime?: string | null;
  stationId?: string | null;
  assignedAmbulance?: { stationId?: string | null } | null;
};

export function isBlockedShiftStatus(shiftStatus?: string | null): boolean {
  const s = String(shiftStatus ?? '').toUpperCase();
  return (BLOCKED_SHIFT_STATUSES as readonly string[]).includes(s);
}

export function hasDispatchAssignableShiftStatus(shiftStatus?: string | null): boolean {
  const s = String(shiftStatus ?? '').toUpperCase();
  return (DISPATCH_ASSIGNABLE_SHIFT_STATUSES as readonly string[]).includes(s);
}

export function evaluateDispatchAssignability(
  employee: DispatchAssignabilityInput,
  opts: {
    busyEmployeeIds?: Set<string>;
    /** When supplied, only crew marked present in today's attendance are assignable. */
    presentEmployeeIds?: Set<string>;
    stationId?: string | null;
    at?: Date;
  } = {},
): {
  dispatchAssignable: boolean;
  exclusionReason?: DispatchExclusionReason;
  exclusionDetail?: string;
  onCurrentShift: boolean;
  shiftCode: string;
  shiftName: string;
} {
  const at = opts.at ?? new Date();
  const shift = resolveShiftForEmployee(employee.defaultShift, employee.typicalStartTime);
  const onCurrentShift = isEmployeeOnActiveShift(
    employee.defaultShift,
    employee.typicalStartTime,
    at,
  );

  if (employee.status && employee.status !== 'ACTIVE') {
    return {
      dispatchAssignable: false,
      exclusionReason: 'inactive',
      exclusionDetail: 'Employee is not active',
      onCurrentShift,
      shiftCode: shift.code,
      shiftName: shift.name,
    };
  }

  if (opts.busyEmployeeIds?.has(employee.id)) {
    return {
      dispatchAssignable: false,
      exclusionReason: 'on_case',
      exclusionDetail: 'On an open case',
      onCurrentShift,
      shiftCode: shift.code,
      shiftName: shift.name,
    };
  }

  if (opts.presentEmployeeIds && !opts.presentEmployeeIds.has(employee.id)) {
    return {
      dispatchAssignable: false,
      exclusionReason: 'absent',
      exclusionDetail: 'Absent — not marked present in attendance',
      onCurrentShift,
      shiftCode: shift.code,
      shiftName: shift.name,
    };
  }

  if (isBlockedShiftStatus(employee.shiftStatus)) {
    return {
      dispatchAssignable: false,
      exclusionReason: 'unavailable_status',
      exclusionDetail: `Shift status: ${employee.shiftStatus ?? 'unknown'}`,
      onCurrentShift,
      shiftCode: shift.code,
      shiftName: shift.name,
    };
  }

  if (!hasDispatchAssignableShiftStatus(employee.shiftStatus)) {
    return {
      dispatchAssignable: false,
      exclusionReason: 'unavailable_status',
      exclusionDetail: `Shift status: ${employee.shiftStatus ?? 'unknown'}`,
      onCurrentShift,
      shiftCode: shift.code,
      shiftName: shift.name,
    };
  }

  if (!onCurrentShift) {
    return {
      dispatchAssignable: false,
      exclusionReason: 'wrong_shift',
      exclusionDetail: `On ${shift.name} — not the current shift window`,
      onCurrentShift,
      shiftCode: shift.code,
      shiftName: shift.name,
    };
  }

  if (opts.stationId) {
    const belongs =
      employee.stationId === opts.stationId ||
      employee.assignedAmbulance?.stationId === opts.stationId;
    if (!belongs) {
      return {
        dispatchAssignable: false,
        exclusionReason: 'wrong_station',
        exclusionDetail: 'Not at the selected station',
        onCurrentShift,
        shiftCode: shift.code,
        shiftName: shift.name,
      };
    }
  }

  return {
    dispatchAssignable: true,
    onCurrentShift,
    shiftCode: shift.code,
    shiftName: shift.name,
  };
}

export function enrichWithDispatchAssignability<
  T extends DispatchAssignabilityInput,
>(
  employee: T,
  opts: {
    busyEmployeeIds?: Set<string>;
    presentEmployeeIds?: Set<string>;
    stationId?: string | null;
    at?: Date;
  } = {},
) {
  const result = evaluateDispatchAssignability(employee, opts);
  return {
    ...employee,
    onCurrentShift: result.onCurrentShift,
    shiftCode: result.shiftCode,
    shiftName: result.shiftName,
    dispatchEligible: result.dispatchAssignable,
    dispatchAssignable: result.dispatchAssignable,
    exclusionReason: result.exclusionReason,
    exclusionDetail: result.exclusionDetail,
  };
}

export function filterDispatchAssignableEmployees<
  T extends DispatchAssignabilityInput,
>(
  employees: T[],
  opts: {
    busyEmployeeIds?: Set<string>;
    presentEmployeeIds?: Set<string>;
    stationId?: string | null;
    at?: Date;
  } = {},
): Array<ReturnType<typeof enrichWithDispatchAssignability<T>>> {
  return employees
    .map((e) => enrichWithDispatchAssignability(e, opts))
    .filter((e) => e.dispatchAssignable);
}

export function partitionDispatchEmployees<
  T extends DispatchAssignabilityInput,
>(
  employees: T[],
  opts: {
    busyEmployeeIds?: Set<string>;
    presentEmployeeIds?: Set<string>;
    stationId?: string | null;
    at?: Date;
  } = {},
) {
  const enriched = employees.map((e) => enrichWithDispatchAssignability(e, opts));
  return {
    assignable: enriched.filter((e) => e.dispatchAssignable),
    ineligible: enriched.filter((e) => !e.dispatchAssignable),
  };
}

export function getDispatchExclusionLabel(reason?: DispatchExclusionReason): string {
  switch (reason) {
    case 'on_case':
      return 'On active case';
    case 'absent':
      return 'Absent today';
    case 'wrong_shift':
      return 'Not on current shift';
    case 'unavailable_status':
      return 'Unavailable';
    case 'inactive':
      return 'Inactive';
    case 'wrong_station':
      return 'Different station';
    default:
      return 'Not eligible';
  }
}
