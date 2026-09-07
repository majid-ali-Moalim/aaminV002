import { BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export function parseCoverageDistrictIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return [...new Set(raw.filter((id): id is string => typeof id === 'string' && id.length > 0))];
}

export function collectStationAssignedDistrictIds(station: {
  districtId: string;
  coverageDistrictIds?: unknown;
}): string[] {
  const homeId = String(station.districtId);
  const coverage = parseCoverageDistrictIds(station.coverageDistrictIds);
  return [...new Set([homeId, ...coverage])];
}

export async function validateRegionPayload(data: Record<string, unknown>) {
  const code = String(data.code ?? '').trim();
  const name = String(data.name ?? '').trim();
  if (!code) throw new BadRequestException('Region code is required');
  if (!name) throw new BadRequestException('Region name is required');
  return { code, name };
}

export async function validateDistrictPayload(
  prisma: PrismaService,
  data: Record<string, unknown>,
) {
  const code = String(data.code ?? '').trim();
  const name = String(data.name ?? '').trim();
  const regionId = String(data.regionId ?? '').trim();

  if (!code) throw new BadRequestException('District code is required');
  if (!name) throw new BadRequestException('District name is required');
  if (!regionId) throw new BadRequestException('District must belong to a region');

  const region = await prisma.region.findFirst({
    where: { id: regionId, deletedAt: null, isActive: true },
    select: { id: true, name: true },
  });
  if (!region) {
    throw new BadRequestException('Selected region does not exist or is inactive');
  }

  return { code, name, regionId };
}

export async function validateDistrictNotAssignedToStation(
  prisma: PrismaService,
  districtId: string,
  districtName?: string,
) {
  const homeStations = await prisma.station.findMany({
    where: { isActive: true, districtId },
    select: { id: true, name: true },
  });

  if (homeStations.length) {
    const names = homeStations.map((s) => s.name).join(', ');
    throw new BadRequestException(
      `District "${districtName ?? districtId}" is the home district of station "${names}". Change or archive that station first.`,
    );
  }
}

/** Remove a district from active stations' coverage lists (home district is never stored there). */
export async function detachDistrictFromStationCoverage(
  prisma: PrismaService,
  districtId: string,
) {
  const stations = await prisma.station.findMany({
    where: { isActive: true },
    select: { id: true, coverageDistrictIds: true },
  });

  for (const station of stations) {
    const coverage = parseCoverageDistrictIds(station.coverageDistrictIds);
    if (!coverage.includes(districtId)) continue;
    const next = coverage.filter((id) => id !== districtId);
    await prisma.station.update({
      where: { id: station.id },
      data: { coverageDistrictIds: next.length ? next : [] },
    });
  }
}

export async function validateRegionHasNoActiveDistricts(
  prisma: PrismaService,
  regionId: string,
  regionName?: string,
) {
  const count = await prisma.district.count({
    where: { regionId, deletedAt: null, isActive: true },
  });
  if (count > 0) {
    throw new BadRequestException(
      `Region "${regionName ?? regionId}" has ${count} active district(s). Deactivate or reassign them before archiving this region.`,
    );
  }
}

export async function validateStationLocationPayload(
  prisma: PrismaService,
  input: {
    stationId?: string;
    regionId: string;
    districtId: string;
    coverageDistrictIds?: unknown;
  },
) {
  const regionId = String(input.regionId ?? '').trim();
  const districtId = String(input.districtId ?? '').trim();
  if (!regionId || !districtId) {
    throw new BadRequestException('Station must belong to a region and home district');
  }

  const homeDistrict = await prisma.district.findFirst({
    where: { id: districtId, regionId, deletedAt: null, isActive: true },
    select: { id: true, name: true },
  });
  if (!homeDistrict) {
    throw new BadRequestException('Selected home district does not belong to the chosen region');
  }

  const coverageIds = parseCoverageDistrictIds(input.coverageDistrictIds);
  if (coverageIds.includes(districtId)) {
    throw new BadRequestException(
      'Home district cannot also appear in coverage districts. Remove the duplicate from coverage.',
    );
  }

  if (coverageIds.length) {
    const validCoverage = await prisma.district.findMany({
      where: {
        id: { in: coverageIds },
        regionId,
        deletedAt: null,
        isActive: true,
      },
      select: { id: true, name: true },
    });
    if (validCoverage.length !== coverageIds.length) {
      throw new BadRequestException(
        'One or more coverage districts do not belong to the selected region or are inactive',
      );
    }
  }

  const proposedIds = collectStationAssignedDistrictIds({
    districtId,
    coverageDistrictIds: coverageIds,
  });

  const otherStations = await prisma.station.findMany({
    where: {
      isActive: true,
      ...(input.stationId ? { id: { not: input.stationId } } : {}),
    },
    select: { id: true, name: true, districtId: true, coverageDistrictIds: true },
  });

  const districtNameById = new Map<string, string>([[homeDistrict.id, homeDistrict.name]]);
  if (coverageIds.length) {
    const coverageDistricts = await prisma.district.findMany({
      where: { id: { in: coverageIds } },
      select: { id: true, name: true },
    });
    for (const d of coverageDistricts) districtNameById.set(d.id, d.name);
  }

  for (const other of otherStations) {
    const otherIds = collectStationAssignedDistrictIds(other);
    for (const id of proposedIds) {
      if (otherIds.includes(id)) {
        const districtLabel = districtNameById.get(id) ?? id;
        throw new BadRequestException(
          `District "${districtLabel}" is already assigned to station "${other.name}". Each district can belong to only one station.`,
        );
      }
    }
  }

  return { regionId, districtId, coverageDistrictIds: coverageIds };
}

export function rethrowPrismaUniqueError(error: unknown, entityLabel: string): never {
  if (
    error &&
    typeof error === 'object' &&
    'code' in error &&
    (error as { code: string }).code === 'P2002'
  ) {
    const target = (error as { meta?: { target?: string[] } }).meta?.target;
    const fields = Array.isArray(target) ? target.join(', ') : 'value';
    throw new ConflictException(
      `A ${entityLabel} with this ${fields} already exists. Please use a different value.`,
    );
  }
  throw error;
}
