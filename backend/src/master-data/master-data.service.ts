import { Injectable, NotFoundException, BadRequestException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';

export type MdmEntityKey =
  | 'regions'
  | 'districts'
  | 'stations'
  | 'incident-categories'
  | 'emergency-types'
  | 'priority-levels'
  | 'ambulance-types'
  | 'ambulance-statuses'
  | 'hospital-types'
  | 'mission-statuses'
  | 'cancellation-reasons'
  | 'system-settings';

const ENTITY_MAP: Record<MdmEntityKey, string> = {
  regions: 'region',
  districts: 'district',
  stations: 'station',
  'incident-categories': 'incidentCategory',
  'emergency-types': 'emergencyType',
  'priority-levels': 'priorityLevel',
  'ambulance-types': 'ambulanceType',
  'ambulance-statuses': 'ambulanceStatusConfig',
  'hospital-types': 'hospitalType',
  'mission-statuses': 'missionStatusConfig',
  'cancellation-reasons': 'cancellationReason',
  'system-settings': 'systemSetting',
};

export type ListQuery = {
  search?: string;
  status?: 'all' | 'active' | 'inactive';
  regionId?: string;
  districtId?: string;
  incidentCategoryId?: string;
  section?: string;
  page?: number;
  limit?: number;
  includeInactive?: boolean;
};

@Injectable()
export class MasterDataService implements OnModuleInit {
  constructor(
    private prisma: PrismaService,
    private activityLogs: ActivityLogsService,
  ) {}

  async onModuleInit() {
    await this.seedDefaults();
  }

  private model(entity: MdmEntityKey) {
    const name = ENTITY_MAP[entity];
    const m = (this.prisma as any)[name];
    if (!m) throw new BadRequestException(`Unknown entity: ${entity}`);
    return m;
  }

  private buildWhere(entity: MdmEntityKey, query: ListQuery) {
    const where: Record<string, unknown> = {};
    if (entity !== 'stations') {
      where.deletedAt = null;
    }

    if (query.status === 'active') where.isActive = true;
    else if (query.status === 'inactive') where.isActive = false;
    else if (!query.includeInactive && entity !== 'system-settings') {
      where.isActive = true;
    }

    if (query.regionId && (entity === 'districts' || entity === 'stations')) {
      where.regionId = query.regionId;
    }
    if (query.districtId && entity === 'stations') where.districtId = query.districtId;
    if (query.incidentCategoryId && entity === 'emergency-types') {
      where.incidentCategoryId = query.incidentCategoryId;
    }
    if (query.section && entity === 'system-settings') where.section = query.section;

    if (query.search?.trim()) {
      const q = query.search.trim();
      if (entity === 'system-settings') {
        where.OR = [{ key: { contains: q, mode: 'insensitive' } }];
      } else {
        where.OR = [
          { name: { contains: q, mode: 'insensitive' } },
          { code: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
        ];
      }
    }

    return where;
  }

  private orderBy(entity: MdmEntityKey) {
    if (entity === 'mission-statuses') return { sortOrder: 'asc' as const };
    if (entity === 'system-settings') return { key: 'asc' as const };
    return { name: 'asc' as const };
  }

  private include(entity: MdmEntityKey) {
    if (entity === 'districts') return { region: { select: { id: true, name: true, code: true } } };
    if (entity === 'stations') {
      return {
        region: { select: { id: true, name: true, code: true } },
        district: { select: { id: true, name: true, code: true, regionId: true } },
      };
    }
    if (entity === 'emergency-types') {
      return { incidentCategory: { select: { id: true, name: true, code: true } } };
    }
    if (entity === 'regions') return { _count: { select: { districts: true } } };
    return undefined;
  }

  async list(entity: MdmEntityKey, query: ListQuery = {}) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const skip = (page - 1) * limit;
    const where = this.buildWhere(entity, query);
    const m = this.model(entity);

    const [items, total] = await Promise.all([
      m.findMany({
        where,
        include: this.include(entity),
        orderBy: this.orderBy(entity),
        skip,
        take: limit,
      }),
      m.count({ where }),
    ]);

    return { items, total, page, limit, hasMore: skip + items.length < total };
  }

  async listAll(entity: MdmEntityKey, query: ListQuery = {}) {
    const where = this.buildWhere(entity, { ...query, includeInactive: true });
    return this.model(entity).findMany({
      where,
      include: this.include(entity),
      orderBy: this.orderBy(entity),
    });
  }

  async getOne(entity: MdmEntityKey, id: string) {
    const where: Record<string, unknown> = { id };
    if (entity !== 'stations') where.deletedAt = null;

    const row = await this.model(entity).findFirst({
      where,
      include: this.include(entity),
    });
    if (!row) throw new NotFoundException(`${entity} record not found`);
    return row;
  }

  async create(entity: MdmEntityKey, data: Record<string, unknown>, userId?: string) {
    if (entity === 'districts' && !data.regionId) {
      throw new BadRequestException('District must belong to a region');
    }
    if (entity === 'stations') {
      if (!data.name || !String(data.name).trim()) {
        throw new BadRequestException('Station name is required');
      }
      if (!data.regionId || !data.districtId) {
        throw new BadRequestException('Station must belong to a region and district');
      }
      const district = await this.prisma.district.findFirst({
        where: {
          id: String(data.districtId),
          regionId: String(data.regionId),
          deletedAt: null,
        },
      });
      if (!district) {
        throw new BadRequestException('Selected district does not belong to the chosen region');
      }
    }

    const usesAuditFields = entity !== 'system-settings' && entity !== 'stations';
    const payload = {
      ...data,
      ...(userId && usesAuditFields ? { createdById: userId, updatedById: userId } : {}),
      ...(userId && entity === 'system-settings' ? { updatedById: userId } : {}),
    };

    const row = await this.model(entity).create({ data: payload });
    await this.logAudit(userId, 'CREATE', entity, row.id, payload);
    return row;
  }

  async update(entity: MdmEntityKey, id: string, data: Record<string, unknown>, userId?: string) {
    await this.getOne(entity, id);

    if (entity === 'stations' && (data.regionId || data.districtId)) {
      const existing = await this.model(entity).findUnique({ where: { id } });
      const regionId = String(data.regionId ?? existing?.regionId ?? '');
      const districtId = String(data.districtId ?? existing?.districtId ?? '');
      if (!regionId || !districtId) {
        throw new BadRequestException('Station must belong to a region and district');
      }
      const district = await this.prisma.district.findFirst({
        where: { id: districtId, regionId, deletedAt: null },
      });
      if (!district) {
        throw new BadRequestException('Selected district does not belong to the chosen region');
      }
    }

    const usesAuditFields = entity !== 'stations';
    const payload = {
      ...data,
      ...(userId && usesAuditFields ? { updatedById: userId } : {}),
    };
    const row = await this.model(entity).update({ where: { id }, data: payload });
    await this.logAudit(userId, 'UPDATE', entity, id, payload);
    return row;
  }

  async setActive(entity: MdmEntityKey, id: string, isActive: boolean, userId?: string) {
    if (entity === 'system-settings') throw new BadRequestException('Not applicable');
    return this.update(entity, id, { isActive }, userId);
  }

  async remove(entity: MdmEntityKey, id: string, userId?: string) {
    await this.getOne(entity, id);

    if (entity === 'stations') {
      const row = await this.model(entity).update({
        where: { id },
        data: { isActive: false },
      });
      await this.logAudit(userId, 'DELETE', entity, id);
      return row;
    }

    const row = await this.model(entity).update({
      where: { id },
      data: {
        isActive: false,
        deletedAt: new Date(),
        ...(userId ? { updatedById: userId } : {}),
      },
    });
    await this.logAudit(userId, 'DELETE', entity, id);
    return row;
  }

  async getSystemSettingsBySection(section: string) {
    return this.model('system-settings').findMany({
      where: { section },
      orderBy: { key: 'asc' },
    });
  }

  async upsertSystemSettings(
    section: string,
    settings: { key: string; value: unknown; description?: string }[],
    userId?: string,
  ) {
    const results = [];
    for (const s of settings) {
      const row = await this.model('system-settings').upsert({
        where: { key: s.key },
        create: {
          key: s.key,
          value: s.value as any,
          section,
          description: s.description,
          updatedById: userId,
        },
        update: {
          value: s.value as any,
          section,
          description: s.description,
          updatedById: userId,
        },
      });
      results.push(row);
    }
    await this.logAudit(userId, 'UPDATE', 'system-settings', section, { count: results.length });
    return results;
  }

  async getAuditLogs(entity: MdmEntityKey, limit = 50) {
    return this.activityLogs.findAll({
      entityType: `mdm:${entity}`,
      limit,
    });
  }

  private async logAudit(
    userId: string | undefined,
    action: string,
    entity: string,
    entityId: string,
    metadata?: unknown,
  ) {
    if (!userId) return;
    try {
      await this.prisma.activityLog.create({
        data: {
          userId,
          action: `MDM_${action}`,
          entityType: `mdm:${entity}`,
          entityId,
          metadata: metadata ? (metadata as object) : undefined,
        },
      });
    } catch {
      /* non-blocking */
    }
  }

  private async seedDefaults() {
    const seeds: { entity: MdmEntityKey; rows: Record<string, unknown>[] }[] = [
      {
        entity: 'priority-levels',
        rows: [
          { code: 'CRITICAL', name: 'Critical', color: '#EF4444', responseTargetMins: 8 },
          { code: 'HIGH', name: 'High', color: '#F97316', responseTargetMins: 12 },
          { code: 'MEDIUM', name: 'Medium', color: '#3B82F6', responseTargetMins: 20 },
          { code: 'LOW', name: 'Low', color: '#6B7280', responseTargetMins: 30 },
        ],
      },
      {
        entity: 'ambulance-types',
        rows: [
          { code: 'BLS', name: 'Basic Life Support' },
          { code: 'ALS', name: 'Advanced Life Support' },
          { code: 'MICU', name: 'Mobile ICU' },
          { code: 'NEONATAL', name: 'Neonatal Ambulance' },
        ],
      },
      {
        entity: 'ambulance-statuses',
        rows: [
          { code: 'AVAILABLE', name: 'Available' },
          { code: 'ASSIGNED', name: 'Assigned' },
          { code: 'ON_MISSION', name: 'On Mission' },
          { code: 'MAINTENANCE', name: 'Maintenance' },
          { code: 'OUT_OF_SERVICE', name: 'Out Of Service' },
        ],
      },
      {
        entity: 'hospital-types',
        rows: [
          { code: 'GOV', name: 'Government Hospital' },
          { code: 'PRIVATE', name: 'Private Hospital' },
          { code: 'MILITARY', name: 'Military Hospital' },
          { code: 'TEACHING', name: 'Teaching Hospital' },
          { code: 'NGO', name: 'NGO Hospital' },
        ],
      },
      {
        entity: 'mission-statuses',
        rows: [
          { code: 'PENDING', name: 'Pending', sortOrder: 1 },
          { code: 'ASSIGNED', name: 'Assigned', sortOrder: 2 },
          { code: 'EN_ROUTE', name: 'En Route', sortOrder: 3 },
          { code: 'AT_SCENE', name: 'At Scene', sortOrder: 4 },
          { code: 'TRANSPORTING', name: 'Transporting', sortOrder: 5 },
          { code: 'COMPLETED', name: 'Completed', sortOrder: 6 },
          { code: 'CANCELLED', name: 'Cancelled', sortOrder: 7 },
        ],
      },
      {
        entity: 'cancellation-reasons',
        rows: [
          { code: 'DUPLICATE', name: 'Duplicate Case' },
          { code: 'FALSE_ALARM', name: 'False Alarm' },
          { code: 'REFUSED', name: 'Patient Refused Transport' },
          { code: 'REASSIGNED', name: 'Mission Reassigned' },
          { code: 'NO_RESOURCE', name: 'Resource Unavailable' },
        ],
      },
      {
        entity: 'incident-categories',
        rows: [
          { code: 'ROAD_ACC', name: 'Road Accident' },
          { code: 'MEDICAL', name: 'Medical Emergency' },
          { code: 'FIRE', name: 'Fire Incident' },
          { code: 'PREGNANCY', name: 'Pregnancy Emergency' },
          { code: 'DISASTER', name: 'Disaster Incident' },
          { code: 'OTHER', name: 'Others' },
        ],
      },
    ];

    for (const { entity, rows } of seeds) {
      const m = this.model(entity);
      for (const row of rows) {
        const code = row.code as string;
        const name = row.name as string;
        try {
          await m.upsert({
            where: { code },
            create: { ...row, description: row.description ?? null },
            update: {},
          });
        } catch {
          try {
            await m.upsert({
              where: { name },
              create: { ...row, description: row.description ?? null },
              update: {},
            });
          } catch {
            /* skip */
          }
        }
      }
    }

    const defaultSettings = [
      { key: 'general.systemName', section: 'general', value: 'Aamin EMS Dispatch' },
      { key: 'general.organizationName', section: 'general', value: 'Aamin Ambulance Services' },
      { key: 'general.defaultLanguage', section: 'general', value: 'en' },
      { key: 'general.timeZone', section: 'general', value: 'Africa/Mogadishu' },
      { key: 'general.dateFormat', section: 'general', value: 'DD/MM/YYYY' },
      { key: 'notifications.emailEnabled', section: 'notifications', value: true },
      { key: 'notifications.inAppEnabled', section: 'notifications', value: true },
      { key: 'notifications.alertSounds', section: 'notifications', value: true },
      { key: 'security.sessionTimeoutMins', section: 'security', value: 60 },
      { key: 'security.maxLoginAttempts', section: 'security', value: 5 },
      { key: 'security.passwordMinLength', section: 'security', value: 8 },
      { key: 'security.twoFactorEnabled', section: 'security', value: false },
      { key: 'attendance.shiftDurationHours', section: 'attendance', value: 8 },
      { key: 'attendance.gracePeriodMins', section: 'attendance', value: 15 },
      { key: 'attendance.lateThresholdMins', section: 'attendance', value: 10 },
    ];

    for (const s of defaultSettings) {
      await this.model('system-settings').upsert({
        where: { key: s.key },
        create: s as any,
        update: {},
      });
    }
    // Seed emergency types linked to categories
    const categories = await this.prisma.incidentCategory.findMany({ where: { deletedAt: null } });
    const catByCode = Object.fromEntries(categories.filter((c) => c.code).map((c) => [c.code!, c.id]));
    const emergencyTypes = [
      { code: 'CARDIAC', name: 'Cardiac Arrest', cat: 'MEDICAL' },
      { code: 'TRAUMA', name: 'Trauma', cat: 'ROAD_ACC' },
      { code: 'STROKE', name: 'Stroke', cat: 'MEDICAL' },
      { code: 'BURN', name: 'Burn Injury', cat: 'FIRE' },
      { code: 'LABOR', name: 'Labor Emergency', cat: 'PREGNANCY' },
      { code: 'OTHER', name: 'Others', cat: null },
    ];
    for (const et of emergencyTypes) {
      try {
        await this.model('emergency-types').upsert({
          where: { code: et.code },
          create: {
            code: et.code,
            name: et.name,
            incidentCategoryId: et.cat ? (catByCode[et.cat] ?? null) : null,
          },
          update: {},
        });
      } catch {
        /* skip */
      }
    }
  }
}
