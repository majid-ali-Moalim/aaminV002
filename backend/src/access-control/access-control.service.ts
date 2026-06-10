import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { NotificationCategory, NotificationPriority, NotificationType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  ALL_PERMISSION_KEYS,
  getBaselinePermissions,
  getSuggestedPermissions,
  isValidPermissionKey,
  resolveStaffProfile,
} from './permission-catalog';

export type PermissionGrantInput = {
  permissionKey: string;
  expiresAt?: string | null;
};

@Injectable()
export class AccessControlService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  /** Activity logs require a real users.id — hardcoded admin JWT id is not in DB. */
  private async resolveAuditUserId(requestedId: string): Promise<string> {
    if (requestedId && requestedId !== 'hardcoded-admin-uuid') {
      const user = await this.prisma.user.findUnique({ where: { id: requestedId } });
      if (user) return user.id;
    }
    const admin = await this.prisma.user.findFirst({
      where: { role: 'ADMIN' },
      orderBy: { createdAt: 'asc' },
    });
    if (admin) return admin.id;
    throw new BadRequestException('No valid admin user found to record this audit entry');
  }

  getCatalog() {
    return {
      permissions: ALL_PERMISSION_KEYS,
      staffProfiles: ['administrator', 'dispatcher', 'driver', 'nurse', 'supervisor', 'fleet-manager', 'employee'],
      patientHasAccess: false,
    };
  }

  private mapGrant(row: {
    permissionKey: string;
    grantedAt: Date;
    expiresAt: Date | null;
  }) {
    const now = new Date();
    const isExpired = row.expiresAt ? row.expiresAt <= now : false;
    return {
      permissionKey: row.permissionKey,
      grantedAt: row.grantedAt.toISOString(),
      expiresAt: row.expiresAt?.toISOString() ?? null,
      isUnlimited: row.expiresAt === null,
      isExpired,
    };
  }

  async getUserPermissions(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        employee: { include: { employeeRole: true } },
        userPermissions: { orderBy: { grantedAt: 'desc' } },
      },
    });

    if (!user) throw new NotFoundException('User not found');

    const profile = resolveStaffProfile(user.role, user.employee?.employeeRole?.name);
    const baseline = getBaselinePermissions(user.role, user.employee?.employeeRole?.name);

    if (user.role === 'ADMIN') {
      return {
        userId: user.id,
        role: user.role,
        employeeRole: user.employee?.employeeRole?.name ?? null,
        staffProfile: profile,
        canAssignPermissions: false,
        baselinePermissions: [...ALL_PERMISSION_KEYS],
        suggestedPermissions: baseline,
        grantedPermissions: ALL_PERMISSION_KEYS.map((key) => ({
          permissionKey: key,
          grantedAt: user.createdAt.toISOString(),
          expiresAt: null,
          isUnlimited: true,
          isExpired: false,
          source: 'baseline' as const,
        })),
        activePermissionKeys: [...ALL_PERMISSION_KEYS],
        grantablePermissionKeys: [],
      };
    }

    const grants = user.userPermissions.map((p) => ({
      ...this.mapGrant(p),
      source: 'granted' as const,
    }));
    const activeGrants = grants.filter((g) => !g.isExpired);
    const activeGrantedKeys = activeGrants.map((g) => g.permissionKey);
    const activePermissionKeys = [...new Set([...baseline, ...activeGrantedKeys])];
    const grantablePermissionKeys = ALL_PERMISSION_KEYS.filter(
      (k) => !baseline.includes(k) && !activeGrantedKeys.includes(k),
    );

    return {
      userId: user.id,
      role: user.role,
      employeeRole: user.employee?.employeeRole?.name ?? null,
      staffProfile: profile,
      canAssignPermissions: user.role !== 'PATIENT',
      baselinePermissions: baseline,
      suggestedPermissions: baseline,
      grantedPermissions: grants,
      activePermissionKeys,
      activeGrantedKeys,
      grantablePermissionKeys,
    };
  }

  async setUserPermissions(
    userId: string,
    grants: PermissionGrantInput[],
    grantedById: string,
    defaultExpiresAt?: string | null,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { employee: { include: { employeeRole: true } } },
    });

    if (!user) throw new NotFoundException('User not found');
    if (user.role === 'PATIENT') {
      throw new ForbiddenException('Patient accounts cannot be granted system permissions');
    }
    if (user.role === 'ADMIN') {
      throw new ForbiddenException('Administrator accounts have full access and cannot be modified here');
    }

    const baseline = getBaselinePermissions(user.role, user.employee?.employeeRole?.name);

    const normalized = grants
      .map((g) => {
        const expiresAtRaw = g.expiresAt !== undefined ? g.expiresAt : defaultExpiresAt;
        let expiresAt: Date | null = null;
        if (expiresAtRaw) {
          expiresAt = new Date(expiresAtRaw);
          if (Number.isNaN(expiresAt.getTime())) {
            throw new BadRequestException(`Invalid expiry date for permission ${g.permissionKey}`);
          }
          if (expiresAt <= new Date()) {
            throw new BadRequestException('Expiry must be in the future');
          }
        }
        return { permissionKey: g.permissionKey, expiresAt };
      })
      .filter((g) => !baseline.includes(g.permissionKey as (typeof baseline)[number]));

    const keys = normalized.map((g) => g.permissionKey);
    const uniqueKeys = [...new Set(keys)];
    const invalid = uniqueKeys.filter((k) => !isValidPermissionKey(k));
    if (invalid.length > 0) {
      throw new BadRequestException(`Invalid permission keys: ${invalid.join(', ')}`);
    }

    const byKey = new Map<string, Date | null>();
    for (const g of normalized) {
      byKey.set(g.permissionKey, g.expiresAt);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.userPermission.deleteMany({ where: { userId } });
      if (byKey.size > 0) {
        await tx.userPermission.createMany({
          data: [...byKey.entries()].map(([permissionKey, expiresAt]) => ({
            userId,
            permissionKey,
            grantedById,
            expiresAt,
          })),
        });
      }
    });

    const expirySummary =
      [...byKey.values()].every((e) => e === null)
        ? 'unlimited'
        : [...byKey.values()].find((e) => e !== null)?.toISOString() ?? 'mixed';

    try {
      const auditUserId = await this.resolveAuditUserId(grantedById);
      await this.prisma.activityLog.create({
        data: {
          userId: auditUserId,
          action: `Granted ${byKey.size} permission(s) to ${user.username}`,
          entityType: 'UserPermission',
          entityId: userId,
          metadata: {
            permissionKeys: [...byKey.keys()],
            targetUsername: user.username,
            expirySummary,
            grantedByRequestId: grantedById,
          },
        },
      });
    } catch (err) {
      console.error('[AccessControlService] Audit log failed (permissions still saved):', err);
    }

    const permissionCount = byKey.size;
    const expiryLabel =
      expirySummary === 'unlimited'
        ? 'Unlimited access'
        : `Expires ${new Date(expirySummary).toLocaleString()}`;

    try {
      await this.notifications.dispatchEvent({
        eventKey: 'SECURITY_ALERT',
        title: 'Access permissions updated',
        message: `You have been granted ${permissionCount} permission${permissionCount === 1 ? '' : 's'} by an administrator. ${expiryLabel}. Sign in again or open My Profile to review your access.`,
        type: NotificationType.SYSTEM,
        category: NotificationCategory.SYSTEM,
        priority: NotificationPriority.HIGH,
        senderName: 'Access Control',
        entityType: 'UserPermission',
        entityId: userId,
        redirectUrl: user.role === 'EMPLOYEE' ? '/dispatcher/permissions/overview' : '/admin/profile',
        context: {
          directOnly: true,
          recipientUserIds: [userId],
          createdById: grantedById,
        },
      });
    } catch (err) {
      console.error('[AccessControlService] Permission grant notification failed:', err);
    }

    return this.getUserPermissions(userId);
  }

  async getPermissionsForAuth(userId: string, role: string, employeeRoleName?: string | null) {
    if (role === 'PATIENT') return [];
    if (role === 'ADMIN' || userId === 'hardcoded-admin-uuid') {
      return [...ALL_PERMISSION_KEYS];
    }

    const baseline = getBaselinePermissions(role, employeeRoleName);
    const now = new Date();
    const rows = await this.prisma.userPermission.findMany({
      where: {
        userId,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      select: { permissionKey: true },
    });

    const granted = rows.map((r) => r.permissionKey);
    return [...new Set([...baseline, ...granted])];
  }
}
