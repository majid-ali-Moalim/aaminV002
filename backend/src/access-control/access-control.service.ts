import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  ALL_PERMISSION_KEYS,
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
  constructor(private prisma: PrismaService) {}

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
    const suggested = getSuggestedPermissions(user.role, user.employee?.employeeRole?.name);

    if (user.role === 'ADMIN') {
      return {
        userId: user.id,
        role: user.role,
        employeeRole: user.employee?.employeeRole?.name ?? null,
        staffProfile: profile,
        canAssignPermissions: false,
        suggestedPermissions: suggested,
        grantedPermissions: ALL_PERMISSION_KEYS.map((key) => ({
          permissionKey: key,
          grantedAt: user.createdAt.toISOString(),
          expiresAt: null,
          isUnlimited: true,
          isExpired: false,
        })),
      };
    }

    const grants = user.userPermissions.map((p) => this.mapGrant(p));
    const activeGrants = grants.filter((g) => !g.isExpired);

    return {
      userId: user.id,
      role: user.role,
      employeeRole: user.employee?.employeeRole?.name ?? null,
      staffProfile: profile,
      canAssignPermissions: user.role !== 'PATIENT',
      suggestedPermissions: suggested,
      grantedPermissions: grants,
      activePermissionKeys: activeGrants.map((g) => g.permissionKey),
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

    const normalized = grants.map((g) => {
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
    });

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

    return this.getUserPermissions(userId);
  }

  async getPermissionsForAuth(userId: string, role: string, employeeRoleName?: string | null) {
    if (role === 'PATIENT') return [];
    if (role === 'ADMIN' || userId === 'hardcoded-admin-uuid') {
      return [...ALL_PERMISSION_KEYS];
    }

    const now = new Date();
    const rows = await this.prisma.userPermission.findMany({
      where: {
        userId,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      select: { permissionKey: true },
    });

    return rows.map((r) => r.permissionKey);
  }
}
