import { PrismaService } from '../prisma/prisma.service';

export const ASSIGNER_USER_ID_MARKER = 'assignerUserId:';

export function formatAssignStatusNotes(
  isReassign: boolean,
  assignerUserId?: string | null,
): string {
  const base = isReassign ? 'Team reassigned' : 'Team assigned';
  if (!assignerUserId) return base;
  return `${base}|${ASSIGNER_USER_ID_MARKER}${assignerUserId}`;
}

export function parseAssignerUserIdFromNotes(notes?: string | null): string | null {
  if (!notes) return null;
  const match = notes.match(/assignerUserId:([0-9a-z]+)/i);
  return match?.[1] ?? null;
}

const dispatcherSelect = {
  id: true,
  userId: true,
  firstName: true,
  lastName: true,
  phone: true,
  user: { select: { id: true, username: true } },
} as const;

export type CaseDispatcherInfo = {
  id: string;
  userId: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  user: { id: string; username: string | null };
};

/** Who assigned / owns dispatch for this case (explicit dispatcher or assign log). */
export async function resolveCaseDispatcher(
  prisma: PrismaService,
  requestId: string,
  dispatcherId?: string | null,
): Promise<CaseDispatcherInfo | null> {
  if (dispatcherId) {
    const row = await prisma.employee.findUnique({
      where: { id: dispatcherId },
      select: dispatcherSelect,
    });
    if (row?.userId) return row as CaseDispatcherInfo;
  }

  const log = await prisma.emergencyStatusLog.findFirst({
    where: {
      emergencyRequestId: requestId,
      OR: [
        { notes: { in: ['Team assigned', 'Team reassigned'] } },
        { notes: { startsWith: 'Team assigned|' } },
        { notes: { startsWith: 'Team reassigned|' } },
      ],
      changedByEmployeeId: { not: null },
    },
    orderBy: { createdAt: 'desc' },
    include: {
      changedByEmployee: { select: dispatcherSelect },
    },
  });

  const fromLog = log?.changedByEmployee;
  if (fromLog?.userId) return fromLog as CaseDispatcherInfo;

  const assignerUserId = await resolveCaseAssignerUserId(prisma, requestId, dispatcherId);
  if (assignerUserId) {
    const employee = await prisma.employee.findFirst({
      where: { userId: assignerUserId },
      select: dispatcherSelect,
    });
    if (employee?.userId) return employee as CaseDispatcherInfo;
    const user = await prisma.user.findUnique({
      where: { id: assignerUserId },
      select: { id: true, username: true },
    });
    if (user) {
      return {
        id: assignerUserId,
        userId: assignerUserId,
        firstName: user.username,
        lastName: null,
        phone: null,
        user: { id: user.id, username: user.username },
      };
    }
  }

  return null;
}

/** User id of whoever assigned the crew (admin, dispatcher, etc.). */
export async function resolveCaseAssignerUserId(
  prisma: PrismaService,
  requestId: string,
  dispatcherId?: string | null,
): Promise<string | null> {
  if (dispatcherId) {
    const row = await prisma.employee.findUnique({
      where: { id: dispatcherId },
      select: { userId: true },
    });
    if (row?.userId) return row.userId;
  }

  const markedLogs = await prisma.emergencyStatusLog.findMany({
    where: {
      emergencyRequestId: requestId,
      notes: { contains: ASSIGNER_USER_ID_MARKER },
    },
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: { notes: true },
  });
  for (const log of markedLogs) {
    const userId = parseAssignerUserIdFromNotes(log.notes);
    if (userId) return userId;
  }

  const legacyLog = await prisma.emergencyStatusLog.findFirst({
    where: {
      emergencyRequestId: requestId,
      OR: [
        { notes: { in: ['Team assigned', 'Team reassigned'] } },
        { notes: { startsWith: 'Team assigned|' } },
        { notes: { startsWith: 'Team reassigned|' } },
      ],
      changedByEmployeeId: { not: null },
    },
    orderBy: { createdAt: 'desc' },
    include: { changedByEmployee: { select: { userId: true } } },
  });
  return legacyLog?.changedByEmployee?.userId ?? null;
}
