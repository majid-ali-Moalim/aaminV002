import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  DispatchContext,
  EVENT_ROLE_ACCESS,
  NotificationEventKey,
} from './notification-events';

@Injectable()
export class NotificationDispatchService {
  constructor(private prisma: PrismaService) {}

  /** Core rule: never notify the actor who triggered the event */
  filterSelf(recipientIds: string[], createdById?: string | null): string[] {
    if (!createdById) return [...new Set(recipientIds)];
    return [...new Set(recipientIds.filter((id) => id && id !== createdById))];
  }

  async findAdminUserIds(): Promise<string[]> {
    const users = await this.prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: { id: true },
    });
    return users.map((u) => u.id);
  }

  async findEmployeeUserIdsByRoleNames(names: string[]): Promise<string[]> {
    if (!names.length) return [];
    const employees = await this.prisma.employee.findMany({
      where: {
        status: 'ACTIVE',
        employeeRole: { name: { in: names, mode: 'insensitive' } },
      },
      select: { userId: true },
    });
    return employees.map((e) => e.userId);
  }

  async findEmployeeUserIdsByRolePatterns(patterns: string[]): Promise<string[]> {
    if (!patterns.length) return [];
    const employees = await this.prisma.employee.findMany({
      where: {
        status: 'ACTIVE',
        OR: patterns.map((p) => ({
          employeeRole: { name: { contains: p, mode: 'insensitive' as const } },
        })),
      },
      select: { userId: true },
    });
    return employees.map((e) => e.userId);
  }

  async findAllActiveEmployeeUserIds(): Promise<string[]> {
    const employees = await this.prisma.employee.findMany({
      where: { status: 'ACTIVE' },
      select: { userId: true },
    });
    return employees.map((e) => e.userId);
  }

  async findHospitalStaffUserIds(hospitalId: string): Promise<string[]> {
    if (!hospitalId) return [];
    const employees = await this.prisma.employee.findMany({
      where: {
        status: 'ACTIVE',
        hospitalId,
        userId: { not: undefined },
      },
      select: { userId: true },
    });
    return employees.map((e) => e.userId).filter(Boolean);
  }

  async resolveRecipients(
    eventKey: NotificationEventKey,
    context: DispatchContext = {},
  ): Promise<string[]> {
    if (context.directOnly && context.recipientUserIds?.length) {
      return this.filterSelf(context.recipientUserIds, context.createdById);
    }

    const rules = EVENT_ROLE_ACCESS[eventKey];
    const ids: string[] = [];

    if (rules.includeUserRoles.includes('ADMIN')) {
      ids.push(...(await this.findAdminUserIds()));
    }

    if (rules.employeeRoleNames?.length) {
      ids.push(...(await this.findEmployeeUserIdsByRoleNames(rules.employeeRoleNames)));
    }

    if (context.includeEmployeeRoles?.length) {
      ids.push(...(await this.findEmployeeUserIdsByRoleNames(context.includeEmployeeRoles)));
    }

    if (context.assignedUserIds?.length) {
      ids.push(...context.assignedUserIds.filter(Boolean));
    }

    if (context.recipientUserIds?.length) {
      ids.push(...context.recipientUserIds);
    }

    let unique = [...new Set(ids)];

    if (rules.excludeEmployeeRoleNames?.length) {
      const excluded = new Set(
        await this.findEmployeeUserIdsByRoleNames(rules.excludeEmployeeRoleNames),
      );
      unique = unique.filter((id) => !excluded.has(id));
    }

    // Mission updated/cancelled: assigned team only (+ no dispatchers per spec)
    if (eventKey === 'MISSION_UPDATED' || eventKey === 'MISSION_CANCELLED') {
      unique = context.assignedUserIds?.length
        ? [...new Set(context.assignedUserIds)]
        : [];
    }

    return this.filterSelf(unique, context.createdById);
  }

  async isChannelEnabled(
    userId: string,
    category: string,
    channel = 'IN_APP',
  ): Promise<boolean> {
    const pref = await this.prisma.notificationPreference.findUnique({
      where: {
        userId_category_channel: {
          userId,
          category: category as any,
          channel,
        },
      },
    });
    return pref?.enabled ?? true;
  }
}
