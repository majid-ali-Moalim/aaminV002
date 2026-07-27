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
    if (station.districtId === districtId) return true;
    const coverage = this.parseCoverageDistrictIds(station.coverageDistrictIds);
    return coverage.includes(districtId);
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
      matching.find((s) => s.districtId === districtId) ??
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
        isHomeDistrict: s.districtId === districtId,
      })),
    };
  }

  async resolveStationIdForCase(input: {
    stationId?: string | null;
    districtId?: string | null;
    regionId?: string | null;
  }): Promise<string | null> {
    const defaultId = await this.getDefaultStationId();
    const multiStation = !defaultId;

    if (input.districtId) {
      const result = await this.suggestStationForDistrict(
        input.districtId,
        input.regionId ?? undefined,
      );
      const covering = result.alternatives.filter((station) => station.coversDistrict);
      const homeCovering = covering.find((station) => station.isHomeDistrict);
      if (homeCovering?.id) return homeCovering.id;
      if (covering[0]?.id) return covering[0].id;
      if (!multiStation && result.suggested?.id) return result.suggested.id;
    }

    if (!multiStation) {
      if (input.stationId) return input.stationId;
      return defaultId;
    }

    return null;
  }

  async resolveCaseStationRouting(input: {
    districtId?: string | null;
    regionId?: string | null;
    submitterEmployeeId?: string | null;
  }): Promise<{
    stationId: string | null;
    stationName: string | null;
    submitterStationId: string | null;
    crossStationRoute: boolean;
  }> {
    const stationId = await this.resolveStationIdForCase({
      districtId: input.districtId,
      regionId: input.regionId,
    });

    let stationName: string | null = null;
    if (stationId) {
      const station = await this.prisma.station.findUnique({
        where: { id: stationId },
        select: { name: true },
      });
      stationName = station?.name ?? null;
    }

    let submitterStationId: string | null = null;
    if (input.submitterEmployeeId) {
      const submitter = await this.prisma.employee.findUnique({
        where: { id: input.submitterEmployeeId },
        select: { stationId: true },
      });
      submitterStationId = submitter?.stationId ?? null;
    }

    const crossStationRoute = Boolean(
      stationId &&
        submitterStationId &&
        submitterStationId !== stationId,
    );

    return {
      stationId,
      stationName,
      submitterStationId,
      crossStationRoute,
    };
  }

  /** @deprecated Cases are station-owned; dispatchers claim cases when assigning crew. */
  async findOwningDispatcherId(input: {
    stationId: string;
    districtId?: string | null;
    submitterEmployeeId?: string | null;
  }): Promise<{
    dispatcherId: string | null;
    autoRouted: boolean;
    fromStationId: string | null;
  }> {
    const { stationId, districtId, submitterEmployeeId } = input;
    let autoRouted = false;
    let fromStationId: string | null = null;

    const coveringStation = await this.prisma.station.findUnique({
      where: { id: stationId },
    });
    if (!coveringStation) {
      return { dispatcherId: null, autoRouted: false, fromStationId: null };
    }

    if (submitterEmployeeId) {
      const submitter = await this.prisma.employee.findFirst({
        where: {
          id: submitterEmployeeId,
          status: 'ACTIVE',
          employeeRole: { name: { contains: 'Dispatcher', mode: 'insensitive' } },
        },
        include: { station: true },
      });

      if (submitter) {
        if (submitter.stationId && submitter.stationId !== stationId) {
          autoRouted = true;
          fromStationId = submitter.stationId;
        } else if (
          submitter.stationId === stationId &&
          (!districtId || this.stationCoversDistrict(coveringStation, districtId))
        ) {
          return {
            dispatcherId: submitter.id,
            autoRouted: false,
            fromStationId: null,
          };
        }
      }
    }

    const dispatchers = await this.prisma.employee.findMany({
      where: {
        status: 'ACTIVE',
        stationId,
        employeeRole: { name: { contains: 'Dispatcher', mode: 'insensitive' } },
      },
      orderBy: [{ updatedAt: 'asc' }],
    });

    const shiftRank = (status: string | null | undefined) => {
      if (status === 'AVAILABLE' || status === 'ON_DUTY') return 0;
      if (status === 'OFF_DUTY') return 2;
      return 1;
    };

    dispatchers.sort((a, b) => shiftRank(a.shiftStatus) - shiftRank(b.shiftStatus));
    const chosen = dispatchers[0]?.id ?? null;

    return { dispatcherId: chosen, autoRouted, fromStationId };
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
