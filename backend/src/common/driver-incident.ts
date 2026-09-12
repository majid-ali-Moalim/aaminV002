import { PrismaService } from '../prisma/prisma.service';

export const DRIVER_INCIDENT_PREFIX = '[DRIVER_INCIDENT]';

export type DriverIncidentRecord = {
  id: string;
  title: string;
  type: string;
  description: string;
  priority: string;
  driverId: string;
  driverName: string;
  requestId: string;
  trackingCode: string;
  createdAt: string;
  submittedAt: string;
};

export function parseDriverIncidentNote(notes: string | null | undefined): Omit<
  DriverIncidentRecord,
  'id' | 'submittedAt'
> | null {
  if (!notes?.startsWith(DRIVER_INCIDENT_PREFIX)) return null;
  try {
    return JSON.parse(notes.slice(DRIVER_INCIDENT_PREFIX.length)) as Omit<
      DriverIncidentRecord,
      'id' | 'submittedAt'
    >;
  } catch {
    return null;
  }
}

export async function fetchRecentDriverIncidents(
  prisma: PrismaService,
  opts: { take?: number; requestIds?: string[] } = {},
): Promise<DriverIncidentRecord[]> {
  const take = opts.take ?? 20;
  const logs = await prisma.emergencyStatusLog.findMany({
    where: {
      notes: { startsWith: DRIVER_INCIDENT_PREFIX },
      ...(opts.requestIds?.length
        ? { emergencyRequestId: { in: opts.requestIds } }
        : {}),
    },
    orderBy: { createdAt: 'desc' },
    take,
  });

  return logs
    .map((log) => {
      const parsed = parseDriverIncidentNote(log.notes);
      if (!parsed) return null;
      return {
        ...parsed,
        id: log.id,
        submittedAt: log.createdAt.toISOString(),
      };
    })
    .filter((r): r is DriverIncidentRecord => r != null);
}
