import { PrismaService } from '../prisma/prisma.service';
import { getPresentEmployeeIdsToday } from '../employee-attendance/dispatch-staff-eligibility';
import { OCCUPIED_CASE_STATUSES } from './active-case-statuses';

export type CrewOperationalStatus = 'available' | 'unavailable';

export type CrewCaseRef = { id: string; trackingCode: string };

export type CrewAvailabilityContext = {
  presentIds: Set<string>;
  driverCase: Map<string, CrewCaseRef>;
  nurseCase: Map<string, CrewCaseRef>;
};

/** Available = marked present today and not on an open case. */
export function resolveCrewOperationalStatus(
  isPresentToday: boolean,
  onActiveCase: boolean,
): CrewOperationalStatus {
  if (!isPresentToday || onActiveCase) return 'unavailable';
  return 'available';
}

export function getCrewUnavailableReason(
  isPresentToday: boolean,
  onActiveCase: boolean,
  trackingCode?: string | null,
): string | null {
  if (onActiveCase) {
    return trackingCode
      ? `On active case ${trackingCode}`
      : 'On active case — not available for dispatch';
  }
  if (!isPresentToday) {
    return 'Absent — not marked present in attendance';
  }
  return null;
}

export async function buildCrewAvailabilityContext(
  prisma: PrismaService,
): Promise<CrewAvailabilityContext> {
  const [presentIds, openCases] = await Promise.all([
    getPresentEmployeeIdsToday(prisma),
    prisma.emergencyRequest.findMany({
      where: { status: { in: OCCUPIED_CASE_STATUSES } },
      select: { id: true, trackingCode: true, driverId: true, nurseId: true },
    }),
  ]);

  const driverCase = new Map<string, CrewCaseRef>();
  const nurseCase = new Map<string, CrewCaseRef>();

  for (const row of openCases) {
    const ref = { id: row.id, trackingCode: row.trackingCode?.trim() || row.id };
    if (row.driverId) driverCase.set(row.driverId, ref);
    if (row.nurseId) nurseCase.set(row.nurseId, ref);
  }

  return { presentIds, driverCase, nurseCase };
}

export function enrichDriverWithAvailability<
  T extends { id: string },
>(driver: T, ctx: CrewAvailabilityContext) {
  const isPresent = ctx.presentIds.has(driver.id);
  const caseInfo = ctx.driverCase.get(driver.id);
  const onActiveCase = Boolean(caseInfo);

  return {
    ...driver,
    attendanceStatus: isPresent ? ('present' as const) : ('absent' as const),
    operationalStatus: resolveCrewOperationalStatus(isPresent, onActiveCase),
    unavailableReason: getCrewUnavailableReason(isPresent, onActiveCase, caseInfo?.trackingCode),
    currentCase: caseInfo ?? null,
  };
}

export function enrichNurseWithAvailability<
  T extends { id: string },
>(nurse: T, ctx: CrewAvailabilityContext) {
  const isPresent = ctx.presentIds.has(nurse.id);
  const caseInfo = ctx.nurseCase.get(nurse.id);
  const onActiveCase = Boolean(caseInfo);

  return {
    ...nurse,
    attendanceStatus: isPresent ? ('present' as const) : ('absent' as const),
    operationalStatus: resolveCrewOperationalStatus(isPresent, onActiveCase),
    unavailableReason: getCrewUnavailableReason(isPresent, onActiveCase, caseInfo?.trackingCode),
    currentCase: caseInfo ?? null,
  };
}
