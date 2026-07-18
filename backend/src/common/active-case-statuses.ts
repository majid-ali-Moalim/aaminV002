import { EmergencyRequestStatus } from '@prisma/client';

/** Case statuses where crew / ambulance are still occupied and cannot take another assignment. */
export const ACTIVE_CASE_STATUSES: EmergencyRequestStatus[] = [
  'REVIEWING',
  'ASSIGNED',
  'DISPATCHED',
  'EN_ROUTE',
  'ARRIVED_SCENE',
  'PATIENT_STABILIZED',
  'TRANSPORTING',
  'ARRIVED_HOSPITAL',
];

/** Shift states that allow a field employee to appear in dispatch assign lists. */
export const ASSIGNABLE_SHIFT_STATUSES = ['AVAILABLE', 'ON_DUTY'] as const;
