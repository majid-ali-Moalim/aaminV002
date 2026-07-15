import { NotificationCategory, NotificationType, Prisma } from '@prisma/client';

export type DispatcherScope = {
  dispatcherId: string;
  regionId: string | null;
  districtId: string | null;
  stationId: string | null;
  regionName: string | null;
};

/** Cases assigned to this dispatcher (dashboard & reports). */
export function myCasesWhere(scope: DispatcherScope, extra: Prisma.EmergencyRequestWhereInput = {}) {
  return { dispatcherId: scope.dispatcherId, ...extra };
}

/** Active missions handled by this dispatcher. */
export function myActiveCasesWhere(
  scope: DispatcherScope,
  extra: Prisma.EmergencyRequestWhereInput = {},
) {
  return myCasesWhere(scope, {
    status: { notIn: ['COMPLETED', 'CANCELLED', 'PENDING'] },
    ...extra,
  });
}

/** Unassigned cases waiting in the dispatcher's region (pending queue). */
export function regionalPendingCasesWhere(
  scope: DispatcherScope,
  extra: Prisma.EmergencyRequestWhereInput = {},
): Prisma.EmergencyRequestWhereInput {
  return regionalCasesWhere(scope, {
    dispatcherId: null,
    status: { in: ['PENDING', 'REVIEWING'] },
    ...extra,
  });
}

/** Emergency cases in the dispatcher's region. */
export function regionalCasesWhere(
  scope: DispatcherScope,
  extra: Prisma.EmergencyRequestWhereInput = {},
): Prisma.EmergencyRequestWhereInput {
  if (!scope.regionId) {
    return myCasesWhere(scope, extra);
  }
  return { regionId: scope.regionId, ...extra };
}

/** Drivers/nurses in dispatcher region (via station). */
export function regionalEmployeeWhere(scope: DispatcherScope): Prisma.EmployeeWhereInput {
  if (!scope.regionId) {
    return { id: scope.dispatcherId };
  }
  return {
    status: 'ACTIVE',
    station: { regionId: scope.regionId },
  };
}

/** Ambulances in dispatcher region. */
export function regionalAmbulanceWhere(scope: DispatcherScope): Prisma.AmbulanceWhereInput {
  if (!scope.regionId) {
    return { id: { in: [] } };
  }
  return {
    isActive: true,
    OR: [{ regionId: scope.regionId }, { station: { regionId: scope.regionId } }],
  };
}

/** Hospitals in dispatcher region. */
export function regionalHospitalWhere(scope: DispatcherScope): Prisma.HospitalWhereInput {
  if (!scope.regionId) {
    return { isActive: true };
  }
  return { isActive: true, regionId: scope.regionId };
}

/** Cases this dispatcher handles or may assign (my cases + regional pending). */
export function dispatcherRelevantCasesWhere(
  scope: DispatcherScope,
  extra: Prisma.EmergencyRequestWhereInput = {},
): Prisma.EmergencyRequestWhereInput {
  return {
    OR: [
      myCasesWhere(scope, extra),
      regionalPendingCasesWhere(scope, extra),
    ],
  };
}

/** Notifications tied to cases the dispatcher handles. */
export function dispatcherCaseNotificationWhere(
  scope: DispatcherScope,
  userId: string,
  relevantCaseIds: string[],
): Prisma.NotificationWhereInput {
  const caseCategories: NotificationCategory[] = [
    NotificationCategory.MISSION,
    NotificationCategory.COMMUNICATION,
    NotificationCategory.HOSPITAL,
    NotificationCategory.INCIDENT,
  ];

  return {
    userId,
    NOT: {
      category: { in: [NotificationCategory.SYSTEM, NotificationCategory.BROADCAST, NotificationCategory.ATTENDANCE] },
    },
    OR: [
      ...(relevantCaseIds.length
        ? [{ entityType: 'EmergencyRequest', entityId: { in: relevantCaseIds } }]
        : []),
      {
        category: { in: caseCategories },
        type: NotificationType.EMERGENCY,
      },
    ],
  };
}
