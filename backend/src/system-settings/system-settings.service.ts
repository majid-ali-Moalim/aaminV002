import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type SystemSettingRow = {
  id: string;
  key: string;
  value: unknown;
  section: string;
  description: string | null;
  updatedById: string | null;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class SystemSettingsService {
  private cache = new Map<string, unknown>();
  private cacheLoadedAt = 0;
  private readonly cacheTtlMs = 30_000;

  constructor(private prisma: PrismaService) {}

  invalidateCache() {
    this.cache.clear();
    this.cacheLoadedAt = 0;
  }

  private async ensureCache() {
    const now = Date.now();
    if (this.cacheLoadedAt && now - this.cacheLoadedAt < this.cacheTtlMs) return;

    const rows = await this.prisma.systemSetting.findMany({
      orderBy: { key: 'asc' },
    });
    this.cache.clear();
    for (const row of rows) {
      this.cache.set(row.key, row.value);
    }
    this.cacheLoadedAt = now;
  }

  async getByKey<T = unknown>(key: string, fallback?: T): Promise<T> {
    await this.ensureCache();
    if (this.cache.has(key)) return this.cache.get(key) as T;
    return fallback as T;
  }

  async getNumber(key: string, fallback: number): Promise<number> {
    const raw = await this.getByKey(key, fallback);
    const n = typeof raw === 'number' ? raw : Number(raw);
    return Number.isFinite(n) ? n : fallback;
  }

  async getBoolean(key: string, fallback: boolean): Promise<boolean> {
    const raw = await this.getByKey(key, fallback);
    if (typeof raw === 'boolean') return raw;
    if (raw === 'true') return true;
    if (raw === 'false') return false;
    return fallback;
  }

  async getString(key: string, fallback: string): Promise<string> {
    const raw = await this.getByKey(key, fallback);
    if (raw == null) return fallback;
    return String(raw);
  }

  async getSection(section: string): Promise<SystemSettingRow[]> {
    return this.prisma.systemSetting.findMany({
      where: { section },
      orderBy: { key: 'asc' },
    });
  }

  /** Public-safe keys for marketing site (no auth required). */
  async getPublicSettings(): Promise<Record<string, unknown>> {
    await this.ensureCache();
    const keys = [
      'general.systemName',
      'general.organizationName',
      'public.contactPhone',
      'public.contactEmail',
      'public.showFleetStats',
      'public.showHireAmbulanceForm',
      'public.maintenanceMode',
      'dispatch.allowPublicTracking',
    ];
    const out: Record<string, unknown> = {};
    for (const key of keys) {
      if (this.cache.has(key)) out[key] = this.cache.get(key);
    }
    return out;
  }

  async getSecurityPolicy() {
    const [passwordMinLength, maxLoginAttempts, lockoutDurationMins] = await Promise.all([
      this.getNumber('security.passwordMinLength', 8),
      this.getNumber('security.maxLoginAttempts', 5),
      this.getNumber('security.lockoutDurationMins', 15),
    ]);
    return {
      passwordMinLength: Math.max(6, Math.min(32, passwordMinLength)),
      maxLoginAttempts: Math.max(3, Math.min(20, maxLoginAttempts)),
      lockoutDurationMins: Math.max(1, Math.min(1440, lockoutDurationMins)),
    };
  }
}
