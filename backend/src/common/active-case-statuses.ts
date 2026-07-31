import { EmergencyRequestStatus } from '@prisma/client';

/** Mission in progress — crew is occupied and case appears on active missions. */
export const OCCUPIED_CASE_STATUSES: EmergencyRequestStatus[] = [
  'ASSIGNED',
  'DISPATCHED',
  'EN_ROUTE',
  'ARRIVED_SCENE',
  'PATIENT_STABILIZED',
  'TRANSPORTING',
  'ARRIVED_HOSPITAL',
];

/** Case statuses where crew / ambulance are still occupied and cannot take another assignment. */
export const ACTIVE_CASE_STATUSES: EmergencyRequestStatus[] = [...OCCUPIED_CASE_STATUSES];

/** Shift states that allow a field employee to appear in dispatch assign lists. */
export const ASSIGNABLE_SHIFT_STATUSES = ['AVAILABLE', 'ON_DUTY'] as const;

export function isOccupiedCaseStatus(status: string | null | undefined): boolean {
  return OCCUPIED_CASE_STATUSES.includes(status as EmergencyRequestStatus);
}
