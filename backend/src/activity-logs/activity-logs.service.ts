import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ActivityLogsService {
  constructor(private prisma: PrismaService) {}

  findAll(options?: {
    limit?: number;
    entityType?: string;
    userId?: string;
    since?: Date;
  }) {
    const limit = Math.min(options?.limit ?? 100, 500);

    return this.prisma.activityLog.findMany({
      where: {
        entityType: options?.entityType || undefined,
        userId: options?.userId || undefined,
        createdAt: options?.since ? { gte: options.since } : undefined,
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            role: true,
            employee: {
              select: {
                firstName: true,
                lastName: true,
                employeeRole: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    });
  }
}
