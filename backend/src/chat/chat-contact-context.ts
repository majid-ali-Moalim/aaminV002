import { PrismaService } from '../prisma/prisma.service';
import { ACTIVE_CASE_STATUSES } from '../common/active-case-statuses';

export type ContactRelationship = 'assigned_dispatcher' | 'assigned_driver' | 'assigned_nurse';

export type CaseAssignmentMeta = {
  relationship: ContactRelationship;
  isPrimaryContact: boolean;
  caseTrackingCode: string;
  caseId: string;
  sortPriority: number;
};

export function roleCategoryFromName(roleName: string): string {
  const r = roleName.toLowerCase();
  if (r.includes('dispatch')) return 'dispatcher';
  if (r.includes('driver')) return 'driver';
  if (r.includes('nurse') || r.includes('paramedic')) return 'nurse';
  if (r.includes('admin')) return 'admin';
  return 'staff';
}

/** Map peer userId → active-case assignment context for chat contact highlighting. */
export async function buildCaseAssignmentMeta(
  prisma: PrismaService,
  currentUserId: string,
): Promise<Map<string, CaseAssignmentMeta>> {
  const meta = new Map<string, CaseAssignmentMeta>();

  const employee = await prisma.employee.findFirst({
    where: { userId: currentUserId },
    select: { id: true, employeeRole: { select: { name: true } } },
  });
  if (!employee) return meta;

  const roleName = (employee.employeeRole?.name ?? '').toLowerCase();
  const isDriver = roleName.includes('driver');
  const isNurse = roleName.includes('nurse');
  const isDispatcher = roleName.includes('dispatch');
  if (!isDriver && !isNurse && !isDispatcher) return meta;

  const cases = await prisma.emergencyRequest.findMany({
    where: {
      status: { in: ACTIVE_CASE_STATUSES },
      OR: [
        ...(isDriver ? [{ driverId: employee.id }] : []),
        ...(isNurse ? [{ nurseId: employee.id }] : []),
        ...(isDispatcher ? [{ dispatcherId: employee.id }] : []),
      ],
    },
    select: {
      id: true,
      trackingCode: true,
      dispatcher: { select: { userId: true } },
      driver: { select: { userId: true } },
      nurse: { select: { userId: true } },
    },
    orderBy: [{ assignedAt: 'desc' }, { updatedAt: 'desc' }],
  });

  const upsert = (
    userId: string | null | undefined,
    relationship: ContactRelationship,
    sortPriority: number,
    caseId: string,
    caseTrackingCode: string,
    isPrimaryCase: boolean,
  ) => {
    if (!userId || userId === currentUserId) return;
    const existing = meta.get(userId);
    const tracking = caseTrackingCode || 'Case';
    if (!existing) {
      meta.set(userId, {
        relationship,
        isPrimaryContact: false,
        caseId,
        caseTrackingCode: tracking,
        sortPriority,
      });
      return;
    }
    if (sortPriority < existing.sortPriority) {
      meta.set(userId, {
        ...existing,
        relationship,
        caseId,
        caseTrackingCode: tracking,
        sortPriority,
      });
    }
    if (isPrimaryCase && relationship === 'assigned_dispatcher') {
      meta.set(userId, {
        ...(meta.get(userId) as CaseAssignmentMeta),
        caseId,
        caseTrackingCode: tracking,
        sortPriority: Math.min(meta.get(userId)!.sortPriority, sortPriority),
      });
    }
  };

  cases.forEach((c, index) => {
    const isPrimaryCase = index === 0;
    const code = c.trackingCode ?? c.id;
    if (isDriver) {
      upsert(c.dispatcher?.userId, 'assigned_dispatcher', 0, c.id, code, isPrimaryCase);
      upsert(c.nurse?.userId, 'assigned_nurse', 2, c.id, code, isPrimaryCase);
    } else if (isNurse) {
      upsert(c.dispatcher?.userId, 'assigned_dispatcher', 0, c.id, code, isPrimaryCase);
      upsert(c.driver?.userId, 'assigned_driver', 1, c.id, code, isPrimaryCase);
    } else if (isDispatcher) {
      upsert(c.driver?.userId, 'assigned_driver', 1, c.id, code, isPrimaryCase);
      upsert(c.nurse?.userId, 'assigned_nurse', 2, c.id, code, isPrimaryCase);
    }
  });

  // Mark the top-priority contact as primary (dispatcher for field crew, driver for dispatchers).
  let primaryId: string | null = null;
  let bestPriority = Number.POSITIVE_INFINITY;
  for (const [userId, m] of meta) {
    if (m.sortPriority < bestPriority) {
      bestPriority = m.sortPriority;
      primaryId = userId;
    }
  }
  if (primaryId) {
    for (const [userId, m] of meta) {
      meta.set(userId, { ...m, isPrimaryContact: userId === primaryId });
    }
  }

  return meta;
}

export function compareChatContacts<
  T extends {
    sortPriority?: number;
    isPrimaryContact?: boolean;
    lastMessageAt?: string | Date | null;
    name: string;
  },
>(a: T, b: T): number {
  const ap = a.sortPriority ?? 99;
  const bp = b.sortPriority ?? 99;
  if (ap !== bp) return ap - bp;
  if (a.isPrimaryContact && !b.isPrimaryContact) return -1;
  if (!a.isPrimaryContact && b.isPrimaryContact) return 1;
  const timeOf = (v?: string | Date | null) => {
    if (!v) return 0;
    const d = v instanceof Date ? v : new Date(v);
    return Number.isNaN(d.getTime()) ? 0 : d.getTime();
  };
  const at = timeOf(a.lastMessageAt);
  const bt = timeOf(b.lastMessageAt);
  if (at !== bt) return bt - at;
  return a.name.localeCompare(b.name);
}
