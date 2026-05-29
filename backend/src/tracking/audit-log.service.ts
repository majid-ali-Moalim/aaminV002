import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditLogService {
  constructor(private prisma: PrismaService) {}

  /**
   * Logs an operational action for compliance and audit
   */
  async logCaseActivity(
    employeeIdOrUserId: string,
    action: string,
    caseId: string,
    oldStatus?: string,
    newStatus?: string,
    additionalMetadata?: any
  ) {
    let validUserId = employeeIdOrUserId;

    if (validUserId === 'SYSTEM') {
      const admin = await this.prisma.user.findFirst({ where: { role: 'ADMIN' } });
      if (admin) validUserId = admin.id;
    } else {
      // Check if it's already a valid user
      const user = await this.prisma.user.findUnique({ where: { id: validUserId } });
      if (!user) {
        // It might be an employeeId, lookup the user
        const employee = await this.prisma.employee.findUnique({ where: { id: validUserId } });
        if (employee) {
          validUserId = employee.userId;
        } else {
          // Fallback
          const admin = await this.prisma.user.findFirst({ where: { role: 'ADMIN' } });
          if (admin) validUserId = admin.id;
        }
      }
    }

    return this.prisma.activityLog.create({
      data: {
        userId: validUserId,
        action,
        entityType: 'EmergencyRequest',
        entityId: caseId,
        metadata: {
          oldStatus,
          newStatus,
          ...additionalMetadata,
        },
      },
    });
  }
}
