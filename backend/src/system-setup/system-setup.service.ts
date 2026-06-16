import { Injectable, ConflictException } from '@nestjs/common';
import { EmergencyRequestStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SystemSetupService {
  constructor(private prisma: PrismaService) {}

  // --- Dynamic Model Helpers ---
  private getModel(modelName: string) {
    const model = (this.prisma as any)[modelName];
    if (!model) throw new Error(`Model ${modelName} not found in Prisma`);
    return model;
  }

  // --- Generic CRUD ---
  async findAll(modelName: string, include?: any) {
    return this.getModel(modelName).findMany({
      where: { isActive: true },
      include,
      orderBy: { name: 'asc' },
    });
  }

  async create(modelName: string, data: any) {
    try {
      return await this.getModel(modelName).create({ data });
    } catch (error: any) {
      if (error.code === 'P2002') {
        const target = error.meta?.target?.[0] || 'identifier';
        const friendlyName = target.replace(/([A-Z])/g, ' $1').toLowerCase();
        throw new ConflictException(`A record with this ${friendlyName} already exists. Please use a different value.`);
      }
      throw error;
    }
  }

  async update(modelName: string, id: string, data: any) {
    try {
      return await this.getModel(modelName).update({
        where: { id },
        data,
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        const target = error.meta?.target?.[0] || 'identifier';
        const friendlyName = target.replace(/([A-Z])/g, ' $1').toLowerCase();
        throw new ConflictException(`A record with this ${friendlyName} already exists.`);
      }
      throw error;
    }
  }

  async remove(modelName: string, id: string) {
    return this.getModel(modelName).update({
      where: { id },
      data: { isActive: false },
    });
  }

  // --- Specialized Lookups ---
  async getRegions() {
    return this.prisma.region.findMany({
      where: { isActive: true },
      include: { districts: true },
      orderBy: { name: 'asc' },
    });
  }

  async getDistricts(regionId?: string) {
    return this.prisma.district.findMany({
      where: { 
        isActive: true,
        ...(regionId ? { regionId } : {})
      },
      include: { region: true },
      orderBy: { name: 'asc' },
    });
  }

  async getDepartments() {
    return this.prisma.department.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } });
  }

  async getEmployeeRoles() {
    return this.prisma.employeeRole.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } });
  }

  async getEquipmentLevels() {
    return this.prisma.equipmentLevel.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } });
  }

  async getIncidentCategories() {
    return this.prisma.incidentCategory.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } });
  }

  async getEmergencyTypes() {
    await this.prisma.emergencyType.upsert({
      where: { code: 'OTHER' },
      create: {
        code: 'OTHER',
        name: 'Others',
        isActive: true,
      },
      update: {
        isActive: true,
        deletedAt: null,
      },
    });

    return this.prisma.emergencyType.findMany({
      where: { isActive: true, deletedAt: null },
      include: {
        incidentCategory: { select: { id: true, name: true, code: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async getStations(districtId?: string) {
    return this.prisma.station.findMany({
      where: { 
        isActive: true,
        ...(districtId ? { districtId } : {})
      },
      include: { district: true, region: true },
      orderBy: { name: 'asc' },
    });
  }

  async getAreas(districtId?: string) {
    return this.prisma.area.findMany({
      where: { 
        isActive: true,
        ...(districtId ? { districtId } : {})
      },
      include: { district: true },
      orderBy: { name: 'asc' },
    });
  }

  async getCoverageOverview() {
    const ACTIVE_CASES: EmergencyRequestStatus[] = [
      'ASSIGNED', 'DISPATCHED', 'EN_ROUTE', 'ARRIVED_SCENE',
      'PATIENT_STABILIZED', 'TRANSPORTING', 'ARRIVED_HOSPITAL', 'REVIEWING',
    ];

    const [regions, activeCaseAmbIds] = await Promise.all([
      this.prisma.region.findMany({
        where: { isActive: true },
        include: {
          districts: {
            where: { isActive: true },
            include: {
              stations: {
                where: { isActive: true },
                include: {
                  ambulances: { select: { id: true, ambulanceNumber: true, status: true } },
                  employees: {
                    select: {
                      id: true,
                      shiftStatus: true,
                      status: true,
                      medicalClearanceStatus: true,
                      employeeRole: { select: { name: true } },
                    },
                  },
                },
                orderBy: { name: 'asc' },
              },
            },
            orderBy: { name: 'asc' },
          },
        },
        orderBy: { name: 'asc' },
      }),
      this.prisma.emergencyRequest.findMany({
        where: { status: { in: ACTIVE_CASES }, ambulanceId: { not: null } },
        select: { ambulanceId: true },
      }),
    ]);

    const busyAmbIds = new Set(activeCaseAmbIds.map((c) => c.ambulanceId).filter(Boolean));

    const mapStation = (station: any) => {
      const ambulances = station.ambulances ?? [];
      const employees = station.employees ?? [];
      const drivers = employees.filter((e: any) => e.employeeRole?.name?.toLowerCase().includes('driver'));
      const nurses = employees.filter((e: any) => e.employeeRole?.name?.toLowerCase().includes('nurse'));
      const availAmbs = ambulances.filter(
        (a: any) => a.status === 'AVAILABLE' && !busyAmbIds.has(a.id),
      ).length;
      const availDrivers = drivers.filter(
        (e: any) => e.status === 'ACTIVE' && e.shiftStatus === 'AVAILABLE',
      ).length;
      const availNurses = nurses.filter(
        (e: any) =>
          e.status === 'ACTIVE' &&
          e.shiftStatus === 'AVAILABLE' &&
          e.medicalClearanceStatus !== 'PENDING',
      ).length;
      const hasGap = availAmbs === 0 && ambulances.length > 0;
      const noCoverage = ambulances.length === 0 && drivers.length === 0 && nurses.length === 0;

      return {
        id: station.id,
        name: station.name,
        address: station.address ?? null,
        phone: station.phone ?? null,
        ambulances: { total: ambulances.length, available: availAmbs },
        drivers: { total: drivers.length, available: availDrivers },
        nurses: { total: nurses.length, available: availNurses },
        coverageStatus: noCoverage ? 'none' : hasGap ? 'gap' : availAmbs > 0 ? 'covered' : 'limited',
      };
    };

    const mapDistrict = (district: any) => {
      const stations = (district.stations ?? []).map(mapStation);
      return {
        id: district.id,
        name: district.name,
        stations,
        totals: {
          stations: stations.length,
          ambulances: stations.reduce((s: number, st: any) => s + st.ambulances.total, 0),
          availableAmbulances: stations.reduce((s: number, st: any) => s + st.ambulances.available, 0),
          drivers: stations.reduce((s: number, st: any) => s + st.drivers.total, 0),
          nurses: stations.reduce((s: number, st: any) => s + st.nurses.total, 0),
          gaps: stations.filter((st: any) => st.coverageStatus === 'gap' || st.coverageStatus === 'none').length,
        },
      };
    };

    const tree = regions.map((region) => {
      const districts = (region.districts ?? []).map(mapDistrict);
      return {
        id: region.id,
        name: region.name,
        districts,
        totals: {
          districts: districts.length,
          stations: districts.reduce((s: number, d: any) => s + d.totals.stations, 0),
          ambulances: districts.reduce((s: number, d: any) => s + d.totals.ambulances, 0),
          availableAmbulances: districts.reduce((s: number, d: any) => s + d.totals.availableAmbulances, 0),
          gaps: districts.reduce((s: number, d: any) => s + d.totals.gaps, 0),
        },
      };
    });

    const summary = {
      regions: tree.length,
      districts: tree.reduce((s, r) => s + r.totals.districts, 0),
      stations: tree.reduce((s, r) => s + r.totals.stations, 0),
      ambulances: tree.reduce((s, r) => s + r.totals.ambulances, 0),
      availableAmbulances: tree.reduce((s, r) => s + r.totals.availableAmbulances, 0),
      coverageGaps: tree.reduce((s, r) => s + r.totals.gaps, 0),
    };

    return { summary, regions: tree, updatedAt: new Date().toISOString() };
  }
}
