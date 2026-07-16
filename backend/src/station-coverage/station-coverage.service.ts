import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StationCoverageService implements OnModuleInit {
  private activeStationCountCache: { count: number; expiresAt: number } | null = null;

  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    const defaultId = await this.getDefaultStationId();
    if (defaultId) {
      await this.prisma.emergencyRequest.updateMany({
        where: { stationId: null },
        data: { stationId: defaultId },
      });
    }
  }

  parseCoverageDistrictIds(raw: unknown): string[] {
    if (!Array.isArray(raw)) return [];
    return raw.filter((id): id is string => typeof id === 'string' && id.length > 0);
  }

  private async countActiveStations(): Promise<number> {
    const now = Date.now();
    if (this.activeStationCountCache && this.activeStationCountCache.expiresAt > now) {
      return this.activeStationCountCache.count;
    }
    const count = await this.prisma.station.count({ where: { isActive: true } });
    this.activeStationCountCache = { count, expiresAt: now + 30_000 };
    return count;
  }

  invalidateCache() {
    this.activeStationCountCache = null;
  }

  async usesStationScoping(): Promise<boolean> {
    return (await this.countActiveStations()) > 1;
  }

  async getDefaultStationId(): Promise<string | null> {
    const stations = await this.prisma.station.findMany({
      where: { isActive: true },
      select: { id: true },
    });
    return stations.length === 1 ? stations[0].id : null;
  }

  stationCoversDistrict(
    station: { districtId: string; coverageDistrictIds: unknown },
    districtId: string,
  ): boolean {
    const coverage = this.parseCoverageDistrictIds(station.coverageDistrictIds);
    if (coverage.length > 0) return coverage.includes(districtId);
    return station.districtId === districtId;
  }

  async suggestStationForDistrict(districtId: string, regionId?: string) {
    const stations = await this.prisma.station.findMany({
      where: { isActive: true },
      include: {
        region: { select: { id: true, name: true } },
        district: { select: { id: true, name: true } },
      },
      orderBy: { name: 'asc' },
    });

    const defaultStationId = stations.length === 1 ? stations[0].id : null;
    const matching = stations.filter((station) =>
      this.stationCoversDistrict(station, districtId),
    );

    const suggested =
      matching[0] ??
      (defaultStationId ? stations.find((s) => s.id === defaultStationId) : null) ??
      (regionId ? stations.find((s) => s.regionId === regionId) : null) ??
      null;

    return {
      singleStationMode: stations.length === 1,
      defaultStationId,
      suggested: suggested
        ? {
            id: suggested.id,
            name: suggested.name,
            regionName: suggested.region.name,
          }
        : null,
      alternatives: stations.map((s) => ({
        id: s.id,
        name: s.name,
        regionName: s.region.name,
        coversDistrict: this.stationCoversDistrict(s, districtId),
      })),
    };
  }

  async resolveStationIdForCase(input: {
    stationId?: string | null;
    districtId?: string | null;
    regionId?: string | null;
  }): Promise<string | null> {
    if (input.stationId) return input.stationId;

    const defaultId = await this.getDefaultStationId();
    if (defaultId) return defaultId;

    if (input.districtId) {
      const result = await this.suggestStationForDistrict(
        input.districtId,
        input.regionId ?? undefined,
      );
      return result.suggested?.id ?? null;
    }

    return null;
  }

  async validateCoverageDistrictIds(regionId: string, districtIds: string[]) {
    if (!districtIds.length) return;
    const valid = await this.prisma.district.findMany({
      where: {
        id: { in: districtIds },
        regionId,
        deletedAt: null,
      },
      select: { id: true },
    });
    if (valid.length !== districtIds.length) {
      throw new Error('One or more coverage districts do not belong to the selected region');
    }
  }
}
