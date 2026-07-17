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

/** Emergency cases in the dispatcher's region or station (when multi-station). */
export function regionalCasesWhere(
  scope: DispatcherScope,
  extra: Prisma.EmergencyRequestWhereInput = {},
  stationScoped = false,
): Prisma.EmergencyRequestWhereInput {
  if (stationScoped && scope.stationId) {
    return { stationId: scope.stationId, ...extra };
  }
  if (!scope.regionId) {
    return myCasesWhere(scope, extra);
  }
  return { regionId: scope.regionId, ...extra };
}

/** Unassigned cases waiting in the dispatcher's region or station (pending queue). */
export function regionalPendingCasesWhere(
  scope: DispatcherScope,
  extra: Prisma.EmergencyRequestWhereInput = {},
  stationScoped = false,
): Prisma.EmergencyRequestWhereInput {
  return regionalCasesWhere(
    scope,
    {
      dispatcherId: null,
      status: { in: ['PENDING', 'REVIEWING'] },
      ...extra,
    },
    stationScoped,
  );
}

/** Drivers/nurses in dispatcher region or station (via station). */
export function regionalEmployeeWhere(
  scope: DispatcherScope,
  stationScoped = false,
): Prisma.EmployeeWhereInput {
  if (stationScoped && scope.stationId) {
    return { status: 'ACTIVE', stationId: scope.stationId };
  }
  if (!scope.regionId) {
    return { id: scope.dispatcherId };
  }
  return {
    status: 'ACTIVE',
    station: { regionId: scope.regionId },
  };
}

/** Ambulances in dispatcher region or station. */
export function regionalAmbulanceWhere(
  scope: DispatcherScope,
  stationScoped = false,
): Prisma.AmbulanceWhereInput {
  if (stationScoped && scope.stationId) {
    return { isActive: true, stationId: scope.stationId };
  }
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
  stationScoped = false,
): Prisma.EmergencyRequestWhereInput {
  return {
    OR: [
      myCasesWhere(scope, extra),
      regionalPendingCasesWhere(scope, extra, stationScoped),
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

export function isCaseAtDispatcherStation(
  scope: DispatcherScope,
  caseRow: { stationId: string | null; regionId?: string | null },
  stationScoped: boolean,
): boolean {
  if (stationScoped) {
    return Boolean(scope.stationId && caseRow.stationId && caseRow.stationId === scope.stationId);
  }
  if (!scope.regionId) {
    return true;
  }
  return !caseRow.regionId || caseRow.regionId === scope.regionId;
}

export function isCaseInDispatcherPendingScope(
  scope: DispatcherScope,
  caseRow: {
    dispatcherId: string | null;
    regionId: string | null;
    stationId: string | null;
    status: string;
  },
  stationScoped: boolean,
): boolean {
  if (caseRow.dispatcherId) return false;
  if (!['PENDING', 'REVIEWING'].includes(caseRow.status)) return false;
  if (stationScoped && scope.stationId) {
    return caseRow.stationId === scope.stationId;
  }
  return !scope.regionId || caseRow.regionId === scope.regionId;
}
